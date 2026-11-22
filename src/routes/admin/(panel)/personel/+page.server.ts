import { fail, redirect } from '@sveltejs/kit';
import { fieldErrors, parseIdList, resourceSchema } from '#lib/admin-validation.ts';
import { createResource, listResources, listServices } from '#lib/server/admin/catalog.ts';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { getVertical } from '#lib/verticals/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import { eq } from 'drizzle-orm';
import { formStrings } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { businessId } = requireAdmin(locals);
	const [staff, services] = await Promise.all([
		listResources(db, businessId),
		listServices(db, businessId)
	]);
	return {
		staff: staff.map((r) => ({
			id: r.id,
			name: r.name,
			active: r.active,
			serviceCount: r.serviceIds.length
		})),
		services: services.map((s) => ({ id: s.id, name: s.name }))
	};
};

export const actions: Actions = {
	ekle: async ({ locals, request }) => {
		const { businessId } = requireAdmin(locals);
		const fd = await request.formData();
		const parsed = resourceSchema.safeParse(formStrings(fd));
		if (!parsed.success) return fail(400, { message: Object.values(fieldErrors(parsed.error))[0] });
		const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
		const serviceIds = parseIdList(fd.getAll('hizmet').map(String));
		const r = await createResource(db, businessId, {
			name: parsed.data.ad,
			kind: getVertical(business.vertical).resourceKind,
			serviceIds
		});
		redirect(303, `/admin/personel/${r.id}`);
	}
};
