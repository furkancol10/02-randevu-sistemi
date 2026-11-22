import { describe, expect, it } from 'vitest';
import {
	hoursSchema,
	parseIdList,
	parseTlToKurus,
	timeOffSchema,
	weekStart
} from '../../src/lib/admin-validation';
import { isValidDate } from '../../src/lib/time';

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

describe('timeOffSchema: yerel tarih-saat sınırları (Neon #8)', () => {
	const ok = (baslangic: string, bitis = '2027-03-03T18:00') =>
		timeOffSchema.safeParse({ baslangic, bitis }).success;
	it('geçerli tarih-saat kabul edilir', () => {
		expect(ok('2026-11-23T00:00')).toBe(true);
		expect(ok('2026-11-23T23:59')).toBe(true);
	});
	it.each(['2026-11-23T99:99', '2026-11-23T24:00', '2026-11-23T12:60', '2026-11-23T25:10'])(
		'saat/dakika taşması (%s) reddedilir',
		(v) => {
			expect(ok(v)).toBe(false);
			expect(ok('2026-11-23T09:00', v)).toBe(false);
		}
	);
	it('uç yıl (9999) reddedilir: Postgres aralık taşması 500 üretmesin', () => {
		expect(ok('9999-12-31T23:59')).toBe(false);
	});
});

describe('hoursSchema: boş gün seçimi Pazar sayılmaz (Neon notu)', () => {
	const gun = (v: string) =>
		hoursSchema.safeParse({ gun: v, baslangic: '09:00', bitis: '10:00' }).success;
	it('"" ve boşluk reddedilir; "0" (Pazar) ve "6" kabul edilir', () => {
		expect(gun('')).toBe(false);
		expect(gun('  ')).toBe(false);
		expect(gun('0')).toBe(true);
		expect(gun('6')).toBe(true);
		expect(gun('7')).toBe(false);
	});
});

describe('parseIdList: form id listesi int4 sınırında (Neon #9)', () => {
	it('geçerli pozitif tam sayıları alır, geri kalanını atar', () => {
		expect(parseIdList(['1', '25', '2147483647'])).toEqual([1, 25, 2147483647]);
		expect(parseIdList(['0', '-3', '1.5', 'abc', '', '2147483648', '99999999999999'])).toEqual([]);
	});
});

describe('isValidDate: makul yıl aralığı (Neon notu: ?gun=9999-12-31)', () => {
	it.each([
		['2026-11-23', true],
		['9999-12-31', false],
		['0001-01-01', false]
	])('isValidDate(%s)=%s', (d, v) => expect(isValidDate(d)).toBe(v));
});
