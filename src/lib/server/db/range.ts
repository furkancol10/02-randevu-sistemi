import { customType } from 'drizzle-orm/pg-core';

/** Yarı açık [start, end) zaman aralığı (UTC anları). */
export type TimeRange = { start: Date; end: Date };

/** Postgres `tstzrange` sütunu; değer olarak `{ start, end }` kullanılır. */
export const tstzrange = customType<{ data: TimeRange; driverData: string }>({
	dataType() {
		return 'tstzrange';
	},
	toDriver(value) {
		return `[${value.start.toISOString()},${value.end.toISOString()})`;
	},
	fromDriver(value) {
		return parseTstzrange(value);
	}
});

/** `["2026-11-23 06:00:00+00","2026-11-23 06:30:00+00")` biçimini ayrıştırır. */
export function parseTstzrange(text: string): TimeRange {
	const m = /^[[(]"?([^",]+)"?,"?([^",]+)"?[\])]$/.exec(text);
	if (!m) throw new Error(`Geçersiz tstzrange: ${text}`);
	return { start: parsePgTimestamp(m[1]), end: parsePgTimestamp(m[2]) };
}

/** "2026-11-23 06:00:00+00" (ofset yalnız saat olabilir) → Date */
function parsePgTimestamp(text: string): Date {
	let iso = text.replace(' ', 'T');
	if (/[+-]\d\d$/.test(iso)) iso += ':00';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) throw new Error(`Geçersiz zaman damgası: ${text}`);
	return d;
}
