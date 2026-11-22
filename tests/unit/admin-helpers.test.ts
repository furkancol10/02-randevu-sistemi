import { describe, expect, it } from 'vitest';
import { parseTlToKurus, weekStart } from '../../src/lib/admin-validation';

describe('weekStart (Pazartesi başlangıçlı hafta)', () => {
	it('hafta içi bir gün → o haftanın Pazartesisi', () => {
		expect(weekStart('2026-11-25')).toBe('2026-11-23'); // Çarşamba
		expect(weekStart('2026-11-23')).toBe('2026-11-23'); // Pazartesi
	});
	it('Pazar önceki Pazartesiye bağlanır; ay/yıl sınırını aşar', () => {
		expect(weekStart('2026-11-22')).toBe('2026-11-16'); // Pazar
		expect(weekStart('2027-01-02')).toBe('2026-12-28'); // Cumartesi
	});
});

describe('parseTlToKurus', () => {
	it('tam ve kuruşlu tutarlar', () => {
		expect(parseTlToKurus('250')).toBe(25000);
		expect(parseTlToKurus('250,50')).toBe(25050);
		expect(parseTlToKurus('250.5')).toBe(25050);
		expect(parseTlToKurus(' 0 ')).toBe(0);
	});
	it('geçersiz girdiler null', () => {
		for (const bad of ['', 'abc', '-5', '12,345', '1,2,3', '99999999999']) {
			expect(parseTlToKurus(bad)).toBeNull();
		}
	});
});
