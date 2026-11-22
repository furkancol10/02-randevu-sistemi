import { hash, verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { admins } from '../db/schema';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function createAdmin(
	db: Db,
	input: { businessId: number; email: string; password: string }
) {
	// @node-rs/argon2 varsayılanı argon2id
	const passwordHash = await hash(input.password);
	const [row] = await db
		.insert(admins)
		.values({ businessId: input.businessId, email: normalizeEmail(input.email), passwordHash })
		.returning();
	return row;
}

// Kullanıcı yoksa da bir doğrulama yapılır: yanıt süresi e-posta varlığını sızdırmasın
let dummyHash: Promise<string> | undefined;

/** E-posta + şifre doğru ise admin, değilse null. */
export async function authenticate(db: Db, email: string, password: string) {
	const [admin] = await db
		.select()
		.from(admins)
		.where(eq(admins.email, normalizeEmail(email)));
	if (!admin) {
		dummyHash ??= hash('kullanici-yok');
		await verify(await dummyHash, password).catch(() => false);
		return null;
	}
	const ok = await verify(admin.passwordHash, password).catch(() => false);
	return ok ? { id: admin.id, businessId: admin.businessId, email: admin.email } : null;
}
