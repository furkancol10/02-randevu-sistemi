import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { availableSlots } from '../../src/lib/server/booking/availability';
import { book } from '../../src/lib/server/booking/book';
import { businesses, services } from '../../src/lib/server/db/schema';
import { NOW, SLOT_10, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const hhmm = (slots: Date[]) =>
	slots.map((d) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(11, 16));
const customer = { customerName: 'Deneme', customerPhone: '+905321234567' };

async function opts(businessId: number, serviceId: number) {
	const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
	const [service] = await db.select().from(services).where(eq(services.id, serviceId));
	return { business, service, date: '2026-11-23', now: NOW };
}

describe('availableSlots (gerçek DB)', () => {
	it('dolu randevuyla kesişen slotları gizler', async () => {
		const { business, service, resources } = await createFixture(1);
		await book(
			db,
			{
				businessId: business.id,
				serviceId: service.id,
				resourceId: resources[0].id,
				start: SLOT_10,
				...customer
			},
			NOW
		);

		const slots = hhmm(
			await availableSlots(db, await opts(business.id, service.id), resources[0].id)
		);
		expect(slots).toContain('09:30'); // 09:30-10:00 bitişik
		expect(slots).not.toContain('09:45');
		expect(slots).not.toContain('10:00');
		expect(slots).not.toContain('10:15');
		expect(slots).toContain('10:30');
	});

	it('"fark etmez": slot, kaynaklardan en az biri boşken görünür', async () => {
		const { business, service, resources } = await createFixture(2);
		const base = { businessId: business.id, serviceId: service.id, start: SLOT_10, ...customer };
		const o = await opts(business.id, service.id);

		await book(db, { ...base, resourceId: resources[0].id }, NOW);
		expect(hhmm(await availableSlots(db, o, 'any'))).toContain('10:00');
		await book(db, { ...base, resourceId: resources[1].id }, NOW);
		expect(hhmm(await availableSlots(db, o, 'any'))).not.toContain('10:00');
	});
});
