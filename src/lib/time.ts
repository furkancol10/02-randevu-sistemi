import { TZDate } from '@date-fns/tz';

/** "2026-11-23" + "09:00" + saat dilimi → UTC anı. Sunucu saat diliminden bağımsız. */
export function zonedToUtc(date: string, time: string, timezone: string): Date {
	const [y, mo, d] = date.split('-').map(Number);
	const [h, mi] = time.split(':').map(Number);
	return new Date(new TZDate(y, mo - 1, d, h, mi, 0, timezone).getTime());
}

/** "YYYY-MM-DD" gerçek bir takvim günü mü? (2026-11-31 → false; sessizce kaymaz) ve makul yıl aralığında mı (2000-2100; uçlarda Date/Postgres taşar). */
export function isValidDate(date: string): boolean {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!m) return false;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	if (y < 2000 || y > 2100) return false;
	const t = new Date(Date.UTC(y, mo - 1, d));
	return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/**
 * Slot = UTC anı (ISO, saniyeli, ms'siz); etiket işletme yerel saati.
 * DST geri alımında aynı yerel saat iki kez gelir; "HH:mm" anahtar olamaz, değer olmalı.
 */
export function slotOption(instant: Date, timezone: string): { value: string; label: string } {
	return {
		value: instant.toISOString().replace(/\.\d{3}Z$/, 'Z'),
		label: formatTime(instant, timezone)
	};
}

/** Takvim günü için hafta günü: 0=Pazar … 6=Cumartesi (saat diliminden bağımsız). */
export function weekdayOf(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number): string {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Yerel günün [00:00, ertesi 00:00) sınırları (UTC). */
export function dayBoundsUtc(date: string, timezone: string): { start: Date; end: Date } {
	return {
		start: zonedToUtc(date, '00:00', timezone),
		end: zonedToUtc(addDays(date, 1), '00:00', timezone)
	};
}

/** Bir anın işletme saat dilimindeki takvim günü ("YYYY-MM-DD"). */
export function localDate(instant: Date, timezone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(instant);
}

export function formatTime(instant: Date, timezone: string): string {
	return new Intl.DateTimeFormat('tr-TR', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	}).format(instant);
}

/** "23 Kasım Pazartesi" */
export function formatDayLong(date: string, timezone: string): string {
	return new Intl.DateTimeFormat('tr-TR', {
		timeZone: timezone,
		day: 'numeric',
		month: 'long',
		weekday: 'long'
	}).format(zonedToUtc(date, '12:00', timezone));
}

/** "Pzt" */
export function formatWeekdayShort(date: string, timezone: string): string {
	return new Intl.DateTimeFormat('tr-TR', { timeZone: timezone, weekday: 'short' }).format(
		zonedToUtc(date, '12:00', timezone)
	);
}

/** "25000" kuruş → "250 TL" (kuruşlu ise "250,50 TL") */
export function formatPrice(kurus: number): string {
	const whole = kurus % 100 === 0;
	return (
		new Intl.NumberFormat('tr-TR', {
			minimumFractionDigits: whole ? 0 : 2,
			maximumFractionDigits: 2
		}).format(kurus / 100) + ' TL'
	);
}
