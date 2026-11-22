import { describe, expect, it } from 'vitest';
import { buildIcs } from '../../src/lib/ics';

const event = {
	uid: 'abc-123@randevu',
	start: new Date('2026-11-23T07:00:00Z'),
	end: new Date('2026-11-23T07:30:00Z'),
	summary: 'Erkek Saç Kesimi - Zümrüt Makas',
	location: 'Örnek Mah. Deneme Sok. No:5, Kadıköy',
	description: 'Personel: Mehmet\nRandevunu yönet; iptal et',
	now: new Date('2026-11-20T06:00:00Z')
};

describe('buildIcs', () => {
	const ics = buildIcs(event);
	const lines = ics.split('\r\n');

	it('geçerli VCALENDAR/VEVENT iskeleti ve CRLF', () => {
		expect(lines[0]).toBe('BEGIN:VCALENDAR');
		expect(lines).toContain('VERSION:2.0');
		expect(lines).toContain('BEGIN:VEVENT');
		expect(lines).toContain('END:VEVENT');
		expect(lines.at(-2)).toBe('END:VCALENDAR');
		expect(ics.endsWith('\r\n')).toBe(true);
		expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
	});

	it('zamanlar UTC (Z) ve uid/dtstamp doğru', () => {
		expect(lines).toContain('DTSTART:20261123T070000Z');
		expect(lines).toContain('DTEND:20261123T073000Z');
		expect(lines).toContain('DTSTAMP:20261120T060000Z');
		expect(lines).toContain('UID:abc-123@randevu');
	});

	it('VALARM 2 saat önce, DISPLAY', () => {
		const i = lines.indexOf('BEGIN:VALARM');
		expect(i).toBeGreaterThan(-1);
		expect(lines.slice(i, i + 5)).toEqual([
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			'DESCRIPTION:Randevu hatırlatması',
			'TRIGGER:-PT2H',
			'END:VALARM'
		]);
	});

	it('özel karakterleri kaçırır (virgül, noktalı virgül, satır sonu)', () => {
		const unfolded = ics.replace(/\r\n /g, '');
		expect(unfolded).toContain('DESCRIPTION:Personel: Mehmet\\nRandevunu yönet\\; iptal et');
		expect(unfolded).toContain('LOCATION:Örnek Mah. Deneme Sok. No:5\\, Kadıköy');
	});

	it('75 oktetten uzun satırları katlar, katlanan satır bütün karakterleri korur', () => {
		const long = buildIcs({ ...event, summary: 'Ş'.repeat(80) });
		for (const l of long.split('\r\n')) {
			expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
		}
		expect(long.replace(/\r\n /g, '')).toContain('SUMMARY:' + 'Ş'.repeat(80));
	});

	it('alarm dakikası ayarlanabilir', () => {
		expect(buildIcs({ ...event, alarmMinutes: 30 })).toContain('TRIGGER:-PT30M');
	});
});
