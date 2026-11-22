import { z } from 'zod';
import { addDays, isValidDate, weekdayOf } from './time';

/** Haftanın Pazartesisi (TR haftası Pazartesi başlar). */
export function weekStart(date: string): string {
	return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/** "250" / "250,50" / "250.5" → kuruş; geçersizse null. */
export function parseTlToKurus(input: string): number | null {
	const m = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(input.trim());
	if (!m) return null;
	return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}

/** Zod hatalarını alan → ilk mesaj sözlüğüne çevirir. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
	return out;
}

const int = (min: number, max: number, msg: string) =>
	z.coerce.number(msg).int(msg).min(min, msg).max(max, msg);
const name = (label: string) =>
	z
		.string()
		.trim()
		.min(2, `${label} en az 2 karakter olmalı`)
		.max(80, `${label} en fazla 80 karakter olabilir`);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Saat HH:mm biçiminde olmalı');

export const loginSchema = z.object({
	email: z.string().trim().min(3, 'E-posta girin').max(200),
	password: z.string().min(1, 'Şifre girin').max(200)
});

export const serviceSchema = z.object({
	ad: name('Hizmet adı'),
	sure: int(5, 600, 'Süre 5-600 dakika olmalı'),
	fiyat: z.string().transform((v, ctx) => {
		const k = parseTlToKurus(v);
		if (k === null) {
			ctx.addIssue({ code: 'custom', message: 'Geçerli bir tutar girin (örn. 250 veya 250,50)' });
			return z.NEVER;
		}
		return k;
	}),
	tampon: int(0, 240, 'Hazırlık/temizlik süresi 0-240 dakika olmalı'),
	aktif: z.literal('on').optional()
});

export const resourceSchema = z.object({
	ad: name('Ad'),
	aktif: z.literal('on').optional()
});

export const hoursSchema = z.object({
	gun: int(0, 6, 'Gün seçin'),
	baslangic: hhmm,
	bitis: hhmm
});

const localDateTime = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Tarih ve saat girin')
	.refine((v) => isValidDate(v.slice(0, 10)), 'Geçersiz tarih');

export const timeOffSchema = z.object({
	baslangic: localDateTime,
	bitis: localDateTime,
	neden: z.string().trim().max(120, 'Neden en fazla 120 karakter olabilir').optional()
});
