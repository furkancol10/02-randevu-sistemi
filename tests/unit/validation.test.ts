import { describe, expect, it } from 'vitest';
import { bookingSchema } from '../../src/lib/validation';

const valid = {
	hizmet: '3',
	personel: 'herhangi',
	gun: '2026-11-23',
	saat: '10:00',
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
		['saat', '25:00'],
		['gun', '23-11-2026'],
		['kvkk', '']
	])('%s=%j geçersiz', (key, value) => {
		const r = bookingSchema.safeParse({ ...valid, [key]: value });
		expect(r.success).toBe(false);
	});
});
