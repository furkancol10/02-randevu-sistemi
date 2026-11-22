import { eq } from 'drizzle-orm';
import { DEMO_ADMIN } from '../src/lib/demo';
import { hash } from '@node-rs/argon2';
import { book } from '../src/lib/server/booking/book';
import { createDb } from '../src/lib/server/db/client';
import { addDays, localDate, weekdayOf, zonedToUtc } from '../src/lib/time';
import {
	admins,
	appointments,
	businesses,
	resourceServices,
	resources,
	services,
	workingHours
} from '../src/lib/server/db/schema';
import { getVertical, type VerticalConfig } from '../src/lib/verticals';
import { businessPhoneDigits } from '../src/lib/whatsapp';

/** Yazma anı doğrulaması: wa.me için yalnız rakam; geçersiz şablon telefonu seed'i durdurur. */
function businessPhone(phone: string): string {
	const d = businessPhoneDigits(phone);
	if (!d) throw new Error(`Geçersiz işletme telefonu (TR cep numarası bekleniyor): ${phone}`);
	return d;
}

/** Sektör şablonundaki demo veriyi kurar; aynı slug varsa önce silip yeniden yazar (idempotent). */
export async function seedVertical(
	db: ReturnType<typeof createDb>['db'],
	vertical: string | VerticalConfig
) {
	const v = typeof vertical === 'string' ? getVertical(vertical) : vertical;
	const demoHash = await hash(DEMO_ADMIN.password); // yavaş işlem transaction dışında
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
				phone: businessPhone(s.business.phone),
				settings: { address: s.business.address }
			})
			.returning();

		await tx
			.insert(admins)
			.values({ businessId: business.id, email: DEMO_ADMIN.email, passwordHash: demoHash });

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

type Db = ReturnType<typeof createDb>['db'];

/**
 * Admin panelinin boş görünmemesi için birkaç kurgusal randevu (yarından sonraki Salı/Perşembe/Cuma),
 * ikisi onay bekliyor. Demo sıfırlama (gece cron'u) seedVertical'dan sonra bunu da çağırır.
 */
export async function seedDemoAppointments(db: Db, slug: string, now: Date = new Date()) {
	const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug));
	const svc = new Map(
		(await db.select().from(services).where(eq(services.businessId, business.id))).map((s) => [
			s.name,
			s.id
		])
	);
	const res = new Map(
		(await db.select().from(resources).where(eq(resources.businessId, business.id))).map((r) => [
			r.name,
			r.id
		])
	);

	// Üç personelin de çalıştığı günler: Salı, Perşembe, Cuma
	const days: string[] = [];
	for (let i = 1; days.length < 2; i++) {
		const d = addDays(localDate(now, business.timezone), i);
		if ([2, 4, 5].includes(weekdayOf(d))) days.push(d);
	}
	const plan = [
		{
			day: 0,
			time: '10:00',
			service: 'Kadın Saç Kesimi',
			resource: 'Ayşe',
			name: 'Deniz Kaya',
			pending: true
		},
		{
			day: 0,
			time: '11:30',
			service: 'Erkek Saç Kesimi',
			resource: 'Mehmet',
			name: 'Can Yıldız',
			pending: false
		},
		{
			day: 0,
			time: '15:00',
			service: 'Saç Boyama',
			resource: 'Elif',
			name: 'Selin Arslan',
			pending: false
		},
		{
			day: 1,
			time: '09:30',
			service: 'Manikür',
			resource: 'Ayşe',
			name: 'Pelin Demir',
			pending: true
		},
		{
			day: 1,
			time: '14:00',
			service: 'Sakal Tıraşı',
			resource: 'Mehmet',
			name: 'Mert Aydın',
			pending: false
		}
	];
	let n = 0;
	for (const p of plan) {
		const r = await book(
			db,
			{
				businessId: business.id,
				serviceId: svc.get(p.service)!,
				resourceId: res.get(p.resource)!,
				start: zonedToUtc(days[p.day], p.time, business.timezone),
				customerName: p.name,
				customerPhone: `+90555000${String(1000 + n++)}`
			},
			now
		);
		if (r.ok && p.pending)
			await db
				.update(appointments)
				.set({ status: 'pending' })
				.where(eq(appointments.id, r.appointment.id));
	}
}

// CLI: node --env-file=.env --import tsx scripts/seed.ts
if (import.meta.url === `file://${process.argv[1]}`) {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
	const { db, close } = createDb(url);
	const b = await seedVertical(db, 'kuafor');
	await seedDemoAppointments(db, b.slug);
	await close();
	console.log(`seed tamam: /${b.slug} (${b.name}) · yönetim: /admin (${DEMO_ADMIN.email})`);
}
