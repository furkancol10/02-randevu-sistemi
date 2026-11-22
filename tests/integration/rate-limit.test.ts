import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { rateLimits } from '../../src/lib/server/db/schema';
import { createRateLimiter } from '../../src/lib/server/rate-limit';
import { close, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

const rl = createRateLimiter(db);
const T0 = new Date('2026-11-22T10:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

describe('createRateLimiter (Postgres, sabit pencere)', () => {
	it('limit dolana kadar izin verir, sonra reddeder', async () => {
		const lim = { max: 3, windowMs: 60_000 };
		const r: boolean[] = [];
		for (let i = 0; i < 4; i++) r.push(await rl.hit('ip-1', lim, T0));
		expect(r).toEqual([true, true, true, false]);
	});

	it('anahtarlar bağımsızdır', async () => {
		const lim = { max: 1, windowMs: 60_000 };
		expect(await rl.hit('a', lim, T0)).toBe(true);
		expect(await rl.hit('a', lim, at(1))).toBe(false);
		expect(await rl.hit('b', lim, at(1))).toBe(true);
	});

	it('pencere dolunca sayaç sıfırlanır; reddedilen istekler pencereyi uzatmaz', async () => {
		const lim = { max: 1, windowMs: 1000 };
		await rl.hit('a', lim, T0);
		for (let t = 100; t < 1000; t += 100) expect(await rl.hit('a', lim, at(t))).toBe(false);
		expect(await rl.hit('a', lim, at(1000))).toBe(true);
		expect(await rl.hit('a', lim, at(1001))).toBe(false);
	});

	it('50 paralel istek, max 5: tam olarak 5 izin (yarış yok)', async () => {
		const lim = { max: 5, windowMs: 60_000 };
		const r = await Promise.all(Array.from({ length: 50 }, () => rl.hit('burst', lim, T0)));
		expect(r.filter(Boolean)).toHaveLength(5);
	});

	it('reset yalnız verilen anahtarı sıfırlar', async () => {
		const lim = { max: 1, windowMs: 60_000 };
		await rl.hit('x', lim, T0);
		await rl.hit('y', lim, T0);
		await rl.reset('x');
		expect(await rl.hit('x', lim, at(1))).toBe(true);
		expect(await rl.hit('y', lim, at(1))).toBe(false);
	});

	it('süresi dolmuş satırlar temizlenir (tablo şişmez)', async () => {
		const lim = { max: 1, windowMs: 1000 };
		for (let i = 0; i < 20; i++) await rl.hit(`eski-${i}`, lim, T0);
		// 50. çağrı temizliği tetikler; hepsi süresi dolmuş bir zamanda
		for (let i = 0; i < 40; i++) await rl.hit('canli', { max: 1, windowMs: 60_000 }, at(10_000));
		const rows = await db.select().from(rateLimits);
		expect(rows.some((r) => r.key.startsWith('eski-'))).toBe(false);
		expect(await db.select().from(rateLimits).where(eq(rateLimits.key, 'canli'))).toHaveLength(1);
	});
});
