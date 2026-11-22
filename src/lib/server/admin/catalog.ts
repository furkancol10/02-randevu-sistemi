import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import {
	appointments,
	resourceServices,
	resources,
	services,
	timeOff,
	workingHours
} from '../db/schema';

// Hizmet / personel / çalışma saati / izin yönetimi. Tüm işlevler `businessId` (oturumdan) alır;
// alt kayıtlar (saat, izin) için önce kaynağın bu işletmeye ait olduğu doğrulanır.

export type Fail<R extends string> = { ok: false; reason: R };
const notFound: Fail<'not_found'> = { ok: false, reason: 'not_found' };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------- Hizmetler ----------
export type ServiceInput = {
	name: string;
	durationMin: number;
	priceKurus: number;
	bufferMin: number;
};

export const listServices = (db: Db, businessId: number) =>
	db
		.select()
		.from(services)
		.where(eq(services.businessId, businessId))
		.orderBy(asc(services.sort), asc(services.id));

export async function createService(db: Db, businessId: number, input: ServiceInput) {
	const [{ n }] = await db
		.select({ n: count() })
		.from(services)
		.where(eq(services.businessId, businessId));
	const [row] = await db
		.insert(services)
		.values({ ...input, businessId, sort: n })
		.returning({ id: services.id });
	return { ok: true as const, id: row.id };
}

export async function updateService(
	db: Db,
	businessId: number,
	id: number,
	input: ServiceInput & { active: boolean }
) {
	const rows = await db
		.update(services)
		.set(input)
		.where(and(eq(services.id, id), eq(services.businessId, businessId)))
		.returning({ id: services.id });
	return rows.length ? { ok: true as const } : notFound;
}

/** Randevusu olan hizmet silinmez: appointments → services FK cascade'i geçmiş randevuları da götürürdü. */
export async function deleteService(db: Db, businessId: number, id: number) {
	const [svc] = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.id, id), eq(services.businessId, businessId)));
	if (!svc) return notFound;
	const [{ n }] = await db
		.select({ n: count() })
		.from(appointments)
		.where(and(eq(appointments.serviceId, id), eq(appointments.businessId, businessId)));
	if (n > 0) return { ok: false as const, reason: 'has_appointments' as const };
	await db.delete(services).where(and(eq(services.id, id), eq(services.businessId, businessId)));
	return { ok: true as const };
}

// ---------- Personel (kaynak) ----------
export type ResourceInput = { name: string; active: boolean; serviceIds: number[] };

export async function listResources(db: Db, businessId: number) {
	const rs = await db
		.select()
		.from(resources)
		.where(eq(resources.businessId, businessId))
		.orderBy(asc(resources.sort), asc(resources.id));
	const links = rs.length
		? await db
				.select()
				.from(resourceServices)
				.where(
					inArray(
						resourceServices.resourceId,
						rs.map((r) => r.id)
					)
				)
		: [];
	return rs.map((r) => ({
		...r,
		serviceIds: links.filter((l) => l.resourceId === r.id).map((l) => l.serviceId)
	}));
}

/** Yalnız bu işletmenin hizmet id'leri (başkasının id'si sessizce atılır). */
async function ownServiceIds(db: Db, businessId: number, ids: number[]) {
	if (ids.length === 0) return [];
	const rows = await db
		.select({ id: services.id })
		.from(services)
		.where(and(eq(services.businessId, businessId), inArray(services.id, ids)));
	return rows.map((r) => r.id);
}

export async function createResource(
	db: Db,
	businessId: number,
	input: { name: string; kind: string; serviceIds: number[] }
) {
	const ids = await ownServiceIds(db, businessId, input.serviceIds);
	return db.transaction(async (tx) => {
		const [{ n }] = await tx
			.select({ n: count() })
			.from(resources)
			.where(eq(resources.businessId, businessId));
		const [row] = await tx
			.insert(resources)
			.values({ businessId, name: input.name, kind: input.kind, sort: n })
			.returning({ id: resources.id });
		if (ids.length)
			await tx
				.insert(resourceServices)
				.values(ids.map((serviceId) => ({ resourceId: row.id, serviceId })));
		return { ok: true as const, id: row.id };
	});
}

export async function updateResource(db: Db, businessId: number, id: number, input: ResourceInput) {
	const ids = await ownServiceIds(db, businessId, input.serviceIds);
	return db.transaction(async (tx) => {
		const rows = await tx
			.update(resources)
			.set({ name: input.name, active: input.active })
			.where(and(eq(resources.id, id), eq(resources.businessId, businessId)))
			.returning({ id: resources.id });
		if (rows.length === 0) return notFound;
		await tx.delete(resourceServices).where(eq(resourceServices.resourceId, id));
		if (ids.length)
			await tx
				.insert(resourceServices)
				.values(ids.map((serviceId) => ({ resourceId: id, serviceId })));
		return { ok: true as const };
	});
}

async function ownsResource(db: Db, businessId: number, resourceId: number) {
	const [r] = await db
		.select({ id: resources.id })
		.from(resources)
		.where(and(eq(resources.id, resourceId), eq(resources.businessId, businessId)));
	return Boolean(r);
}

export async function getResource(db: Db, businessId: number, id: number) {
	const [r] = (await listResources(db, businessId)).filter((x) => x.id === id);
	if (!r) return null;
	const hours = await db
		.select()
		.from(workingHours)
		.where(eq(workingHours.resourceId, id))
		.orderBy(asc(workingHours.weekday), asc(workingHours.startTime));
	const off = await db
		.select()
		.from(timeOff)
		.where(eq(timeOff.resourceId, id))
		.orderBy(sql`lower(${timeOff.period})`);
	return {
		...r,
		hours: hours.map((h) => ({
			id: h.id,
			weekday: h.weekday,
			start: h.startTime.slice(0, 5),
			end: h.endTime.slice(0, 5)
		})),
		timeOff: off.map((o) => ({
			id: o.id,
			start: o.period.start,
			end: o.period.end,
			reason: o.reason
		}))
	};
}

// ---------- Çalışma saatleri ----------
export type HoursInput = { weekday: number; start: string; end: string };

export async function addWorkingHours(
	db: Db,
	businessId: number,
	resourceId: number,
	h: HoursInput
) {
	if (!(await ownsResource(db, businessId, resourceId))) return notFound;
	if (
		!Number.isInteger(h.weekday) ||
		h.weekday < 0 ||
		h.weekday > 6 ||
		!HHMM.test(h.start) ||
		!HHMM.test(h.end) ||
		h.start >= h.end
	)
		return { ok: false as const, reason: 'invalid' as const };
	const existing = await db
		.select()
		.from(workingHours)
		.where(and(eq(workingHours.resourceId, resourceId), eq(workingHours.weekday, h.weekday)));
	if (existing.some((e) => h.start < e.endTime.slice(0, 5) && e.startTime.slice(0, 5) < h.end))
		return { ok: false as const, reason: 'overlap' as const };
	const [row] = await db
		.insert(workingHours)
		.values({ resourceId, weekday: h.weekday, startTime: h.start, endTime: h.end })
		.returning({ id: workingHours.id });
	return { ok: true as const, id: row.id };
}

export async function deleteWorkingHours(
	db: Db,
	businessId: number,
	resourceId: number,
	id: number
) {
	if (!(await ownsResource(db, businessId, resourceId))) return notFound;
	const rows = await db
		.delete(workingHours)
		.where(and(eq(workingHours.id, id), eq(workingHours.resourceId, resourceId)))
		.returning({ id: workingHours.id });
	return rows.length ? { ok: true as const } : notFound;
}

// ---------- İzin ----------
export async function addTimeOff(
	db: Db,
	businessId: number,
	resourceId: number,
	t: { start: Date; end: Date; reason: string }
) {
	if (!(await ownsResource(db, businessId, resourceId))) return notFound;
	if (Number.isNaN(t.start.getTime()) || Number.isNaN(t.end.getTime()) || t.start >= t.end)
		return { ok: false as const, reason: 'invalid' as const };
	const [row] = await db
		.insert(timeOff)
		.values({ resourceId, period: { start: t.start, end: t.end }, reason: t.reason || null })
		.returning({ id: timeOff.id });
	return { ok: true as const, id: row.id };
}

export async function deleteTimeOff(db: Db, businessId: number, resourceId: number, id: number) {
	if (!(await ownsResource(db, businessId, resourceId))) return notFound;
	const rows = await db
		.delete(timeOff)
		.where(and(eq(timeOff.id, id), eq(timeOff.resourceId, resourceId)))
		.returning({ id: timeOff.id });
	return rows.length ? { ok: true as const } : notFound;
}
