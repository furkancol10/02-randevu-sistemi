import { error } from '@sveltejs/kit';
import { getAppointmentByToken, getBusinessBySlug } from '#lib/server/booking/catalog.ts';
import { db } from '#lib/server/db/index.ts';
import { formatDayLong, formatTime, formatPrice, localDate } from '#lib/time.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const business = await getBusinessBySlug(db, params.slug);
	if (!business) error(404, 'Salon bulunamadı');
	const a = await getAppointmentByToken(db, business.id, params.token);
	if (!a) error(404, 'Randevu bulunamadı');
	setHeaders({ 'cache-control': 'private, no-store' });

	const tz = business.timezone;
	const start = a.period.start;
	const day = formatDayLong(localDate(start, tz), tz);
	const time = formatTime(start, tz);
	const whatsappText = `Merhaba, ${day} saat ${time} için ${a.serviceName} randevum (${a.customerName}) hakkında yazıyorum.`;
	return {
		business: {
			name: business.name,
			address: (business.settings.address as string | undefined) ?? null
		},
		appointment: {
			serviceName: a.serviceName,
			resourceName: a.resourceName,
			price: formatPrice(a.priceKurus),
			day,
			time,
			status: a.status,
			customerName: a.customerName
		},
		whatsappUrl: business.phone
			? `https://wa.me/${business.phone}?text=${encodeURIComponent(whatsappText)}`
			: null,
		icsUrl: `/${params.slug}/onay/${params.token}/randevu.ics`
	};
};
