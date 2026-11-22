import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { book } from '../../src/lib/server/booking/book';
import { appointments } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, SLOT_1015, SLOT_1030, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const customer = { customerName: 'Deneme Müşteri', customerPhone: '+905321234567' };

describe('çakışma koruması (kabul testi #1)', () => {
	it('aynı kaynak/slot için 10 paralel istek: tam 1 başarı, 9 conflict', async () => {
		const { business, service, resources } = await createFixture(1);
		const input = {
			businessId: business.id,
			serviceId: service.id,
			resourceId: resources[0].id,
			start: SLOT_10,
			...customer
		};

		const results = await Promise.all(Array.from({ length: 10 }, () => book(db, input, NOW)));

		expect(results.filter((r) => r.ok)).toHaveLength(1);
		const failed = results.filter((r) => !r.ok);
		expect(failed).toHaveLength(9);
		expect(failed.every((r) => !r.ok && r.reason === 'conflict')).toBe(true);
		expect(await db.select().from(appointments)).toHaveLength(1);
	});

	it('kısmen kesişen slot conflict, bitişik slot başarılı', async () => {
		const { business, service, resources } = await createFixture(1);
		const base = { businessId: business.id, serviceId: service.id, resourceId: resources[0].id, ...customer };

		expect((await book(db, { ...base, start: SLOT_10 }, NOW)).ok).toBe(true);
		const overlap = await book(db, { ...base, start: SLOT_1015 }, NOW);
		expect(overlap).toMatchObject({ ok: false, reason: 'conflict' });
		expect((await book(db, { ...base, start: SLOT_1030 }, NOW)).ok).toBe(true);
	});

	it('iptal edilen slot tekrar alınabilir', async () => {
		const { business, service, resources } = await createFixture(1);
		const input = {
			businessId: business.id,
			serviceId: service.id,
			resourceId: resources[0].id,
			start: SLOT_10,
			...customer
		};

		const first = await book(db, input, NOW);
		expect(first.ok).toBe(true);
		expect(await book(db, input, NOW)).toMatchObject({ ok: false, reason: 'conflict' });

		if (!first.ok) throw new Error('beklenmedik');
		await db
			.update(appointments)
			.set({ status: 'cancelled' })
			.where(eq(appointments.id, first.appointment.id));

		expect((await book(db, input, NOW)).ok).toBe(true);
	});

	it('farklı kaynaklar aynı slotu alabilir', async () => {
		const { business, service, resources } = await createFixture(2);
		const base = { businessId: business.id, serviceId: service.id, start: SLOT_10, ...customer };
		const [a, b] = await Promise.all(
			resources.map((r) => book(db, { ...base, resourceId: r.id }, NOW))
		);
		expect(a.ok && b.ok).toBe(true);
	});
});
