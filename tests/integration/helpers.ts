import { sql } from 'drizzle-orm';
import { createDb } from '../../src/lib/server/db/client';
import {
	businesses,
	resourceServices,
	resources,
	services,
	workingHours
} from '../../src/lib/server/db/schema';
import { TEST_DATABASE_URL } from '../setup/global-db';

export const { db, close } = createDb(TEST_DATABASE_URL);

export async function resetData() {
	await db.execute(
		sql`TRUNCATE businesses, admins, sessions, rate_limits, services, resources, resource_services, working_hours, time_off, appointments RESTART IDENTITY CASCADE`
	);
}

/** "Şimdi" sabit: 2026-11-20 (Cuma) 09:00 İstanbul. Randevu günü: 2026-11-23 (Pazartesi). */
export const NOW = new Date('2026-11-20T06:00:00Z');
/** 2026-11-23 10:00 İstanbul (UTC+3) */
export const SLOT_10 = new Date('2026-11-23T07:00:00Z');
export const SLOT_1015 = new Date('2026-11-23T07:15:00Z');
export const SLOT_1030 = new Date('2026-11-23T07:30:00Z');

/** 1 işletme, 1 hizmet (30 dk), `resourceCount` personel; hepsi her gün 09:00-18:00 çalışır. */
export type FixtureOpts = {
	slug?: string;
	bufferMin?: number;
	/** Çalışma saati (varsayılan 09:00-18:00) */
	hours?: { start: string; end: string };
};

export async function createFixture(resourceCount = 1, opts: FixtureOpts = {}) {
	const hours = opts.hours ?? { start: '09:00', end: '18:00' };
	const [business] = await db
		.insert(businesses)
		.values({
			slug: opts.slug ?? 'test-salon',
			name: 'Test Salon',
			vertical: 'kuafor',
			slotStepMin: 15
		})
		.returning();
	const [service] = await db
		.insert(services)
		.values({
			businessId: business.id,
			name: 'Kesim',
			durationMin: 30,
			priceKurus: 25000,
			bufferMin: opts.bufferMin ?? 0
		})
		.returning();
	const rs = [];
	for (let i = 0; i < resourceCount; i++) {
		const [r] = await db
			.insert(resources)
			.values({ businessId: business.id, name: `Personel ${i + 1}`, sort: i })
			.returning();
		await db.insert(resourceServices).values({ resourceId: r.id, serviceId: service.id });
		for (let weekday = 0; weekday < 7; weekday++) {
			await db
				.insert(workingHours)
				.values({ resourceId: r.id, weekday, startTime: hours.start, endTime: hours.end });
		}
		rs.push(r);
	}
	return { business, service, resources: rs };
}
