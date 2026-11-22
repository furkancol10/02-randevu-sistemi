import { describe, expect, it } from 'vitest';
import { normalizeTrPhone } from '../../src/lib/phone';

describe('normalizeTrPhone', () => {
	it.each([
		['0532 123 45 67', '+905321234567'],
		['532 123 45 67', '+905321234567'],
		['+90 (532) 123-45-67', '+905321234567'],
		['905321234567', '+905321234567'],
		['05321234567', '+905321234567'],
		['0090 532 123 45 67', '+905321234567'],
		['00905321234567', '+905321234567']
	])('%s → %s', (input, expected) => {
		expect(normalizeTrPhone(input)).toBe(expected);
	});

	it.each([
		'',
		'12345',
		'0212 123 45 67',
		'+1 555 123 4567',
		'0532 123 45 6',
		'abc',
		'053212345678',
		'+53 212 345 67', // Küba: +90 değil
		'+5 321 234 567',
		'abc 532 def 123 45 67',
		'0532 123 45 67 x'
	])('%j geçersiz', (input) => {
		expect(normalizeTrPhone(input)).toBeNull();
	});
});
