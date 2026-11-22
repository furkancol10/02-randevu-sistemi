import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from '#lib/admin-validation.ts';
import { DEMO_ADMIN } from '#lib/demo.ts';
import { authenticate } from '#lib/server/auth/password.ts';
import { SESSION_COOKIE, createSession } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';
import { admins } from '#lib/server/db/schema.ts';
import { loginLimiter } from '#lib/server/limiters.ts';
import { formStrings } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.admin) redirect(303, '/admin/takvim');
	// Demo girişi yalnız demo yöneticisi veritabanında varsa gösterilir (müşteri kurulumunda görünmez)
	const [demo] = await db
		.select({ id: admins.id })
		.from(admins)
		.where(eq(admins.email, DEMO_ADMIN.email));
	return { demo: demo ? DEMO_ADMIN : null };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress, url }) => {
		const ip = getClientAddress();
		const fields = formStrings(await request.formData());
		const email = fields.email ?? '';
		if (loginLimiter.blocked(ip)) {
			return fail(429, {
				email,
				message: 'Çok fazla başarısız deneme. Lütfen 15 dakika sonra tekrar deneyin.'
			});
		}
		const parsed = loginSchema.safeParse(fields);
		const admin = parsed.success
			? await authenticate(db, parsed.data.email, parsed.data.password)
			: null;
		if (!admin) {
			loginLimiter.record(ip);
			return fail(400, { email, message: 'E-posta veya şifre hatalı.' });
		}
		loginLimiter.reset(ip);

		const { token, expiresAt } = await createSession(db, admin.id);
		cookies.set(SESSION_COOKIE, token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			// Yerelde (http://localhost) Secure çerez gerekmez; her gerçek alan adında zorunlu
			secure: !LOCAL_HOSTS.has(url.hostname),
			expires: expiresAt
		});
		redirect(303, '/admin/takvim');
	}
};
