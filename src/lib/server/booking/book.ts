import { and, eq, sql } from 'drizzle-orm';
import { addDays, localDate } from '../../time';
import { getVertical } from '../../verticals';
import type { Db } from '../db/client';
import { appointments, businesses, services } from '../db/schema';
import { resourcesForService, slotsByResource } from './availability';

export type BookInput = {
	businessId: number;
	serviceId: number;
	/** Kaynak id'si ya da "fark etmez" */
	resourceId: number | 'any';
	start: Date;
	customerName: string;
	/** Normalize edilmiş telefon (+905...) */
	customerPhone: string;
};

export type BookedAppointment = {
	id: number;
	manageToken: string;
	resourceId: number;
	start: Date;
	end: Date;
	status: string;
};

export type BookResult =
	| { ok: true; appointment: BookedAppointment }
	/** conflict: slot başkası tarafından alındı (23P01) · unavailable: çalışma saati/izin/geçmiş · invalid: geçersiz girdi */
	| { ok: false; reason: 'conflict' | 'unavailable' | 'invalid' };

const PG_EXCLUSION_VIOLATION = '23P01';
const PG_DEADLOCK = '40P01';
const ADVISORY_NS = 7001; // randevu insert kilitleri için ad alanı
const MAX_DEADLOCK_RETRIES = 3;

function pgCode(err: unknown): string | undefined {
	// drizzle sürümüne göre hata ya doğrudan ya da `cause` içinde gelir
	const e = err as { code?: string; cause?: { code?: string } };
	return e?.code ?? e?.cause?.code;
}

/**
 * Randevu oluşturur. Çakışma kontrolü uygulamada değil, DB'deki exclusion constraint'te:
 * tek INSERT, 23P01 → conflict. "Fark etmez"de en az yüklü kaynak önce, çakışırsa sıradaki denenir.
 */
export async function book(db: Db, input: BookInput, now: Date = new Date()): Promise<BookResult> {
	const [business] = await db.select().from(businesses).where(eq(businesses.id, input.businessId));
	const [service] = await db
		.select()
		.from(services)
		.where(
			and(
				eq(services.id, input.serviceId),
				eq(services.businessId, input.businessId),
				eq(services.active, true)
			)
		);
	if (!business || !service || Number.isNaN(input.start.getTime()))
		return { ok: false, reason: 'invalid' };

	const vertical = getVertical(business.vertical);
	const date = localDate(input.start, business.timezone);
	if (date > addDays(localDate(now, business.timezone), vertical.maxAdvanceDays)) {
		return { ok: false, reason: 'unavailable' };
	}

	const offering = await resourcesForService(db, business.id, service.id);
	let candidates = offering.map((r) => r.id);
	if (input.resourceId !== 'any') {
		if (!candidates.includes(input.resourceId)) return { ok: false, reason: 'invalid' };
		candidates = [input.resourceId];
	}

	// Çalışma saati / izin / geçmiş doğrulaması (dolu randevular hariç: onları kısıt yakalar)
	const { data, slots } = await slotsByResource(
		db,
		{ business, service, date, now },
		candidates,
		false
	);
	const startMs = input.start.getTime();
	candidates = candidates.filter((id) => slots.get(id)!.some((s) => s.getTime() === startMs));
	if (candidates.length === 0) return { ok: false, reason: 'unavailable' };

	// En az yüklü önce; eşitlikte sıra (sort, id) korunur (Array.sort kararlı)
	candidates.sort((a, b) => (data.load.get(a) ?? 0) - (data.load.get(b) ?? 0));

	const end = new Date(startMs + service.durationMin * 60_000);
	const occupiedEnd = new Date(startMs + (service.durationMin + service.bufferMin) * 60_000);
	const status = vertical.requiresApproval ? 'pending' : 'confirmed';

	for (const resourceId of candidates) {
		// Aynı slota eşzamanlı INSERT'ler exclusion constraint kontrolünde birbirini bekleyip
		// deadlock (40P01) yaratabilir; Postgres bir kurbanı iptal eder. Kurban yeniden dener:
		// kazanan commit olduysa bu sefer 23P01 alır, olmadıysa kendisi kazanır.
		for (let attempt = 0; attempt <= MAX_DEADLOCK_RETRIES; attempt++) {
			try {
				const row = await db.transaction(async (tx) => {
					// Aynı kaynağa yazanları sıraya sokar → exclusion kontrolünde karşılıklı bekleme
					// (1 sn'lik deadlock beklemesi) olmaz. Asıl koruma yine DB kısıtıdır.
					await tx.execute(sql`select pg_advisory_xact_lock(${ADVISORY_NS}, ${resourceId})`);
					const [inserted] = await tx
						.insert(appointments)
						.values({
							businessId: business.id,
							resourceId,
							serviceId: service.id,
							period: { start: input.start, end: occupiedEnd },
							durationMin: service.durationMin,
							customerName: input.customerName,
							customerPhone: input.customerPhone,
							status
						})
						.returning({ id: appointments.id, manageToken: appointments.manageToken });
					return inserted;
				});
				return {
					ok: true,
					appointment: {
						id: row.id,
						manageToken: row.manageToken,
						resourceId,
						start: input.start,
						end,
						status
					}
				};
			} catch (err) {
				const code = pgCode(err);
				if (code === PG_EXCLUSION_VIOLATION) break; // slot dolu → sıradaki kaynak
				if (code !== PG_DEADLOCK) throw err;
				// deadlock → aynı kaynağı yeniden dene; hak biterse conflict say
			}
		}
	}
	return { ok: false, reason: 'conflict' };
}
