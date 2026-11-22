import { createDb } from '../src/lib/server/db/client';
import { seedVertical } from '../scripts/seed';

/** Her e2e koşusundan önce demo salonu sıfırdan kurar. */
export default async function globalSetup() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL tanımlı değil (.env)');
	const { db, close } = createDb(url);
	await seedVertical(db, 'kuafor');
	await close();
}
