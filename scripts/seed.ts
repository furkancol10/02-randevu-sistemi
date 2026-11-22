import { eq } from 'drizzle-orm';
import { createDb } from '../src/lib/server/db/client';
import {
	businesses,
	resourceServices,
	resources,
	services,
	workingHours
} from '../src/lib/server/db/schema';
import { getVertical, type VerticalConfig } from '../src/lib/verticals';

/** Sektör şablonundaki demo veriyi kurar; aynı slug varsa önce silip yeniden yazar (idempotent). */
export async function seedVertical(
	db: ReturnType<typeof createDb>['db'],
	vertical: string | VerticalConfig
) {
	const v = typeof vertical === 'string' ? getVertical(vertical) : vertical;
	// Tek transaction: yarıda hata/kesinti olursa eski demo veri olduğu gibi kalır
	return db.transaction(async (tx) => {
		const s = v.seed;
		await tx.delete(businesses).where(eq(businesses.slug, s.business.slug));

		const [business] = await tx
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
			const [row] = await tx
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
			const [row] = await tx
				.insert(resources)
				.values({ businessId: business.id, name: r.name, kind: v.resourceKind, sort: i })
				.returning();
			await tx
				.insert(resourceServices)
				.values(r.services.map((key) => ({ resourceId: row.id, serviceId: serviceIds.get(key)! })));
			for (const [weekday, ranges] of Object.entries(s.hours)) {
				if (r.offDays?.includes(Number(weekday))) continue;
				await tx.insert(workingHours).values(
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
	});
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
