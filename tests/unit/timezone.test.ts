import { describe, expect, it } from 'vitest';
import { computeSlots } from '../../src/lib/server/booking/slots';
import { formatTime, isValidDate, slotOption, weekdayOf, zonedToUtc } from '../../src/lib/time';

describe('saat dilimi (kabul testi #3)', () => {
	it('test süreci UTC sunucuyu taklit eder', () => {
		expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC');
	});

	it('09:00 İstanbul = 06:00Z', () => {
		expect(zonedToUtc('2026-11-23', '09:00', 'Europe/Istanbul').toISOString()).toBe(
			'2026-11-23T06:00:00.000Z'
		);
	});

	it('yaz saati olan bölgede de doğru (Berlin kış +1, yaz +2)', () => {
		expect(zonedToUtc('2026-01-15', '09:00', 'Europe/Berlin').toISOString()).toBe(
			'2026-01-15T08:00:00.000Z'
		);
		expect(zonedToUtc('2026-07-15', '09:00', 'Europe/Berlin').toISOString()).toBe(
			'2026-07-15T07:00:00.000Z'
		);
	});

	it('computeSlots ilk slotu 09:00 İstanbul = 06:00Z üretir', () => {
		const [first] = computeSlots({
			date: '2026-11-23',
			timezone: 'Europe/Istanbul',
			workRanges: [{ start: '09:00', end: '18:00' }],
			durationMin: 30,
			bufferMin: 0,
			stepMin: 30,
			busy: [],
			now: new Date('2026-01-01T00:00:00Z')
		});
		expect(first.toISOString()).toBe('2026-11-23T06:00:00.000Z');
	});

	it('formatTime UTC sunucuda bile işletme saatiyle gösterir', () => {
		expect(formatTime(new Date('2026-11-23T06:00:00Z'), 'Europe/Istanbul')).toBe('09:00');
	});

	it('weekdayOf: 2026-11-23 Pazartesi (1), 2026-11-22 Pazar (0)', () => {
		expect(weekdayOf('2026-11-23')).toBe(1);
		expect(weekdayOf('2026-11-22')).toBe(0);
	});
});

describe('slotOption / geçerli gün', () => {
	it('DST geri alımında aynı yerel saat iki ayrı UTC değeri olur', () => {
		const slots = computeSlots({
			date: '2026-10-25',
			timezone: 'Europe/Berlin',
			workRanges: [{ start: '00:00', end: '05:00' }],
			durationMin: 60,
			bufferMin: 0,
			stepMin: 60,
			busy: [],
			now: new Date('2026-10-01T00:00:00Z')
		});
		const opts = slots.map((d) => slotOption(d, 'Europe/Berlin'));
		const labels = opts.map((o) => o.label);
		expect(labels.filter((l) => l === '02:00')).toHaveLength(2);
		expect(new Set(opts.map((o) => o.value)).size).toBe(opts.length);
		expect(opts[0].value).toBe('2026-10-24T22:00:00Z');
	});

	it.each([
		['2026-11-23', true],
		['2028-02-29', true],
		['2026-02-29', false],
		['2026-11-31', false],
		['2026-13-01', false],
		['2026-00-10', false],
		['abc', false]
	])('isValidDate(%s)=%s', (d, ok) => {
		expect(isValidDate(d)).toBe(ok);
	});
});
