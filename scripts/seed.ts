import { eq } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client';
import {
	businesses,
	resourceServices,
	resources,
	services,
	workingHours
} from '../src/lib/server/db/schema';
import { getVertical } from '../src/lib/verticals';

/** Sektör şablonundaki demo veriyi kurar; aynı slug varsa önce silip yeniden yazar (idempotent). */
export async function seedVertical(db: ReturnType<typeof createDb>['db'], verticalId: string) {
	const v = getVertical(verticalId);
	const s = v.seed;
	await db.delete(businesses).where(eq(businesses.slug, s.business.slug));

	const [business] = await db
		.insert(businesses)
		.values({
			slug: s.business.slug,
			name: s.business.name,
			vertical: v.id,
			slotStepMin: v.slotStepMin,
			phone: s.business.phone,
			settings: { address: s.business.address }
		})
		.returning();

	const serviceIds = new Map<string, number>();
	for (const [i, sv] of s.services.entries()) {
		const [row] = await db
			.insert(services)
			.values({
				businessId: business.id,
				name: sv.name,
				durationMin: sv.durationMin,
				priceKurus: sv.priceKurus,
				bufferMin: sv.bufferMin ?? 0,
				sort: i
			})
			.returning();
		serviceIds.set(sv.key, row.id);
	}

	for (const [i, r] of s.resources.entries()) {
		const [row] = await db
			.insert(resources)
			.values({ businessId: business.id, name: r.name, kind: v.resourceKind, sort: i })
			.returning();
		await db
			.insert(resourceServices)
			.values(r.services.map((key) => ({ resourceId: row.id, serviceId: serviceIds.get(key)! })));
		for (const [weekday, ranges] of Object.entries(s.hours)) {
			if (r.offDays?.includes(Number(weekday))) continue;
			await db.insert(workingHours).values(
				ranges.map((range) => ({
					resourceId: row.id,
					weekday: Number(weekday),
					startTime: range.start,
					endTime: range.end
				}))
			);
		}
	}
	return business;
}

// CLI: node --env-file=.env --import tsx scripts/seed.ts
if (import.meta.url === `file://${process.argv[1]}`) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
	const { db, close } = createDb(url);
	const b = await seedVertical(db, 'kuafor');
	await close();
	console.log(`seed tamam: /${b.slug} (${b.name})`);
}
