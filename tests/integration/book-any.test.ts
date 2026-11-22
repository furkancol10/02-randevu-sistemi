import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { book } from '../../src/lib/server/booking/book';
import { appointments, timeOff } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const customer = { customerName: 'Deneme Müşteri', customerPhone: '+905321234567' };
const at = (hhmm: string) => new Date(`2026-11-23T${hhmm}:00+03:00`);

describe('"fark etmez" (resourceId: any)', () => {
	it('en az yüklü kaynağı önce dener', async () => {
		const { business, service, resources } = await createFixture(2);
		const base = { businessId: business.id, serviceId: service.id, ...customer };
		// 1. kaynak o gün zaten 1 randevulu
		await book(db, { ...base, resourceId: resources[0].id, start: at('09:00') }, NOW);

		const r = await book(db, { ...base, resourceId: 'any', start: at('11:00') }, NOW);
		expect(r.ok && r.appointment.resourceId).toBe(resources[1].id);
	});

	it('en az yüklü kaynak o slotta doluysa sıradakine düşer', async () => {
		const { business, service, resources } = await createFixture(2);
		const base = { businessId: business.id, serviceId: service.id, ...customer };
		// Kaynak 1: 10:00 dolu (yük 1). Kaynak 2: 2 randevu (yük 2) ama 10:00 boş.
		await book(db, { ...base, resourceId: resources[0].id, start: SLOT_10 }, NOW);
		await book(db, { ...base, resourceId: resources[1].id, start: at('14:00') }, NOW);
		await book(db, { ...base, resourceId: resources[1].id, start: at('15:00') }, NOW);

		const r = await book(db, { ...base, resourceId: 'any', start: SLOT_10 }, NOW);
		expect(r.ok && r.appointment.resourceId).toBe(resources[1].id);
	});

	it('3 kaynak, 10 paralel istek: tam 3 başarı, hepsi farklı kaynakta, 7 conflict', async () => {
		const { business, service } = await createFixture(3);
		const input = {
			businessId: business.id,
			serviceId: service.id,
			resourceId: 'any' as const,
			start: SLOT_10,
			...customer
		};

		const results = await Promise.all(Array.from({ length: 10 }, () => book(db, input, NOW)));

		const ok = results.filter((r) => r.ok);
		expect(ok).toHaveLength(3);
		expect(new Set(ok.map((r) => r.ok && r.appointment.resourceId)).size).toBe(3);
		expect(results.filter((r) => !r.ok && r.reason === 'conflict')).toHaveLength(7);
		expect(await db.select().from(appointments)).toHaveLength(3);
	});
});

describe('doğrulama', () => {
	it('çalışma saati dışı, geçmiş, adım dışı ve izinli saat reddedilir (unavailable)', async () => {
		const { business, service, resources } = await createFixture(1);
		const base = {
			businessId: business.id,
			serviceId: service.id,
			resourceId: resources[0].id,
			...customer
		};
		await db
			.insert(timeOff)
			.values({ resourceId: resources[0].id, period: { start: at('12:00'), end: at('13:00') } });

		const expectUnavailable = async (start: Date, now = NOW) =>
			expect(await book(db, { ...base, start }, now)).toMatchObject({
				ok: false,
				reason: 'unavailable'
			});

		await expectUnavailable(at('08:30')); // açılıştan önce
		await expectUnavailable(at('17:45')); // 18:15'e taşar
		await expectUnavailable(at('10:07')); // 15 dk adımına uymuyor
		await expectUnavailable(at('12:15')); // izin
		await expectUnavailable(at('10:00'), at('10:00')); // geçmiş/şimdi
		await expectUnavailable(new Date('2027-03-01T07:00:00Z')); // ufuk (30 gün) dışı
		expect(await db.select().from(appointments)).toHaveLength(0);
	});

	it('başka işletmenin hizmeti / hizmeti yapmayan kaynak invalid', async () => {
		const a = await createFixture(1);
		expect(
			await book(
				db,
				{
					businessId: a.business.id + 99,
					serviceId: a.service.id,
					resourceId: 'any',
					start: SLOT_10,
					...customer
				},
				NOW
			)
		).toMatchObject({ ok: false, reason: 'invalid' });
		expect(
			await book(
				db,
				{
					businessId: a.business.id,
					serviceId: a.service.id,
					resourceId: 9999,
					start: SLOT_10,
					...customer
				},
				NOW
			)
		).toMatchObject({ ok: false, reason: 'invalid' });
	});
});
