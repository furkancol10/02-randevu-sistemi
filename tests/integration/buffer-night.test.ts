import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { availableSlots } from '../../src/lib/server/booking/availability';
import { book } from '../../src/lib/server/booking/book';
import { businesses, services, timeOff } from '../../src/lib/server/db/schema';
import { NOW, close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const customer = { customerName: 'Deneme', customerPhone: '+905321234567' };
const at = (hhmm: string, day = '23') => new Date(`2026-11-${day}T${hhmm}:00+03:00`);
const hhmm = (slots: Date[]) =>
	slots.map((d) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(11, 16));

async function opts(businessId: number, serviceId: number) {
	const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
	const [service] = await db.select().from(services).where(eq(services.id, serviceId));
	return { business, service, date: '2026-11-23', now: NOW };
}

describe('buffer > 0 (DB çakışmasına yansır)', () => {
	it('10:00-10:30 + 15 dk buffer: 10:30 dolu, 10:45 boş', async () => {
		const f = await createFixture(1, { bufferMin: 15 });
		const base = {
			businessId: f.business.id,
			serviceId: f.service.id,
			resourceId: f.resources[0].id,
			...customer
		};
		expect((await book(db, { ...base, start: at('10:00') }, NOW)).ok).toBe(true);

		expect(await book(db, { ...base, start: at('10:30') }, NOW)).toEqual({
			ok: false,
			reason: 'conflict'
		});
		expect((await book(db, { ...base, start: at('10:45') }, NOW)).ok).toBe(true);

		const slots = hhmm(await availableSlots(db, await opts(f.business.id, f.service.id), 'any'));
		expect(slots).not.toContain('10:00');
		expect(slots).not.toContain('10:30');
		expect(slots).not.toContain('11:00'); // 10:45-11:15 dolu (+buffer 11:30'a kadar)
		expect(slots).toContain('09:15'); // 09:15-09:45 +15 = 10:00 (kesişmez)
		expect(slots).not.toContain('09:30'); // 09:30 → dolu aralık 10:15'e uzanır
		expect(slots).toContain('11:30');
	});
});

describe('gece yarısını aşan buffer (#5)', () => {
	it("23:00 slotu (buffer 00:15'e taşar) ertesi gün 00:00 izniyle çakışıyorsa sunulmaz ve alınamaz", async () => {
		const f = await createFixture(1, { bufferMin: 15, hours: { start: '18:00', end: '24:00' } });
		await db.insert(timeOff).values({
			resourceId: f.resources[0].id,
			period: { start: at('00:00', '24'), end: at('09:00', '24') }
		});

		const slots = hhmm(await availableSlots(db, await opts(f.business.id, f.service.id), 'any'));
		expect(slots).toContain('22:30'); // 22:30-23:00 + buffer 23:15 sorun yok
		expect(slots).toContain('23:15'); // 23:15-23:45 + 15 = 00:00 (yarı açık, kesişmez)
		expect(slots).not.toContain('23:30'); // 23:30-00:00 + 15 → izne taşar

		const r = await book(
			db,
			{
				businessId: f.business.id,
				serviceId: f.service.id,
				resourceId: f.resources[0].id,
				start: at('23:30'),
				...customer
			},
			NOW
		);
		expect(r).toEqual({ ok: false, reason: 'unavailable' });
	});
});
