import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { book } from '../../src/lib/server/booking/book';
import { cancelByToken, getManageView } from '../../src/lib/server/booking/manage';
import { appointments } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

// SLOT_10 = 2026-11-23 10:00 İstanbul = 07:00Z; kuafor iptal penceresi 2 saat
async function booked() {
	const { business, service, resources } = await createFixture(1);
	const r = await book(
		db,
		{
			businessId: business.id,
			serviceId: service.id,
			resourceId: resources[0].id,
			start: SLOT_10,
			customerName: 'Deneme Müşteri',
			customerPhone: '+905321234567'
		},
		NOW
	);
	if (!r.ok) throw new Error('kurulum');
	return {
		business,
		service,
		resource: resources[0],
		token: r.appointment.manageToken,
		id: r.appointment.id
	};
}
const statusOf = async (id: number) =>
	(await db.select().from(appointments).where(eq(appointments.id, id)))[0].status;

describe('müşteri iptali (/r/[token])', () => {
	it('pencere dışında (3 saat önce) iptal eder; slot yeniden alınabilir', async () => {
		const { business, service, resource, token, id } = await booked();
		const r = await cancelByToken(db, token, new Date('2026-11-23T04:00:00Z'));
		expect(r).toEqual({ ok: true });
		expect(await statusOf(id)).toBe('cancelled');

		const again = await book(
			db,
			{
				businessId: business.id,
				serviceId: service.id,
				resourceId: resource.id,
				start: SLOT_10,
				customerName: 'Başka Müşteri',
				customerPhone: '+905329876543'
			},
			NOW
		);
		expect(again.ok).toBe(true);
	});

	it('tam 2 saat kala hâlâ iptal edilir', async () => {
		const { token } = await booked();
		expect(await cancelByToken(db, token, new Date('2026-11-23T05:00:00Z'))).toEqual({ ok: true });
	});

	it('2 saatin içinde (1 sa 59 dk kala) reddedilir ve randevu değişmez', async () => {
		const { token, id } = await booked();
		const r = await cancelByToken(db, token, new Date('2026-11-23T05:01:00Z'));
		expect(r).toEqual({ ok: false, reason: 'too_late' });
		expect(await statusOf(id)).toBe('confirmed');
	});

	it('geçmiş randevu iptal edilemez', async () => {
		const { token, id } = await booked();
		const r = await cancelByToken(db, token, new Date('2026-11-24T00:00:00Z'));
		expect(r).toEqual({ ok: false, reason: 'too_late' });
		expect(await statusOf(id)).toBe('confirmed');
	});

	it('zaten iptal edilmiş → already_cancelled; bozuk/olmayan token → not_found', async () => {
		const { token } = await booked();
		const early = new Date('2026-11-23T04:00:00Z');
		await cancelByToken(db, token, early);
		expect(await cancelByToken(db, token, early)).toEqual({
			ok: false,
			reason: 'already_cancelled'
		});
		expect(await cancelByToken(db, 'bozuk', early)).toEqual({ ok: false, reason: 'not_found' });
		expect(await cancelByToken(db, '00000000-0000-4000-8000-000000000000', early)).toEqual({
			ok: false,
			reason: 'not_found'
		});
	});

	it('getManageView: pencere bilgisini ve iptal edilebilirliği verir', async () => {
		const { token } = await booked();
		const early = await getManageView(db, token, new Date('2026-11-23T04:00:00Z'));
		expect(early?.canCancel).toBe(true);
		expect(early?.cancelWindowHours).toBe(2);
		const late = await getManageView(db, token, new Date('2026-11-23T06:00:00Z'));
		expect(late?.canCancel).toBe(false);
		expect(await getManageView(db, 'bozuk', NOW)).toBeNull();
	});
});
