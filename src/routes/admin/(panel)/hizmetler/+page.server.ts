import { fail } from '@sveltejs/kit';
import { fieldErrors, serviceSchema } from '#lib/admin-validation.ts';
import {
	createService,
	deleteService,
	listServices,
	updateService
} from '#lib/server/admin/catalog.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { formStrings } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const tl = (kurus: number) =>
	kurus % 100 === 0 ? String(kurus / 100) : (kurus / 100).toFixed(2).replace('.', ',');
const parseId = (v: string | undefined) => (v && /^\d{1,9}$/.test(v) ? Number(v) : 0);

export const load: PageServerLoad = async ({ locals }) => {
	const { businessId } = requireAdmin(locals);
	const list = await listServices(db, businessId);
	return {
		services: list.map((s) => ({
			id: s.id,
			name: s.name,
			durationMin: s.durationMin,
			price: tl(s.priceKurus),
			bufferMin: s.bufferMin,
			active: s.active
		}))
	};
};

export const actions: Actions = {
	ekle: async ({ locals, request }) => {
		const { businessId } = requireAdmin(locals);
		const parsed = serviceSchema.safeParse(formStrings(await request.formData()));
		if (!parsed.success)
			return fail(400, { message: Object.values(fieldErrors(parsed.error))[0], target: 'yeni' });
		const d = parsed.data;
		await createService(db, businessId, {
			name: d.ad,
			durationMin: d.sure,
			priceKurus: d.fiyat,
			bufferMin: d.tampon
		});
		return { success: `"${d.ad}" eklendi.` };
	},

	guncelle: async ({ locals, request }) => {
		const { businessId } = requireAdmin(locals);
		const fields = formStrings(await request.formData());
		const id = parseId(fields.id);
		const parsed = serviceSchema.safeParse(fields);
		if (!parsed.success)
			return fail(400, {
				message: Object.values(fieldErrors(parsed.error))[0],
				target: String(id)
			});
		const d = parsed.data;
		const r = await updateService(db, businessId, id, {
			name: d.ad,
			durationMin: d.sure,
			priceKurus: d.fiyat,
			bufferMin: d.tampon,
			active: d.aktif === 'on'
		});
		if (!r.ok) return fail(404, { message: 'Hizmet bulunamadı.', target: String(id) });
		return { success: `"${d.ad}" güncellendi.` };
	},

	sil: async ({ locals, request }) => {
		const { businessId } = requireAdmin(locals);
		const id = parseId(formStrings(await request.formData()).id);
		const r = await deleteService(db, businessId, id);
		if (r.ok) return { success: 'Hizmet silindi.' };
		return r.reason === 'has_appointments'
			? fail(409, {
					message: 'Bu hizmetin randevuları var, silinemez. Bunun yerine pasif yapabilirsiniz.',
					target: String(id)
				})
			: fail(404, { message: 'Hizmet bulunamadı.', target: String(id) });
	}
};
