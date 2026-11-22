import { describe, expect, it } from 'vitest';
import { parseTstzrange } from '../../src/lib/server/db/range';

describe('parseTstzrange', () => {
	it('postgres.js çıktısını (+00 ofsetli) doğru ayrıştırır', () => {
		const r = parseTstzrange('["2026-11-23 06:00:00+00","2026-11-23 06:30:00+00")');
		expect(r.start.toISOString()).toBe('2026-11-23T06:00:00.000Z');
		expect(r.end.toISOString()).toBe('2026-11-23T06:30:00.000Z');
	});

	it('ofsetli ve kesirli saniyeli biçimi de çözer', () => {
		const r = parseTstzrange('["2026-11-23 09:00:00.5+03:00","2026-11-23 10:00:00+03")');
		expect(r.start.toISOString()).toBe('2026-11-23T06:00:00.500Z');
		expect(r.end.toISOString()).toBe('2026-11-23T07:00:00.000Z');
	});
});
