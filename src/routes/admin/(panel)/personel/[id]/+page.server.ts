import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { fieldErrors, hoursSchema, resourceSchema, timeOffSchema } from '#lib/admin-validation.ts';
import {
	addTimeOff,
	addWorkingHours,
	deleteTimeOff,
	deleteWorkingHours,
	getResource,
	listServices,
	updateResource
} from '#lib/server/admin/catalog.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { formatDayLong, formatTime, localDate, zonedToUtc } from '#lib/time.ts';
import { formStrings } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const parseId = (v: string | undefined) => (v && /^\d{1,9}$/.test(v) ? Number(v) : 0);
const firstError = (e: Parameters<typeof fieldErrors>[0]) => Object.values(fieldErrors(e))[0];

async function tzOf(businessId: number) {
	const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId));
	return b.timezone;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { businessId } = requireAdmin(locals);
	const r = await getResource(db, businessId, parseId(params.id));
	if (!r) error(404, 'Personel bulunamadı');
	const [services, tz] = await Promise.all([listServices(db, businessId), tzOf(businessId)]);
	return {
		resource: { id: r.id, name: r.name, active: r.active, serviceIds: r.serviceIds },
		services: services.map((s) => ({ id: s.id, name: s.name })),
		hours: r.hours,
		timeOff: r.timeOff.map((o) => ({
			id: o.id,
			reason: o.reason,
			label: `${formatDayLong(localDate(o.start, tz), tz)} ${formatTime(o.start, tz)} – ${formatDayLong(localDate(o.end, tz), tz)} ${formatTime(o.end, tz)}`
		}))
	};
};

export const actions: Actions = {
	guncelle: async ({ locals, params, request }) => {
		const { businessId } = requireAdmin(locals);
		const fd = await request.formData();
		const parsed = resourceSchema.safeParse(formStrings(fd));
		if (!parsed.success) return fail(400, { message: firstError(parsed.error) });
		const r = await updateResource(db, businessId, parseId(params.id), {
			name: parsed.data.ad,
			active: parsed.data.aktif === 'on',
			serviceIds: fd
				.getAll('hizmet')
				.map(Number)
				.filter((n) => Number.isInteger(n) && n > 0)
		});
		return r.ok
			? { success: 'Personel güncellendi.' }
			: fail(404, { message: 'Personel bulunamadı.' });
	},

	saatEkle: async ({ locals, params, request }) => {
		const { businessId } = requireAdmin(locals);
		const parsed = hoursSchema.safeParse(formStrings(await request.formData()));
		if (!parsed.success) return fail(400, { message: firstError(parsed.error) });
		const r = await addWorkingHours(db, businessId, parseId(params.id), {
			weekday: parsed.data.gun,
			start: parsed.data.baslangic,
			end: parsed.data.bitis
		});
		if (r.ok) return { success: 'Çalışma saati eklendi.' };
		const msg = {
			not_found: 'Personel bulunamadı.',
			overlap: 'Bu aralık o günün mevcut bir aralığıyla çakışıyor.',
			invalid: 'Bitiş saati başlangıçtan sonra olmalı.'
		}[r.reason];
		return fail(r.reason === 'not_found' ? 404 : 400, { message: msg });
	},

	saatSil: async ({ locals, params, request }) => {
		const { businessId } = requireAdmin(locals);
		const id = parseId(formStrings(await request.formData()).id);
		const r = await deleteWorkingHours(db, businessId, parseId(params.id), id);
		return r.ok
			? { success: 'Çalışma saati silindi.' }
			: fail(404, { message: 'Kayıt bulunamadı.' });
	},

	izinEkle: async ({ locals, params, request }) => {
		const { businessId } = requireAdmin(locals);
		const parsed = timeOffSchema.safeParse(formStrings(await request.formData()));
		if (!parsed.success) return fail(400, { message: firstError(parsed.error) });
		const tz = await tzOf(businessId);
		const at = (v: string) => zonedToUtc(v.slice(0, 10), v.slice(11, 16), tz);
		const r = await addTimeOff(db, businessId, parseId(params.id), {
			start: at(parsed.data.baslangic),
			end: at(parsed.data.bitis),
			reason: parsed.data.neden ?? ''
		});
		if (r.ok) return { success: 'İzin eklendi.' };
		return r.reason === 'not_found'
			? fail(404, { message: 'Personel bulunamadı.' })
			: fail(400, { message: 'Bitiş zamanı başlangıçtan sonra olmalı.' });
	},

	izinSil: async ({ locals, params, request }) => {
		const { businessId } = requireAdmin(locals);
		const id = parseId(formStrings(await request.formData()).id);
		const r = await deleteTimeOff(db, businessId, parseId(params.id), id);
		return r.ok ? { success: 'İzin silindi.' } : fail(404, { message: 'Kayıt bulunamadı.' });
	}
};
