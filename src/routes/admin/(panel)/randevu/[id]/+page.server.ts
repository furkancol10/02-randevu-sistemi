import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getAppointment, setAppointmentStatus } from '#lib/server/admin/appointments.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { formatDayLong, formatPrice, formatTime, localDate } from '#lib/time.ts';
import { reminderUrl } from '#lib/whatsapp.ts';
import type { Actions, PageServerLoad } from './$types';

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : 0);

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { businessId } = requireAdmin(locals);
	const a = await getAppointment(db, businessId, parseId(params.id));
	if (!a) error(404, 'Randevu bulunamadı');
	const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
	const tz = business.timezone;
	const start = a.period.start;
	const day = formatDayLong(localDate(start, tz), tz);
	const time = formatTime(start, tz);
	return {
		appointment: {
			id: a.id,
			status: a.status,
			customerName: a.customerName,
			customerPhone: a.customerPhone,
			serviceName: a.serviceName,
			resourceName: a.resourceName,
			price: formatPrice(a.priceKurus),
			day,
			time,
			endTime: formatTime(new Date(start.getTime() + a.durationMin * 60_000), tz),
			backDate: localDate(start, tz)
		},
		whatsappUrl:
			a.status === 'cancelled'
				? null
				: reminderUrl({
						phone: a.customerPhone,
						customerName: a.customerName,
						salonName: business.name,
						day,
						time,
						serviceName: a.serviceName,
						manageUrl: `${url.origin}/r/${a.manageToken}`
					})
	};
};

async function change(
	locals: App.Locals,
	rawId: string,
	to: 'confirmed' | 'cancelled',
	done: string
) {
	const { businessId } = requireAdmin(locals);
	const r = await setAppointmentStatus(db, businessId, parseId(rawId), to);
	if (r.ok) return { success: done };
	return r.reason === 'not_found'
		? fail(404, { message: 'Randevu bulunamadı.' })
		: fail(409, { message: 'Bu randevunun durumu artık değiştirilemez.' });
}

export const actions: Actions = {
	onayla: ({ locals, params }) => change(locals, params.id, 'confirmed', 'Randevu onaylandı.'),
	iptal: ({ locals, params }) => change(locals, params.id, 'cancelled', 'Randevu iptal edildi.')
};
