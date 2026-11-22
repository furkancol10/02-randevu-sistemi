import { weekStart } from '#lib/admin-validation.ts';
import { listAppointments, listTimeOffInRange } from '#lib/server/admin/appointments.ts';
import { listResources } from '#lib/server/admin/catalog.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import {
	addDays,
	dayBoundsUtc,
	formatDayLong,
	formatTime,
	isValidDate,
	localDate
} from '#lib/time.ts';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { businessId } = requireAdmin(locals);
	const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
	const tz = business.timezone;

	const today = localDate(new Date(), tz);
	const gunParam = url.searchParams.get('gun');
	const date = gunParam && isValidDate(gunParam) ? gunParam : today;
	const view = url.searchParams.get('gorunum') === 'hafta' ? 'hafta' : 'gun';

	const staff = await listResources(db, businessId);
	const personelParam = Number(url.searchParams.get('personel'));
	const resourceId = staff.find((r) => r.id === personelParam)?.id;

	const first = view === 'hafta' ? weekStart(date) : date;
	const count = view === 'hafta' ? 7 : 1;
	const from = dayBoundsUtc(first, tz).start;
	const to = dayBoundsUtc(addDays(first, count), tz).start;
	const range = { from, to, resourceId };
	const [appts, offs] = await Promise.all([
		listAppointments(db, businessId, range),
		listTimeOffInRange(db, businessId, range)
	]);

	const days = Array.from({ length: count }, (_, i) => {
		const d = addDays(first, i);
		const bounds = dayBoundsUtc(d, tz);
		return {
			date: d,
			label: formatDayLong(d, tz),
			isToday: d === today,
			appointments: appts
				.filter((a) => a.period.start >= bounds.start && a.period.start < bounds.end)
				.map((a) => ({
					id: a.id,
					time: formatTime(a.period.start, tz),
					endTime: formatTime(new Date(a.period.start.getTime() + a.durationMin * 60_000), tz),
					customerName: a.customerName,
					serviceName: a.serviceName,
					resourceName: a.resourceName,
					status: a.status
				})),
			timeOff: offs
				.filter((o) => o.period.start < bounds.end && o.period.end > bounds.start)
				.map((o) => ({
					id: o.id,
					resourceName: o.resourceName,
					from: o.period.start > bounds.start ? formatTime(o.period.start, tz) : 'gün başı',
					to: o.period.end < bounds.end ? formatTime(o.period.end, tz) : 'gün sonu',
					reason: o.reason
				}))
		};
	});

	const step = view === 'hafta' ? 7 : 1;
	return {
		view,
		date,
		today,
		resourceId: resourceId ?? null,
		staff: staff.map((r) => ({ id: r.id, name: r.name })),
		days,
		prev: addDays(date, -step),
		next: addDays(date, step),
		rangeLabel:
			view === 'hafta'
				? `${formatDayLong(first, tz)} – ${formatDayLong(addDays(first, 6), tz)}`
				: formatDayLong(date, tz)
	};
};
