import { error, fail } from '@sveltejs/kit';
import { cancelByToken, getManageView } from '#lib/server/booking/manage.ts';
import { db } from '#lib/server/db/index.ts';
import { statusView } from '#lib/status.ts';
import { formatDayLong, formatPrice, formatTime, localDate } from '#lib/time.ts';
import { waLink } from '#lib/whatsapp.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const v = await getManageView(db, params.token);
	if (!v) error(404, 'Randevu bulunamadı');
	setHeaders({ 'cache-control': 'private, no-store' });

	const tz = v.timezone;
	const day = formatDayLong(localDate(v.start, tz), tz);
	const whatsappText = `Merhaba, ${day} saat ${formatTime(v.start, tz)} için ${v.serviceName} randevum (${v.customerName}) hakkında yazıyorum.`;
	return {
		business: { name: v.businessName, slug: v.slug },
		appointment: {
			serviceName: v.serviceName,
			resourceName: v.resourceName,
			price: formatPrice(v.priceKurus),
			day,
			time: formatTime(v.start, tz),
			status: v.status,
			view: statusView(v.status, v.customerName)
		},
		canCancel: v.canCancel,
		cancelWindowHours: v.cancelWindowHours,
		whatsappUrl: waLink(v.businessPhone, whatsappText)
	};
};

export const actions: Actions = {
	iptal: async ({ params }) => {
		const r = await cancelByToken(db, params.token);
		if (r.ok) return { success: 'Randevunuz iptal edildi.' };
		if (r.reason === 'not_found') error(404, 'Randevu bulunamadı');
		if (r.reason === 'already_cancelled') return { success: 'Bu randevu zaten iptal edilmiş.' };
		return fail(409, {
			message:
				'İptal süresi geçti. Randevuya çok az kaldığı için çevrimiçi iptal edilemiyor; lütfen salonu arayın.'
		});
	}
};
