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
	return { start: new Date(m[1].replace(' ', 'T')), end: new Date(m[2].replace(' ', 'T')) };
}
