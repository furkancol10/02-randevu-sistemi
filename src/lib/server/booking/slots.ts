import { zonedToUtc } from '../../time';

export type Interval = { start: Date; end: Date };
/** Yerel "HH:mm" çalışma aralığı */
export type WorkRange = { start: string; end: string };

export type SlotInput = {
	/** İşletme yerel takvim günü: "YYYY-MM-DD" */
	date: string;
	timezone: string;
	/** O güne ait çalışma aralıkları (öğle arası = iki aralık) */
	workRanges: WorkRange[];
	durationMin: number;
	bufferMin: number;
	stepMin: number;
	/** İzinler + dolu randevu aralıkları (randevununki buffer dahil), yarı açık [start,end) */
	busy: Interval[];
	now: Date;
};

const MIN = 60_000;

/**
 * Tek kaynak için müsait slot başlangıçları (UTC, artan sıralı).
 * - Hizmet bitişi (buffer hariç) çalışma aralığı içinde kalmalı.
 * - Dolu aralık = [başlangıç, başlangıç + süre + buffer); busy ile yarı açık kesişmemeli.
 * - `now`'dan önceki veya eşit başlangıçlar elenir.
 */
export function computeSlots(input: SlotInput): Date[] {
	const { date, timezone, durationMin, bufferMin, stepMin, busy, now } = input;
	const slots: Date[] = [];
	for (const range of input.workRanges) {
		const rangeStart = zonedToUtc(date, range.start, timezone).getTime();
		const rangeEnd = zonedToUtc(date, range.end, timezone).getTime();
		for (let s = rangeStart; s + durationMin * MIN <= rangeEnd; s += stepMin * MIN) {
			if (s <= now.getTime()) continue;
			const occupiedEnd = s + (durationMin + bufferMin) * MIN;
			const clash = busy.some((b) => s < b.end.getTime() && b.start.getTime() < occupiedEnd);
			if (!clash) slots.push(new Date(s));
		}
	}
	return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** "Fark etmez": kaynakların slot listelerinin tekilleştirilmiş, sıralı birleşimi. */
export function unionSlots(perResource: Date[][]): Date[] {
	const seen = new Map<number, Date>();
	for (const list of perResource) for (const d of list) seen.set(d.getTime(), d);
	return [...seen.values()].sort((a, b) => a.getTime() - b.getTime());
}
