import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getAppointment,
	listAppointments,
	setAppointmentStatus
} from '../../src/lib/server/admin/appointments';
import { book } from '../../src/lib/server/booking/book';
import { appointments } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, SLOT_1030, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterEach(() => vi.useRealTimers());
afterAll(close);

const DAY = { from: new Date('2026-11-23T00:00:00Z'), to: new Date('2026-11-24T00:00:00Z') };

async function twoBusinesses() {
	const a = await createFixture(1, { slug: 'salon-a' });
	const b = await createFixture(1, { slug: 'salon-b' });
	const mk = async (f: typeof a, start: Date, name: string) => {
		const r = await book(
			db,
			{
				businessId: f.business.id,
				serviceId: f.service.id,
				resourceId: f.resources[0].id,
				start,
				customerName: name,
				customerPhone: '+905321234567'
			},
			NOW
		);
		if (!r.ok) throw new Error('kurulum');
		return r.appointment.id;
	};
	return {
		a,
		b,
		apptA: await mk(a, SLOT_10, 'Müşteri A'),
		apptB: await mk(b, SLOT_1030, 'Müşteri B')
	};
}
const statusOf = async (id: number) =>
	(await db.select().from(appointments).where(eq(appointments.id, id)))[0].status;

// Kabul testi #4: A işletmesinin admini B'nin randevusunu göremez/onaylayamaz/iptal edemez
describe('yetki: işletmeler arası izolasyon (kabul #4)', () => {
	it('A admini yalnız kendi randevularını listeler', async () => {
		const { a, apptA, apptB } = await twoBusinesses();
		const list = await listAppointments(db, a.business.id, DAY);
		expect(list.map((x) => x.id)).toEqual([apptA]);
		expect(list.map((x) => x.id)).not.toContain(apptB);
	});

	it('A admini B randevusunun detayını göremez (null)', async () => {
		const { a, apptA, apptB } = await twoBusinesses();
		expect(await getAppointment(db, a.business.id, apptB)).toBeNull();
		expect((await getAppointment(db, a.business.id, apptA))?.customerName).toBe('Müşteri A');
	});

	it('A admini B randevusunu iptal edemez; kayıt değişmez', async () => {
		const { a, apptB } = await twoBusinesses();
		expect(await setAppointmentStatus(db, a.business.id, apptB, 'cancelled')).toEqual({
			ok: false,
			reason: 'not_found'
		});
		expect(await statusOf(apptB)).toBe('confirmed');
	});

	it('A admini B randevusunu onaylayamaz; kayıt değişmez', async () => {
		const { a, b, apptB } = await twoBusinesses();
		await db.update(appointments).set({ status: 'pending' }).where(eq(appointments.id, apptB));
		expect(await setAppointmentStatus(db, a.business.id, apptB, 'confirmed')).toEqual({
			ok: false,
			reason: 'not_found'
		});
		expect(await statusOf(apptB)).toBe('pending');
		// kendi işletmesi onaylayabilir (kontrol: filtre yanlış yere sızmıyor)
		expect(await setAppointmentStatus(db, b.business.id, apptB, 'confirmed')).toEqual({ ok: true });
		expect(await statusOf(apptB)).toBe('confirmed');
	});
});

describe('admin onay/iptal durum geçişleri', () => {
	it('pending → confirmed; confirmed → cancelled; iptal edilen yeniden onaylanamaz', async () => {
		const { a, apptA } = await twoBusinesses();
		await db.update(appointments).set({ status: 'pending' }).where(eq(appointments.id, apptA));
		expect(await setAppointmentStatus(db, a.business.id, apptA, 'confirmed')).toEqual({ ok: true });
		expect(await setAppointmentStatus(db, a.business.id, apptA, 'cancelled')).toEqual({ ok: true });
		expect(await setAppointmentStatus(db, a.business.id, apptA, 'confirmed')).toEqual({
			ok: false,
			reason: 'invalid_state'
		});
		expect(await statusOf(apptA)).toBe('cancelled');
	});

	it('admin iptali iptal penceresine takılmaz (randevuya 10 dk kala bile)', async () => {
		const { a, apptA } = await twoBusinesses();
		// Saat sabit: randevu 2026-11-23T07:00Z; şimdi = 06:50Z. Gerçek saate bağlı kalırsa, ileride
		// eklenecek bir "2 saat kuralı" bu testi yalancı yeşil bırakır.
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(SLOT_10.getTime() - 10 * 60_000));
		expect(await setAppointmentStatus(db, a.business.id, apptA, 'cancelled')).toEqual({ ok: true });
	});

	it('resourceId filtresi yalnız o personelin randevularını verir', async () => {
		const { a, apptA } = await twoBusinesses();
		const other = await listAppointments(db, a.business.id, { ...DAY, resourceId: 999999 });
		expect(other).toEqual([]);
		const mine = await listAppointments(db, a.business.id, {
			...DAY,
			resourceId: a.resources[0].id
		});
		expect(mine.map((x) => x.id)).toEqual([apptA]);
	});
});
