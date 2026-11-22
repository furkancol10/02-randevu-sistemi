import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { authenticate, createAdmin } from '../../src/lib/server/auth/password';
import {
	SESSION_TTL_MS,
	createSession,
	deleteSession,
	hashToken,
	validateSession
} from '../../src/lib/server/auth/session';
import { sessions } from '../../src/lib/server/db/schema';
import { close, createFixture, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const T0 = new Date('2026-11-20T06:00:00Z');

async function setup() {
	const { business } = await createFixture(1);
	const admin = await createAdmin(db, {
		businessId: business.id,
		email: 'Sahip@Ornek.test',
		password: 'dogru-sifre-1'
	});
	return { business, admin };
}

describe('authenticate', () => {
	it('doğru e-posta (büyük/küçük harf fark etmez) + şifre → admin', async () => {
		const { business, admin } = await setup();
		const r = await authenticate(db, 'sahip@ornek.test', 'dogru-sifre-1');
		expect(r).toEqual({ id: admin.id, businessId: business.id, email: 'sahip@ornek.test' });
	});
	it('yanlış şifre ve olmayan kullanıcı → null', async () => {
		await setup();
		expect(await authenticate(db, 'sahip@ornek.test', 'yanlis')).toBeNull();
		expect(await authenticate(db, 'yok@ornek.test', 'dogru-sifre-1')).toBeNull();
	});
	it('şifre argon2id hash olarak saklanır, düz metin değil', async () => {
		const { admin } = await setup();
		expect(admin.passwordHash.startsWith('$argon2id$')).toBe(true);
		expect(admin.passwordHash).not.toContain('dogru-sifre-1');
	});
});

describe('oturum', () => {
	it('geçerli çerez → admin ve business_id döner', async () => {
		const { business, admin } = await setup();
		const { token } = await createSession(db, admin.id, T0);
		const s = await validateSession(db, token, new Date(T0.getTime() + 60_000));
		expect(s).toEqual({ adminId: admin.id, businessId: business.id, email: 'sahip@ornek.test' });
	});

	it('DB yalnız token özetini saklar (ham token sızsa bile tablodan oturum açılamaz)', async () => {
		const { admin } = await setup();
		const { token } = await createSession(db, admin.id, T0);
		const rows = await db.select().from(sessions);
		expect(rows).toHaveLength(1);
		expect(rows[0].id).toBe(hashToken(token));
		expect(rows[0].id).not.toBe(token);
		// DB'deki özetin kendisi çerez olarak sunulursa kabul edilmez
		expect(await validateSession(db, rows[0].id, T0)).toBeNull();
	});

	it('süresi dolmuş oturum reddedilir ve silinir', async () => {
		const { admin } = await setup();
		const { token } = await createSession(db, admin.id, T0);
		const justBefore = new Date(T0.getTime() + SESSION_TTL_MS - 1000);
		expect(await validateSession(db, token, justBefore)).not.toBeNull();
		const expired = new Date(T0.getTime() + SESSION_TTL_MS + 1000);
		expect(await validateSession(db, token, expired)).toBeNull();
		expect(await db.select().from(sessions)).toHaveLength(0);
	});

	it('geçersiz / bozuk / boş çerez reddedilir', async () => {
		const { admin } = await setup();
		const { token } = await createSession(db, admin.id, T0);
		for (const bad of ['', 'x', 'a'.repeat(500), token.slice(0, -1) + 'A', token + 'x']) {
			if (bad === token) continue;
			expect(await validateSession(db, bad, T0)).toBeNull();
		}
	});

	it('çıkış oturumu siler: aynı çerez artık geçersiz', async () => {
		const { admin } = await setup();
		const { token } = await createSession(db, admin.id, T0);
		await deleteSession(db, token);
		expect(await validateSession(db, token, T0)).toBeNull();
		expect(await db.select().from(sessions).where(eq(sessions.adminId, admin.id))).toHaveLength(0);
	});
});
