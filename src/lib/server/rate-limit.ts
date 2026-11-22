/**
 * Bellek içi kayan pencere hız sınırı.
 *
 * Sınır (bilinçli): durum süreç belleğindedir. Vercel/serverless'ta her örnek kendi sayacını tutar ve
 * soğuk başlangıçta sıfırlanır; yani sınır "örnek başına"dır, küresel değil. Demo ve kötüye
 * kullanımı yavaşlatmak için yeterlidir; gerçek üretimde Redis/Upstash ya da Postgres sayacı gerekir.
 */
export type RateLimiter = {
	/** İsteği sayar; limit aşılmışsa false (reddedilen istek sayılmaz). */
	consume(key: string, now?: number): boolean;
	/** Saymadan: limit dolu mu? */
	blocked(key: string, now?: number): boolean;
	/** Bir olayı sayar (ör. başarısız giriş). */
	record(key: string, now?: number): void;
	reset(key: string): void;
	clear(): void;
	size(): number;
};

export function createRateLimiter(opts: {
	max: number;
	windowMs: number;
	/** Bellek üst sınırı: aşılırsa en eski anahtarlar atılır */
	maxKeys?: number;
}): RateLimiter {
	const { max, windowMs, maxKeys = 10_000 } = opts;
	const hits = new Map<string, number[]>();

	function live(key: string, now: number): number[] {
		const list = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
		if (list.length === 0) hits.delete(key);
		else hits.set(key, list);
		return list;
	}

	function add(key: string, now: number) {
		const list = live(key, now);
		list.push(now);
		hits.delete(key); // Map ekleme sırası = en eskiden yeniye
		hits.set(key, list);
		while (hits.size > maxKeys) hits.delete(hits.keys().next().value!);
	}

	return {
		consume(key, now = Date.now()) {
			if (live(key, now).length >= max) return false;
			add(key, now);
			return true;
		},
		blocked: (key, now = Date.now()) => live(key, now).length >= max,
		record: (key, now = Date.now()) => add(key, now),
		reset: (key) => void hits.delete(key),
		clear: () => hits.clear(),
		size: () => hits.size
	};
}
