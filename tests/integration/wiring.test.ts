import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appointments } from '../../src/lib/server/db/schema';
import { createAdmin } from '../../src/lib/server/auth/password';
import { SESSION_COOKIE, SESSION_TTL_MS, createSession } from '../../src/lib/server/auth/session';
import { book } from '../../src/lib/server/booking/book';
import { NOW, SLOT_10, close, createFixture, db, resetData } from './helpers';

// Gerçek Postgres (test DB); yalnız `db` modülü test bağlantısına yönlendirilir
vi.mock('#lib/server/db/index.ts', async () => ({ db: (await import('./helpers')).db }));

const { handle } = await import('../../src/hooks.server');
const { bookingLimiter, loginLimiter } = await import('../../src/lib/server/limiters');
const login = await import('../../src/routes/admin/giris/+page.server');
const bookingPage = await import('../../src/routes/[slug]/+page.server');
const detail = await import('../../src/routes/admin/(panel)/randevu/[id]/+page.server');
const manage = await import('../../src/routes/r/[token]/+page.server');

beforeEach(async () => {
	await resetData();
	bookingLimiter.clear();
	loginLimiter.clear();
});
afterEach(() => vi.useRealTimers());
afterAll(close);

type Cookie = { value: string; opts?: Record<string, unknown> };
function fakeCookies(initial: Record<string, string> = {}) {
	const jar = new Map<string, Cookie>(Object.entries(initial).map(([k, v]) => [k, { value: v }]));
	return {
		jar,
		get: (k: string) => jar.get(k)?.value,
		set: (k: string, value: string, opts?: Record<string, unknown>) =>
			void jar.set(k, { value, opts }),
		delete: (k: string) => void jar.delete(k)
	};
}
const form = (fields: Record<string, string>, url = 'http://x.test/') => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.set(k, v);
	return new Request(url, { method: 'POST', body: fd });
};
const call = (fn: unknown, event: Record<string, unknown>) =>
	(fn as (e: never) => Promise<unknown>)(event as never);

async function runHandle(path: string, cookies = fakeCookies()) {
	const locals: Record<string, unknown> = {};
	const resolve = vi.fn(() => Promise.resolve(new Response('ok')));
	const res = await (handle as (a: never) => Promise<Response>)({
		event: {
			url: new URL(`http://x.test${path}`),
			cookies,
			locals,
			request: new Request(`http://x.test${path}`),
			setHeaders: () => {}
		},
		resolve
	} as never);
	return { res, locals, resolve, cookies };
}

describe('hooks: /admin koruması', () => {
	it('çerezsiz /admin ve alt sayfalar → /admin/giris yönlendirmesi; sayfa çalışmaz', async () => {
		for (const p of ['/admin', '/admin/takvim', '/admin/hizmetler', '/admin/randevu/1']) {
			const { res, resolve } = await runHandle(p);
			expect(res.status).toBe(303);
			expect(res.headers.get('location')).toBe('/admin/giris');
			expect(resolve).not.toHaveBeenCalled();
		}
	});

	it('geçersiz çerez reddedilir ve silinir', async () => {
		const cookies = fakeCookies({ [SESSION_COOKIE]: 'a'.repeat(43) });
		const { res } = await runHandle('/admin/takvim', cookies);
		expect(res.status).toBe(303);
		expect(cookies.get(SESSION_COOKIE)).toBeUndefined();
	});

	it('süresi dolmuş oturum reddedilir', async () => {
		const { business } = await createFixture(1);
		const admin = await createAdmin(db, {
			businessId: business.id,
			email: 'a@b.test',
			password: 'x'.repeat(8)
		});
		const old = new Date(Date.now() - SESSION_TTL_MS - 60_000);
		const { token } = await createSession(db, admin.id, old);
		const { res, resolve } = await runHandle(
			'/admin/takvim',
			fakeCookies({ [SESSION_COOKIE]: token })
		);
		expect(res.status).toBe(303);
		expect(resolve).not.toHaveBeenCalled();
	});

	it('geçerli oturum → locals.admin dolar ve sayfa çözülür; herkese açık sayfalar çerezsiz açılır', async () => {
		const { business } = await createFixture(1);
		const admin = await createAdmin(db, {
			businessId: business.id,
			email: 'a@b.test',
			password: 'x'.repeat(8)
		});
		const { token } = await createSession(db, admin.id);
		const ok = await runHandle('/admin/takvim', fakeCookies({ [SESSION_COOKIE]: token }));
		expect(ok.res.status).toBe(200);
		expect(ok.locals.admin).toMatchObject({ adminId: admin.id, businessId: business.id });

		const pub = await runHandle('/demo-kuafor');
		expect(pub.res.status).toBe(200);
		const loginPage = await runHandle('/admin/giris');
		expect(loginPage.res.status).toBe(200);
	});
});

describe('giriş eylemi', () => {
	async function seedAdmin() {
		const { business } = await createFixture(1);
		return createAdmin(db, {
			businessId: business.id,
			email: 'sahip@ornek.test',
			password: 'dogru-sifre-1'
		});
	}
	const attempt = (password: string, ip = '1.1.1.1', cookies = fakeCookies()) =>
		call(login.actions.default, {
			request: form({ email: 'sahip@ornek.test', password }),
			cookies,
			getClientAddress: () => ip,
			url: new URL('http://x.test/admin/giris')
		});

	it('doğru şifre: httpOnly + SameSite=Lax + Secure çerez, /admin/takvim yönlendirmesi', async () => {
		await seedAdmin();
		const cookies = fakeCookies();
		await expect(attempt('dogru-sifre-1', '1.1.1.1', cookies)).rejects.toMatchObject({
			status: 303,
			location: '/admin/takvim'
		});
		const c = cookies.jar.get(SESSION_COOKIE)!;
		expect(c.value.length).toBeGreaterThan(30);
		expect(c.opts).toMatchObject({ httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
	});

	it('yanlış şifre → 400, çerez yok', async () => {
		await seedAdmin();
		const cookies = fakeCookies();
		await expect(attempt('yanlis', '1.1.1.1', cookies)).resolves.toMatchObject({ status: 400 });
		expect(cookies.jar.size).toBe(0);
	});

	it('hız sınırı: 5 başarısız denemeden sonra doğru şifre bile 429; başka IP etkilenmez', async () => {
		await seedAdmin();
		for (let i = 0; i < 5; i++) await attempt('yanlis');
		await expect(attempt('dogru-sifre-1')).resolves.toMatchObject({ status: 429 });
		await expect(attempt('dogru-sifre-1', '2.2.2.2')).rejects.toMatchObject({ status: 303 });
	});

	it('başarılı giriş sayacı sıfırlar', async () => {
		await seedAdmin();
		for (let i = 0; i < 4; i++) await attempt('yanlis');
		await expect(attempt('dogru-sifre-1')).rejects.toMatchObject({ status: 303 });
		for (let i = 0; i < 4; i++) await attempt('yanlis');
		await expect(attempt('yanlis')).resolves.toMatchObject({ status: 400 });
	});
});

describe('herkese açık randevu eylemi: IP hız sınırı', () => {
	const submit = (ip: string) =>
		call(bookingPage.actions.book, {
			request: form({}),
			params: { slug: 'yok' },
			getClientAddress: () => ip
		});

	it('aynı IP 10 denemeden sonra 429; başka IP serbest', async () => {
		for (let i = 0; i < 10; i++)
			await expect(submit('9.9.9.9')).resolves.toMatchObject({ status: 400 });
		await expect(submit('9.9.9.9')).resolves.toMatchObject({ status: 429 });
		await expect(submit('8.8.8.8')).resolves.toMatchObject({ status: 400 });
	});
});

describe('admin randevu eylemleri: oturumdaki işletmeyle sınırlı (kabul #4, eylem katmanı)', () => {
	async function twoSalons() {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		const r = await book(
			db,
			{
				businessId: b.business.id,
				serviceId: b.service.id,
				resourceId: b.resources[0].id,
				start: SLOT_10,
				customerName: 'B Müşterisi',
				customerPhone: '+905321234567'
			},
			NOW
		);
		if (!r.ok) throw new Error('kurulum');
		await db
			.update(appointments)
			.set({ status: 'pending' })
			.where(eq(appointments.id, r.appointment.id));
		return { a, b, id: r.appointment.id };
	}
	const asAdmin = (businessId: number) => ({ adminId: 1, businessId, email: 'x@y.test' });
	const status = async (id: number) =>
		(await db.select().from(appointments).where(eq(appointments.id, id)))[0].status;

	it('A admini B randevusunun sayfasını açamaz (404)', async () => {
		const { a, id } = await twoSalons();
		await expect(
			call(detail.load, {
				params: { id: String(id) },
				locals: { admin: asAdmin(a.business.id) },
				url: new URL('http://x.test/admin/randevu/' + id)
			})
		).rejects.toMatchObject({ status: 404 });
	});

	it('A admini B randevusunu onaylayamaz/iptal edemez (404, durum değişmez)', async () => {
		const { a, id } = await twoSalons();
		for (const action of [detail.actions.onayla, detail.actions.iptal]) {
			await expect(
				call(action, { params: { id: String(id) }, locals: { admin: asAdmin(a.business.id) } })
			).resolves.toMatchObject({ status: 404 });
		}
		expect(await status(id)).toBe('pending');
	});

	it('B admini kendi randevusunu onaylar', async () => {
		const { b, id } = await twoSalons();
		await call(detail.actions.onayla, {
			params: { id: String(id) },
			locals: { admin: asAdmin(b.business.id) }
		});
		expect(await status(id)).toBe('confirmed');
	});

	it('oturumsuz (hook atlansa bile) eylem çalışmaz', async () => {
		const { id } = await twoSalons();
		await expect(
			call(detail.actions.iptal, { params: { id: String(id) }, locals: {} })
		).rejects.toMatchObject({ status: 303, location: '/admin/giris' });
		expect(await status(id)).toBe('pending');
	});
});

describe('/r/[token] iptal eylemi', () => {
	async function booked() {
		const { business, service, resources } = await createFixture(1);
		const r = await book(
			db,
			{
				businessId: business.id,
				serviceId: service.id,
				resourceId: resources[0].id,
				start: SLOT_10,
				customerName: 'M',
				customerPhone: '+905321234567'
			},
			NOW
		);
		if (!r.ok) throw new Error('kurulum');
		return r.appointment;
	}

	it('pencere içinde (1.5 sa kala) 409 + randevu aktif kalır; pencere dışında iptal olur', async () => {
		const appt = await booked();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-11-23T05:30:00Z'));
		await expect(
			call(manage.actions.iptal, { params: { token: appt.manageToken } })
		).resolves.toMatchObject({ status: 409 });
		expect(await status(appt.id)).toBe('confirmed');

		vi.setSystemTime(new Date('2026-11-23T04:00:00Z'));
		await call(manage.actions.iptal, { params: { token: appt.manageToken } });
		expect(await status(appt.id)).toBe('cancelled');
	});
	const status = async (id: number) =>
		(await db.select().from(appointments).where(eq(appointments.id, id)))[0].status;

	it('bozuk token → 404', async () => {
		await expect(
			call(manage.load, { params: { token: 'bozuk' }, setHeaders: () => {} })
		).rejects.toMatchObject({
			status: 404
		});
	});
});
