import { describe, expect, it } from 'vitest';
import { canCancel } from '../../src/lib/cancel';

const start = new Date('2026-11-23T07:00:00Z'); // 10:00 İstanbul

describe('canCancel (iptal penceresi)', () => {
	it('pencereden önce iptal edilebilir', () => {
		expect(canCancel(start, new Date('2026-11-23T04:00:00Z'), 2)).toBe(true);
	});
	it('tam pencere sınırında hâlâ edilebilir (başlangıçtan 2 saat önce)', () => {
		expect(canCancel(start, new Date('2026-11-23T05:00:00Z'), 2)).toBe(true);
	});
	it('sınırdan 1 sn sonra edilemez', () => {
		expect(canCancel(start, new Date('2026-11-23T05:00:01Z'), 2)).toBe(false);
	});
	it('geçmiş randevu iptal edilemez', () => {
		expect(canCancel(start, new Date('2026-11-23T08:00:00Z'), 2)).toBe(false);
	});
	it('pencere 0 ise başlangıca kadar edilebilir', () => {
		expect(canCancel(start, new Date('2026-11-23T06:59:59Z'), 0)).toBe(true);
		expect(canCancel(start, new Date('2026-11-23T07:00:01Z'), 0)).toBe(false);
	});
});
