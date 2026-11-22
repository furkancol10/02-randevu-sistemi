import { describe, expect, it } from 'vitest';
import { bookingSchema, formStrings } from '../../src/lib/validation';

const valid = {
	hizmet: '3',
	personel: 'herhangi',
	gun: '2026-11-23',
	saat: '2026-11-23T07:00:00Z',
	ad: 'Ayşe Yılmaz',
	telefon: '0532 123 45 67',
	kvkk: 'on',
	website: ''
};

describe('bookingSchema', () => {
	it('geçerli girdiyi normalize eder', () => {
		const r = bookingSchema.safeParse(valid);
		expect(r.success && r.data).toMatchObject({
			hizmet: 3,
			personel: 'herhangi',
			telefon: '+905321234567'
		});
	});

	it('personel sayı da olabilir', () => {
		const r = bookingSchema.safeParse({ ...valid, personel: '7' });
		expect(r.success && r.data.personel).toBe(7);
	});

	it('honeypot dolu ise reddeder', () => {
		expect(bookingSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(false);
	});

	it.each([
		['telefon', '12345'],
		['ad', 'A'],
		['saat', '10:00'],
		['saat', '2026-11-23T07:00:00+03:00'],
		['saat', '2026-13-23T07:00:00Z'],
		['gun', '23-11-2026'],
		['gun', '2026-11-31'], // takvimde yok; sessizce 1 Aralık'a kaymamalı
		['gun', '2026-02-29'],
		['gun', '2026-00-10'],
		['hizmet', '99999999999'], // Postgres integer sınırı
		['personel', '2147483648'],
		['kvkk', '']
	])('%s=%j geçersiz', (key, value) => {
		const r = bookingSchema.safeParse({ ...valid, [key]: value });
		expect(r.success).toBe(false);
	});

	it('artık yıl gününü kabul eder', () => {
		expect(bookingSchema.safeParse({ ...valid, gun: '2028-02-29' }).success).toBe(true);
	});

	it('saat: UTC anı olarak okunur (DST tekrarında iki ayrı değer)', () => {
		const a = bookingSchema.safeParse({ ...valid, saat: '2026-10-24T23:00:00Z' });
		const b = bookingSchema.safeParse({ ...valid, saat: '2026-10-25T00:00:00Z' });
		expect(a.success && b.success).toBe(true);
	});
});

describe('formStrings', () => {
	it('dosya alanlarını atar, yalnız metin alanlarını döndürür', () => {
		const fd = new FormData();
		fd.set('ad', 'Ayşe');
		fd.set('telefon', new File(['x'], 'x.txt'));
		expect(formStrings(fd)).toEqual({ ad: 'Ayşe' });
	});
});
