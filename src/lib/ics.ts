export type IcsEvent = {
	uid: string;
	start: Date;
	end: Date;
	summary: string;
	location?: string;
	description?: string;
	/** Hatırlatma: etkinlikten kaç dakika önce (varsayılan 120 = 2 saat) */
	alarmMinutes?: number;
	/** DTSTAMP için (testte sabitlenir) */
	now?: Date;
};

const utc = (d: Date) =>
	d
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');

const escapeText = (s: string) =>
	s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545: satırlar en çok 75 oktet; devam satırı boşlukla başlar. Çok baytlı karakter bölünmez. */
function fold(line: string): string {
	const enc = new TextEncoder();
	const parts: string[] = [];
	let current = '';
	let size = 0;
	let limit = 75;
	for (const ch of line) {
		const n = enc.encode(ch).length;
		if (size + n > limit) {
			parts.push(current);
			current = '';
			size = 0;
			limit = 74; // baştaki boşluk 1 oktet
		}
		current += ch;
		size += n;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

/** Tek randevuluk .ics (iCalendar) metni; Apple/Google/Outlook takvimine eklenir. */
export function buildIcs(e: IcsEvent): string {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Randevu Sistemi//TR',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${e.uid}`,
		`DTSTAMP:${utc(e.now ?? new Date())}`,
		`DTSTART:${utc(e.start)}`,
		`DTEND:${utc(e.end)}`,
		`SUMMARY:${escapeText(e.summary)}`
	];
	if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
	if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
	const minutes = e.alarmMinutes ?? 120;
	const trigger = minutes % 60 === 0 ? `-PT${minutes / 60}H` : `-PT${minutes}M`;
	lines.push(
		'BEGIN:VALARM',
		'ACTION:DISPLAY',
		'DESCRIPTION:Randevu hatırlatması',
		`TRIGGER:${trigger}`,
		'END:VALARM',
		'END:VEVENT',
		'END:VCALENDAR'
	);
	return lines.map(fold).join('\r\n') + '\r\n';
}
