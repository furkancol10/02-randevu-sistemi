/** Müşteri iptal penceresi: randevu başlangıcından `windowHours` saat öncesine kadar iptal edilebilir. */
export function canCancel(start: Date, now: Date, windowHours: number): boolean {
	return now.getTime() <= cancelDeadline(start, windowHours).getTime();
}

export function cancelDeadline(start: Date, windowHours: number): Date {
	return new Date(start.getTime() - windowHours * 3_600_000);
}
