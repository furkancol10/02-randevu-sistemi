import { describe, expect, it } from 'vitest';
import { computeSlots, unionSlots } from '../../src/lib/server/booking/slots';

const TZ = 'Europe/Istanbul';
const DATE = '2026-11-23'; // Pazartesi
const LONG_AGO = new Date('2026-01-01T00:00:00Z');

/** Slot başlangıçlarını İstanbul yerel "HH:mm" olarak döker (UTC+3 sabit). */
const hhmm = (slots: Date[]) =>
	slots.map((d) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(11, 16));

/** İstanbul yerel "HH:mm" → UTC Date (2026-11-23). */
const at = (time: string) => new Date(`${DATE}T${time}:00+03:00`);

const base = {
	date: DATE,
	timezone: TZ,
	workRanges: [{ start: '09:00', end: '18:00' }],
	durationMin: 60,
	bufferMin: 0,
	stepMin: 30,
	busy: [],
	now: LONG_AGO
};

describe('computeSlots (kabul testi #2)', () => {
	it('öğle arasında slot üretmez', () => {
		const slots = hhmm(
			computeSlots({
				...base,
				workRanges: [
					{ start: '09:00', end: '13:00' },
					{ start: '14:00', end: '18:00' }
				]
			})
		);
		expect(slots).toEqual([
			'09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
			'14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
		]);
	});

	it('izin aralığıyla kesişen slotları eler', () => {
		const slots = hhmm(
			computeSlots({ ...base, busy: [{ start: at('11:00'), end: at('12:00') }] })
		);
		// 10:00-11:00 biter 11:00'de (yarı açık) -> serbest; 10:30-11:30 kesişir -> yok
		expect(slots).toContain('10:00');
		expect(slots).not.toContain('10:30');
		expect(slots).not.toContain('11:00');
		expect(slots).not.toContain('11:30');
		expect(slots).toContain('12:00');
	});

	it('buffer hem yeni slotu hem komşu randevuyu korur', () => {
		// 30 dk hizmet + 15 dk buffer. Mevcut randevu dolu aralığı 10:00-10:45.
		const slots = hhmm(
			computeSlots({
				...base,
				durationMin: 30,
				bufferMin: 15,
				stepMin: 15,
				busy: [{ start: at('10:00'), end: at('10:45') }]
			})
		);
		expect(slots).toContain('09:15'); // 09:15-10:00 dolu aralığı 10:00'de biter
		expect(slots).not.toContain('09:30'); // buffer'lı aralık 10:15'e uzanır -> çakışır
		expect(slots).not.toContain('10:30');
		expect(slots).toContain('10:45');
	});

	it('gün sonuna taşan slotu vermez (buffer hariç hizmet bitişi çalışma saatini aşmamalı)', () => {
		const long = hhmm(computeSlots({ ...base, durationMin: 60 }));
		expect(long.at(-1)).toBe('17:00'); // 17:30 + 60 dk = 18:30 > 18:00
		const odd = hhmm(computeSlots({ ...base, durationMin: 45, stepMin: 15 }));
		expect(odd.at(-1)).toBe('17:15'); // 17:15 + 45 = 18:00 tam sığar
	});

	it('geçmiş saatleri eler', () => {
		const slots = hhmm(
			computeSlots({
				...base,
				workRanges: [
					{ start: '09:00', end: '13:00' },
					{ start: '14:00', end: '18:00' }
				],
				durationMin: 30,
				stepMin: 15,
				now: at('12:10')
			})
		);
		expect(slots[0]).toBe('12:15');
		expect(slots).not.toContain('09:00');
	});

	it('çalışma aralığı yoksa boş döner', () => {
		expect(computeSlots({ ...base, workRanges: [] })).toEqual([]);
	});

	it('slot_step_min adımına uyar', () => {
		const slots = hhmm(computeSlots({ ...base, durationMin: 30, stepMin: 20 }));
		expect(slots.slice(0, 4)).toEqual(['09:00', '09:20', '09:40', '10:00']);
	});
});

describe('unionSlots ("fark etmez" birleşimi)', () => {
	it('kaynak slotlarını tekilleştirip sıralar', () => {
		const a = [at('09:00'), at('09:30')];
		const b = [at('09:30'), at('10:00')];
		expect(hhmm(unionSlots([a, b]))).toEqual(['09:00', '09:30', '10:00']);
	});

	it('boş girdide boş döner', () => {
		expect(unionSlots([])).toEqual([]);
		expect(unionSlots([[], []])).toEqual([]);
	});
});
