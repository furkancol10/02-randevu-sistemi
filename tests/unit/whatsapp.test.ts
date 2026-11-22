import { describe, expect, it } from 'vitest';
import { businessPhoneDigits, reminderUrl, waLink, whatsappDigits } from '../../src/lib/whatsapp';

describe('whatsappDigits', () => {
	it('+90 5xx → yalnız rakam', () => {
		expect(whatsappDigits('+905321234567')).toBe('905321234567');
	});
	it('rakam dışını ve baştaki 0090/0 öneklerini temizler', () => {
		expect(whatsappDigits('0532 123 45 67')).toBe('905321234567');
		expect(whatsappDigits('00905321234567')).toBe('905321234567');
	});
});

describe('reminderUrl', () => {
	const url = reminderUrl({
		phone: '+905321234567',
		customerName: 'Ayşe Yılmaz',
		salonName: 'Zümrüt Makas Kuaför',
		day: '23 Kasım Pazartesi',
		time: '10:00',
		serviceName: 'Saç Kesimi',
		manageUrl: 'https://ornek.test/r/abc'
	});
	it('wa.me/90… adresine gider', () => {
		expect(url.startsWith('https://wa.me/905321234567?text=')).toBe(true);
	});
	it('metin Türkçe, kodlanmış ve gerekli bilgileri içerir', () => {
		const text = decodeURIComponent(url.split('?text=')[1]);
		expect(text).toContain('Merhaba Ayşe Yılmaz');
		expect(text).toContain('23 Kasım Pazartesi');
		expect(text).toContain('10:00');
		expect(text).toContain('Zümrüt Makas Kuaför');
		expect(text).toContain('https://ornek.test/r/abc');
		expect(url).not.toContain(' '); // boşluk kodlanmış
	});
});

describe('waLink: wa.me yalnız rakamdan kurulur (işletme telefonu)', () => {
	it('biçimli numarayı rakama indirger', () => {
		expect(waLink('+90 555 123 45 67', 'Merhaba')).toBe('https://wa.me/905551234567?text=Merhaba');
		expect(waLink('905551234567', 'a b')).toBe('https://wa.me/905551234567?text=a%20b');
	});
	it.each(['@kotu.ornek/', 'evil.com/x', '', '   ', '12', null, undefined])(
		'bozuk/boş değer (%j) → bağlantı yok (null), başka adrese yönlenmez',
		(phone) => {
			expect(waLink(phone, 'x')).toBeNull();
		}
	);
	it('rakam dışı karakterleri URL yoluna taşımaz', () => {
		const u = waLink('905551234567/../@x.test', 'x');
		expect(u === null || /^https:\/\/wa\.me\/\d+\?text=/.test(u)).toBe(true);
	});
});

describe('businessPhoneDigits (yazma anı)', () => {
	it('TR cep numarasını wa.me rakamına çevirir', () => {
		expect(businessPhoneDigits('0555 123 45 67')).toBe('905551234567');
		expect(businessPhoneDigits('+905551234567')).toBe('905551234567');
	});
	it.each(['@kotu.ornek/', '123', '+1 202 555 0100', ''])('%j geçersiz → null', (v) => {
		expect(businessPhoneDigits(v)).toBeNull();
	});
});
