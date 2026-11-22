import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
	addTimeOff,
	addWorkingHours,
	createResource,
	createService,
	deleteService,
	deleteTimeOff,
	deleteWorkingHours,
	getResource,
	listResources,
	listServices,
	updateResource,
	updateService
} from '../../src/lib/server/admin/catalog';
import { book } from '../../src/lib/server/booking/book';
import { availableSlots } from '../../src/lib/server/booking/availability';
import { resourceServices, services, timeOff, workingHours } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

describe('hizmet CRUD (işletmeye kapsamlı)', () => {
	it('oluşturur, günceller, listeler', async () => {
		const { business } = await createFixture(1);
		const c = await createService(db, business.id, {
			name: 'Keratin',
			durationMin: 90,
			priceKurus: 90000,
			bufferMin: 10
		});
		expect(c.ok).toBe(true);
		const id = c.ok ? c.id : 0;
		await updateService(db, business.id, id, {
			name: 'Keratin Bakım',
			durationMin: 100,
			priceKurus: 95000,
			bufferMin: 10,
			active: false
		});
		const list = await listServices(db, business.id);
		const row = list.find((s) => s.id === id)!;
		expect(row).toMatchObject({ name: 'Keratin Bakım', durationMin: 100, active: false });
	});

	it('başka işletmenin hizmetini güncelleyemez/silemez', async () => {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		const r = await updateService(db, a.business.id, b.service.id, {
			name: 'Ele geçirildi',
			durationMin: 5,
			priceKurus: 1,
			bufferMin: 0,
			active: true
		});
		expect(r).toEqual({ ok: false, reason: 'not_found' });
		expect(await deleteService(db, a.business.id, b.service.id)).toEqual({
			ok: false,
			reason: 'not_found'
		});
		const [row] = await db.select().from(services).where(eq(services.id, b.service.id));
		expect(row.name).toBe('Kesim');
	});

	it('randevusu olan hizmet silinmez (cascade randevuları götürmesin), boş olan silinir', async () => {
		const { business, service, resources } = await createFixture(1);
		await book(
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
		expect(await deleteService(db, business.id, service.id)).toEqual({
			ok: false,
			reason: 'has_appointments'
		});
		const c = await createService(db, business.id, {
			name: 'Boş',
			durationMin: 20,
			priceKurus: 100,
			bufferMin: 0
		});
		expect(await deleteService(db, business.id, c.ok ? c.id : 0)).toEqual({ ok: true });
	});
});

describe('personel CRUD + hizmet atama', () => {
	it('personel oluşturur; yalnız kendi işletmesinin hizmetleri atanır', async () => {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		const r = await createResource(db, a.business.id, {
			name: 'Yeni Personel',
			kind: 'personel',
			serviceIds: [a.service.id, b.service.id] // b'ninki yok sayılır
		});
		const id = r.ok ? r.id : 0;
		const rows = await db
			.select()
			.from(resourceServices)
			.where(eq(resourceServices.resourceId, id));
		expect(rows.map((x) => x.serviceId)).toEqual([a.service.id]);
	});

	it('güncelleme hizmet atamasını değiştirir ve pasif yapınca müşteriye sunulmaz', async () => {
		const { business, service, resources } = await createFixture(1);
		const day = { business, service, date: '2026-11-23', now: NOW };
		expect((await availableSlots(db, day, 'any')).length).toBeGreaterThan(0);
		await updateResource(db, business.id, resources[0].id, {
			name: 'Personel 1',
			active: false,
			serviceIds: [service.id]
		});
		expect(await availableSlots(db, day, 'any')).toEqual([]);
		await updateResource(db, business.id, resources[0].id, {
			name: 'Personel 1',
			active: true,
			serviceIds: []
		});
		expect(await availableSlots(db, day, 'any')).toEqual([]); // hizmet atanmamış
		const list = await listResources(db, business.id);
		expect(list[0].serviceIds).toEqual([]);
	});

	it('başka işletmenin personelini göremez/güncelleyemez', async () => {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		expect(await getResource(db, a.business.id, b.resources[0].id)).toBeNull();
		expect(
			await updateResource(db, a.business.id, b.resources[0].id, {
				name: 'X',
				active: false,
				serviceIds: []
			})
		).toEqual({ ok: false, reason: 'not_found' });
	});
});

describe('çalışma saatleri (günde çok aralık)', () => {
	it('aynı güne ikinci aralık eklenir (öğle arası) ve slot hesabına yansır', async () => {
		const { business, service, resources } = await createFixture(1, {
			hours: { start: '09:00', end: '12:00' }
		});
		const rid = resources[0].id;
		// 2026-11-23 Pazartesi = weekday 1
		const r = await addWorkingHours(db, business.id, rid, {
			weekday: 1,
			start: '13:00',
			end: '15:00'
		});
		expect(r.ok).toBe(true);
		const slots = await availableSlots(
			db,
			{ business, service, date: '2026-11-23', now: NOW },
			rid
		);
		const hhmm = slots.map((s) =>
			new Intl.DateTimeFormat('en-GB', {
				timeZone: 'Europe/Istanbul',
				hour: '2-digit',
				minute: '2-digit'
			}).format(s)
		);
		expect(hhmm).toContain('13:00');
		expect(hhmm).toContain('14:30');
		expect(hhmm).not.toContain('12:30'); // arada kapalı
	});

	it('çakışan aralık reddedilir; geçersiz sıra reddedilir', async () => {
		const { business, resources } = await createFixture(1);
		const rid = resources[0].id;
		expect(
			await addWorkingHours(db, business.id, rid, { weekday: 1, start: '17:00', end: '19:00' })
		).toEqual({ ok: false, reason: 'overlap' }); // 09:00-18:00 ile çakışır
		expect(
			await addWorkingHours(db, business.id, rid, { weekday: 1, start: '19:00', end: '18:00' })
		).toEqual({ ok: false, reason: 'invalid' });
		expect(
			await addWorkingHours(db, business.id, rid, { weekday: 9, start: '08:00', end: '09:00' })
		).toEqual({ ok: false, reason: 'invalid' });
	});

	it('başka işletmenin personeline saat eklenemez/silinemez', async () => {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		const before = await db
			.select()
			.from(workingHours)
			.where(eq(workingHours.resourceId, b.resources[0].id));
		expect(
			await addWorkingHours(db, a.business.id, b.resources[0].id, {
				weekday: 1,
				start: '05:00',
				end: '06:00'
			})
		).toEqual({ ok: false, reason: 'not_found' });
		expect(await deleteWorkingHours(db, a.business.id, b.resources[0].id, before[0].id)).toEqual({
			ok: false,
			reason: 'not_found'
		});
		const after = await db
			.select()
			.from(workingHours)
			.where(eq(workingHours.resourceId, b.resources[0].id));
		expect(after).toHaveLength(before.length);
	});

	it('saat silinir', async () => {
		const { business, resources } = await createFixture(1);
		const rid = resources[0].id;
		const [row] = await db.select().from(workingHours).where(eq(workingHours.resourceId, rid));
		expect(await deleteWorkingHours(db, business.id, rid, row.id)).toEqual({ ok: true });
	});
});

describe('izin (time off)', () => {
	it('izin eklenince o saatler müşteriye sunulmaz; silinince döner', async () => {
		const { business, service, resources } = await createFixture(1);
		const rid = resources[0].id;
		const day = { business, service, date: '2026-11-23', now: NOW };
		const before = (await availableSlots(db, day, rid)).length;
		const r = await addTimeOff(db, business.id, rid, {
			start: new Date('2026-11-23T06:00:00Z'), // 09:00 TR
			end: new Date('2026-11-23T15:00:00Z'), // 18:00 TR
			reason: 'Yıllık izin'
		});
		expect(r.ok).toBe(true);
		expect(await availableSlots(db, day, rid)).toEqual([]);
		await deleteTimeOff(db, business.id, rid, r.ok ? r.id : 0);
		expect((await availableSlots(db, day, rid)).length).toBe(before);
	});

	it('bitiş başlangıçtan önceyse reddedilir; başka işletme kaynağına eklenemez', async () => {
		const a = await createFixture(1, { slug: 'a' });
		const b = await createFixture(1, { slug: 'b' });
		const s = new Date('2026-11-23T06:00:00Z');
		expect(
			await addTimeOff(db, a.business.id, a.resources[0].id, { start: s, end: s, reason: '' })
		).toEqual({ ok: false, reason: 'invalid' });
		expect(
			await addTimeOff(db, a.business.id, b.resources[0].id, {
				start: s,
				end: new Date(s.getTime() + 3600_000),
				reason: ''
			})
		).toEqual({ ok: false, reason: 'not_found' });
		expect(await db.select().from(timeOff)).toHaveLength(0);
	});
});
