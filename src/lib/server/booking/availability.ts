import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { dayBoundsUtc, weekdayOf } from '../../time';
import type { Db } from '../db/client';
import {
	appointments,
	businesses,
	resourceServices,
	resources,
	services,
	timeOff,
	workingHours
} from '../db/schema';
import { computeSlots, unionSlots, type Interval, type WorkRange } from './slots';

type Business = typeof businesses.$inferSelect;
type Service = typeof services.$inferSelect;

const rangeSql = (b: Interval) =>
	sql`tstzrange(${b.start.toISOString()}::timestamptz, ${b.end.toISOString()}::timestamptz, '[)')`;

/** Hizmeti yapan aktif kaynaklar (sıralı). */
export async function resourcesForService(db: Db, businessId: number, serviceId: number) {
	return db
		.select({ id: resources.id, name: resources.name, sort: resources.sort })
		.from(resources)
		.innerJoin(resourceServices, eq(resourceServices.resourceId, resources.id))
		.where(
			and(
				eq(resources.businessId, businessId),
				eq(resources.active, true),
				eq(resourceServices.serviceId, serviceId)
			)
		)
		.orderBy(asc(resources.sort), asc(resources.id));
}

type DayData = {
	ranges: Map<number, WorkRange[]>;
	timeOff: Map<number, Interval[]>;
	appts: Map<number, Interval[]>;
	load: Map<number, number>;
};

/** Verilen kaynakların o gün için çalışma saati, izin ve (isteğe bağlı) dolu randevuları. */
export async function loadDay(
	db: Db,
	resourceIds: number[],
	date: string,
	timezone: string,
	withAppointments: boolean,
	/** Gün sonuna yakın slotun buffer'ı ertesi güne taşar; o taşmayı da yakalamak için pencere genişler */
	bufferMin = 0
): Promise<DayData> {
	const out: DayData = { ranges: new Map(), timeOff: new Map(), appts: new Map(), load: new Map() };
	for (const id of resourceIds) {
		out.ranges.set(id, []);
		out.timeOff.set(id, []);
		out.appts.set(id, []);
		out.load.set(id, 0);
	}
	if (resourceIds.length === 0) return out;
	const day = dayBoundsUtc(date, timezone);
	const window = { start: day.start, end: new Date(day.end.getTime() + bufferMin * 60_000) };

	const wh = await db
		.select()
		.from(workingHours)
		.where(
			and(inArray(workingHours.resourceId, resourceIds), eq(workingHours.weekday, weekdayOf(date)))
		)
		.orderBy(asc(workingHours.startTime));
	for (const r of wh) {
		// time sütunu "09:30:00" döner → "09:30"
		out.ranges
			.get(r.resourceId)!
			.push({ start: r.startTime.slice(0, 5), end: r.endTime.slice(0, 5) });
	}

	const off = await db
		.select()
		.from(timeOff)
		.where(
			and(inArray(timeOff.resourceId, resourceIds), sql`${timeOff.period} && ${rangeSql(window)}`)
		);
	for (const o of off) out.timeOff.get(o.resourceId)!.push(o.period);

	const appts = await db
		.select({ resourceId: appointments.resourceId, period: appointments.period })
		.from(appointments)
		.where(
			and(
				inArray(appointments.resourceId, resourceIds),
				ne(appointments.status, 'cancelled'),
				sql`${appointments.period} && ${rangeSql(window)}`
			)
		);
	for (const a of appts) {
		if (a.period.start.getTime() >= day.end.getTime()) {
			// ertesi güne ait; yalnız çakışma için gerekli, günün yükü sayılmaz
			if (withAppointments) out.appts.get(a.resourceId)!.push(a.period);
			continue;
		}
		out.load.set(a.resourceId, (out.load.get(a.resourceId) ?? 0) + 1);
		if (withAppointments) out.appts.get(a.resourceId)!.push(a.period);
	}
	return out;
}

export type DayOptions = { business: Business; service: Service; date: string; now: Date };

/**
 * Bir kaynak için o günün slotları.
 * `withAppointments=false` → yalnız çalışma saati/izin/geçmiş doğrulaması (çakışmayı DB kısıtı yakalar).
 */
export async function slotsByResource(
	db: Db,
	opts: DayOptions,
	resourceIds: number[],
	withAppointments: boolean
): Promise<{ data: DayData; slots: Map<number, Date[]> }> {
	const { business, service, date, now } = opts;
	const data = await loadDay(
		db,
		resourceIds,
		date,
		business.timezone,
		withAppointments,
		service.bufferMin
	);
	const slots = new Map<number, Date[]>();
	for (const id of resourceIds) {
		slots.set(
			id,
			computeSlots({
				date,
				timezone: business.timezone,
				workRanges: data.ranges.get(id)!,
				durationMin: service.durationMin,
				bufferMin: service.bufferMin,
				stepMin: business.slotStepMin,
				busy: [...data.timeOff.get(id)!, ...data.appts.get(id)!],
				now
			})
		);
	}
	return { data, slots };
}

/** Müşteriye gösterilen slotlar: tek kaynak ya da "fark etmez" birleşimi. */
export async function availableSlots(
	db: Db,
	opts: DayOptions,
	resourceId: number | 'any'
): Promise<Date[]> {
	const candidates = await resourcesForService(db, opts.business.id, opts.service.id);
	const ids =
		resourceId === 'any'
			? candidates.map((c) => c.id)
			: candidates.filter((c) => c.id === resourceId).map((c) => c.id);
	const { slots } = await slotsByResource(db, opts, ids, true);
	return unionSlots([...slots.values()]);
}
