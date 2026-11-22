import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { appointments, businesses, services } from '../../src/lib/server/db/schema';
import { close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const CHECK_VIOLATION = '23514';
async function code(p: Promise<unknown>): Promise<string | undefined> {
	try {
		await p;
	} catch (e) {
		const x = e as { code?: string; cause?: { code?: string } };
		return x.code ?? x.cause?.code;
	}
	return undefined;
}

describe('CHECK kısıtları (#7)', () => {
	it.each([0, -15])('slot_step_min=%i reddedilir', async (step) => {
		expect(
			await code(
				db
					.insert(businesses)
					.values({ slug: 'x', name: 'X', vertical: 'kuafor', slotStepMin: step })
			)
		).toBe(CHECK_VIOLATION);
	});

	it('buffer_min < 0 reddedilir', async () => {
		const f = await createFixture(1);
		expect(
			await code(
				db.insert(services).values({
					businessId: f.business.id,
					name: 'Y',
					durationMin: 30,
					priceKurus: 1,
					bufferMin: -30
				})
			)
		).toBe(CHECK_VIOLATION);
	});

	it('boş period ve duration<=0 olan randevu reddedilir (exclusion kısıtını bypass edemez)', async () => {
		const f = await createFixture(1);
		const t = new Date('2026-11-23T07:00:00Z');
		const row = {
			businessId: f.business.id,
			resourceId: f.resources[0].id,
			serviceId: f.service.id,
			customerName: 'A',
			customerPhone: '+905321234567'
		};
		expect(
			await code(
				db.insert(appointments).values({ ...row, period: { start: t, end: t }, durationMin: 30 })
			)
		).toBe(CHECK_VIOLATION);
		expect(
			await code(
				db.insert(appointments).values({
					...row,
					period: { start: t, end: new Date(t.getTime() + 60000) },
					durationMin: 0
				})
			)
		).toBe(CHECK_VIOLATION);
	});
});
