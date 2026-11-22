import { error } from '@sveltejs/kit';
import { getAppointmentByToken, getBusinessBySlug } from '#lib/server/booking/catalog.ts';
import { db } from '#lib/server/db/index.ts';
import { buildIcs } from '#lib/ics.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const business = await getBusinessBySlug(db, params.slug);
	if (!business) error(404, 'Salon bulunamadı');
	const a = await getAppointmentByToken(db, business.id, params.token);
	if (!a) error(404, 'Randevu bulunamadı');

	const ics = buildIcs({
		uid: `${params.token}@randevu-sistemi`,
		start: a.period.start,
		end: new Date(a.period.start.getTime() + a.durationMin * 60_000),
		summary: `${a.serviceName} - ${business.name}`,
		location: (business.settings.address as string | undefined) ?? undefined,
		description: `Personel: ${a.resourceName}`
	});
	return new Response(ics, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': 'attachment; filename="randevu.ics"',
			'cache-control': 'private, no-store'
		}
	});
};
