import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { appointments, resources, services, timeOff } from '../db/schema';

export type Range = { from: Date; to: Date; resourceId?: number };

const select = {
	id: appointments.id,
	period: appointments.period,
	durationMin: appointments.durationMin,
	status: appointments.status,
	customerName: appointments.customerName,
	customerPhone: appointments.customerPhone,
	manageToken: appointments.manageToken,
	resourceId: appointments.resourceId,
	resourceName: resources.name,
	serviceName: services.name,
	priceKurus: services.priceKurus
};

/** Her admin sorgusu `businessId` (oturumdan) ile filtrelenir; istemciden gelen id'ye güvenilmez. */
export async function listAppointments(db: Db, businessId: number, r: Range) {
	return db
		.select(select)
		.from(appointments)
		.innerJoin(resources, eq(resources.id, appointments.resourceId))
		.innerJoin(services, eq(services.id, appointments.serviceId))
		.where(
			and(
				eq(appointments.businessId, businessId),
				r.resourceId === undefined ? undefined : eq(appointments.resourceId, r.resourceId),
				sql`lower(${appointments.period}) >= ${r.from.toISOString()}::timestamptz`,
				sql`lower(${appointments.period}) < ${r.to.toISOString()}::timestamptz`
			)
		)
		.orderBy(sql`lower(${appointments.period})`, asc(appointments.id));
}

export async function getAppointment(db: Db, businessId: number, id: number) {
	const [row] = await db
		.select(select)
		.from(appointments)
		.innerJoin(resources, eq(resources.id, appointments.resourceId))
		.innerJoin(services, eq(services.id, appointments.serviceId))
		.where(and(eq(appointments.id, id), eq(appointments.businessId, businessId)));
	return row ?? null;
}

export type StatusResult = { ok: true } | { ok: false; reason: 'not_found' | 'invalid_state' };

/** İzinli geçişler: pending → confirmed; pending|confirmed → cancelled. İptal geri alınmaz (slot başkasına gitmiş olabilir). */
const FROM: Record<'confirmed' | 'cancelled', string[]> = {
	confirmed: ['pending'],
	cancelled: ['pending', 'confirmed']
};

export async function setAppointmentStatus(
	db: Db,
	businessId: number,
	id: number,
	to: 'confirmed' | 'cancelled'
): Promise<StatusResult> {
	const updated = await db
		.update(appointments)
		.set({ status: to })
		.where(
			and(
				eq(appointments.id, id),
				eq(appointments.businessId, businessId),
				inArray(appointments.status, FROM[to])
			)
		)
		.returning({ id: appointments.id });
	if (updated.length > 0) return { ok: true };
	const exists = await getAppointment(db, businessId, id);
	return { ok: false, reason: exists ? 'invalid_state' : 'not_found' };
}

/** Aralıkla kesişen izinler (takvimde gösterim için); işletmeye kapsamlı. */
export async function listTimeOffInRange(db: Db, businessId: number, r: Range) {
	return db
		.select({
			id: timeOff.id,
			resourceId: timeOff.resourceId,
			resourceName: resources.name,
			period: timeOff.period,
			reason: timeOff.reason
		})
		.from(timeOff)
		.innerJoin(resources, eq(resources.id, timeOff.resourceId))
		.where(
			and(
				eq(resources.businessId, businessId),
				r.resourceId === undefined ? undefined : eq(timeOff.resourceId, r.resourceId),
				sql`${timeOff.period} && tstzrange(${r.from.toISOString()}::timestamptz, ${r.to.toISOString()}::timestamptz, '[)')`
			)
		)
		.orderBy(sql`lower(${timeOff.period})`);
}
