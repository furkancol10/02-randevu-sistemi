import { eq } from 'drizzle-orm';
import { book } from '../src/lib/server/booking/book';
import { createDb } from '../src/lib/server/db/client';
import { appointments, businesses, resources, services } from '../src/lib/server/db/schema';
import { addDays, localDate, weekdayOf, zonedToUtc } from '../src/lib/time';

async function withDb<T>(fn: (db: ReturnType<typeof createDb>['db']) => Promise<T>): Promise<T> {
	const { db, close } = createDb(process.env.DATABASE_URL!);
	try {
		return await fn(db);
	} finally {
		await close();
	}
}

async function lookup(db: ReturnType<typeof createDb>['db'], service: string, resource: string) {
	const [business] = await db.select().from(businesses).where(eq(businesses.slug, 'demo-kuafor'));
	const svc = (await db.select().from(services).where(eq(services.businessId, business.id))).find(
		(s) => s.name === service
	)!;
	const res = (await db.select().from(resources).where(eq(resources.businessId, business.id))).find(
		(r) => r.name === resource
	)!;
	return { business, svc, res };
}

/** İlk Salı/Perşembe/Cuma ≥ 10 gün sonra: tüm personel çalışıyor, iptal penceresinin çok dışında. */
function farWorkday(tz: string) {
	for (let i = 10; ; i++) {
		const d = addDays(localDate(new Date(), tz), i);
		if ([2, 4, 5].includes(weekdayOf(d))) return d;
	}
}

/** Gerçek `book()` ile uzak bir güne randevu açar (admin/müşteri e2e'leri için). */
export async function seedAppointment(o: {
	name: string;
	time: string;
	status: 'pending' | 'confirmed';
	service?: string;
	resource?: string;
}) {
	return withDb(async (db) => {
		const { business, svc, res } = await lookup(db, o.service ?? 'Fön', o.resource ?? 'Ayşe');
		const date = farWorkday(business.timezone);
		const r = await book(db, {
			businessId: business.id,
			serviceId: svc.id,
			resourceId: res.id,
			start: zonedToUtc(date, o.time, business.timezone),
			customerName: o.name,
			customerPhone: '+905321234567'
		});
		if (!r.ok) throw new Error(`randevu açılamadı: ${r.reason}`);
		await db
			.update(appointments)
			.set({ status: o.status })
			.where(eq(appointments.id, r.appointment.id));
		return { date, token: r.appointment.manageToken, id: r.appointment.id };
	});
}

/** Başlangıcına 60 dk kalan randevu (2 saatlik iptal penceresinin içinde). Çalışma saatinden bağımsız doğrudan INSERT. */
export async function seedImminentAppointment(name: string) {
	return withDb(async (db) => {
		const { business, svc, res } = await lookup(db, 'Fön', 'Elif');
		const start = new Date(Date.now() + 60 * 60_000);
		const [row] = await db
			.insert(appointments)
			.values({
				businessId: business.id,
				resourceId: res.id,
				serviceId: svc.id,
				period: { start, end: new Date(start.getTime() + 30 * 60_000) },
				durationMin: 30,
				customerName: name,
				customerPhone: '+905321234567',
				status: 'confirmed'
			})
			.returning({ token: appointments.manageToken });
		return { token: row.token };
	});
}
