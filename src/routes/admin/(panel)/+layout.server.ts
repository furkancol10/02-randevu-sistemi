import { eq } from 'drizzle-orm';
import { requireAdmin } from '#lib/server/auth/guard.ts';
import { db } from '#lib/server/db/index.ts';
import { businesses } from '#lib/server/db/schema.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const [b] = await db
		.select({ name: businesses.name })
		.from(businesses)
		.where(eq(businesses.id, admin.businessId));
	return { businessName: b?.name ?? '', email: admin.email };
};
