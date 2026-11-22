import type { SessionAdmin } from '#lib/server/auth/session.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Yalnız /admin yollarında doldurulur; geçerli oturum yoksa null */
			admin: SessionAdmin | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
