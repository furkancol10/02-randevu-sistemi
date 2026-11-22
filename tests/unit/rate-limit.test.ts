import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/lib/server/rate-limit';

describe('createRateLimiter (kayan pencere, bellek içi)', () => {
	it('limit dolana kadar izin verir, sonra reddeder', () => {
		const rl = createRateLimiter({ max: 3, windowMs: 60_000 });
		const t = 1_000_000;
		expect([1, 2, 3, 4].map(() => rl.consume('ip-1', t))).toEqual([true, true, true, false]);
	});

	it('anahtarlar bağımsızdır', () => {
		const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
		expect(rl.consume('a', 0)).toBe(true);
		expect(rl.consume('a', 1)).toBe(false);
		expect(rl.consume('b', 1)).toBe(true);
	});

	it('pencere dolunca yeniden izin verir', () => {
		const rl = createRateLimiter({ max: 2, windowMs: 60_000 });
		rl.consume('a', 0);
		rl.consume('a', 10_000);
		expect(rl.consume('a', 59_999)).toBe(false);
		expect(rl.consume('a', 60_000)).toBe(true); // ilk istek pencereden düştü
		expect(rl.consume('a', 60_001)).toBe(false); // 10_000'deki ve 60_000'deki hâlâ içeride
	});

	it('reddedilen istekler pencereyi uzatmaz', () => {
		const rl = createRateLimiter({ max: 1, windowMs: 1000 });
		rl.consume('a', 0);
		for (let t = 100; t < 1000; t += 100) rl.consume('a', t); // hepsi red
		expect(rl.consume('a', 1000)).toBe(true);
	});

	it('blocked/record/reset: yalnız başarısızları saymak için', () => {
		const rl = createRateLimiter({ max: 2, windowMs: 60_000 });
		expect(rl.blocked('k', 0)).toBe(false);
		rl.record('k', 0);
		rl.record('k', 1);
		expect(rl.blocked('k', 2)).toBe(true);
		rl.reset('k');
		expect(rl.blocked('k', 3)).toBe(false);
	});

	it('anahtar sayısı sınırlıdır (bellek şişmez)', () => {
		const rl = createRateLimiter({ max: 1, windowMs: 60_000, maxKeys: 100 });
		for (let i = 0; i < 1000; i++) rl.consume(`ip-${i}`, i);
		expect(rl.size()).toBeLessThanOrEqual(100);
	});
});
