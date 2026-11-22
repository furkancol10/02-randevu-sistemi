import { and, eq, ne } from 'drizzle-orm';
import { canCancel, cancelDeadline } from '../../cancel';
import { getVertical } from '../../verticals';
import type { Db } from '../db/client';
import { appointments, businesses, resources, services } from '../db/schema';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** /r/[token]: randevu + işletme + iptal edilebilirlik. Token geçersizse null. */
export async function getManageView(db: Db, token: string, now: Date = new Date()) {
	if (!UUID_RE.test(token)) return null;
	const [row] = await db
		.select({
			id: appointments.id,
			period: appointments.period,
			status: appointments.status,
			customerName: appointments.customerName,
			serviceName: services.name,
			priceKurus: services.priceKurus,
			resourceName: resources.name,
			businessName: businesses.name,
			businessPhone: businesses.phone,
			businessSettings: businesses.settings,
			slug: businesses.slug,
			timezone: businesses.timezone,
			vertical: businesses.vertical
		})
		.from(appointments)
		.innerJoin(services, eq(services.id, appointments.serviceId))
		.innerJoin(resources, eq(resources.id, appointments.resourceId))
		.innerJoin(businesses, eq(businesses.id, appointments.businessId))
		.where(eq(appointments.manageToken, token));
	if (!row) return null;
	const cancelWindowHours = getVertical(row.vertical).cancelWindowHours;
	const start = row.period.start;
	return {
		...row,
		start,
		cancelWindowHours,
		cancelDeadline: cancelDeadline(start, cancelWindowHours),
		canCancel: row.status !== 'cancelled' && canCancel(start, now, cancelWindowHours)
	};
}

export type CancelResult =
	{ ok: true } | { ok: false; reason: 'not_found' | 'too_late' | 'already_cancelled' };

/**
 * Müşteri iptali. Pencere kuralı: başlangıca `cancelWindowHours` saatten az kaldıysa (ya da geçtiyse) red.
 * Randevu zamanı değişmediği için kontrol ile yazma arasında yarış yoktur; UPDATE yalnız hâlâ
 * iptal edilmemiş satırı günceller (çift tıklama güvenli).
 */
export async function cancelByToken(
	db: Db,
	token: string,
	now: Date = new Date()
): Promise<CancelResult> {
	const view = await getManageView(db, token, now);
	if (!view) return { ok: false, reason: 'not_found' };
	if (view.status === 'cancelled') return { ok: false, reason: 'already_cancelled' };
	if (!view.canCancel) return { ok: false, reason: 'too_late' };

	const updated = await db
		.update(appointments)
		.set({ status: 'cancelled' })
		.where(and(eq(appointments.id, view.id), ne(appointments.status, 'cancelled')))
		.returning({ id: appointments.id });
	return updated.length > 0 ? { ok: true } : { ok: false, reason: 'already_cancelled' };
}
