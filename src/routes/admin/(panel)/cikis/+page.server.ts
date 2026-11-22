import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSession } from '#lib/server/auth/session.ts';
import { db } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/admin/takvim');

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(SESSION_COOKIE);
		if (token) await deleteSession(db, token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/admin/giris');
	}
};
