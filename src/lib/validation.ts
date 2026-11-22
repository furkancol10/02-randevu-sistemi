import { z } from 'zod';
import { normalizeTrPhone } from './phone';
import { isValidDate } from './time';

const PG_INT_MAX = 2_147_483_647;

export const bookingSchema = z.object({
	hizmet: z.coerce.number().int().positive().max(PG_INT_MAX),
	personel: z.union([z.literal('herhangi'), z.coerce.number().int().positive().max(PG_INT_MAX)]),
	gun: z.string().refine(isValidDate, 'Geçersiz tarih'),
	/** Slotun UTC anı: 2026-11-23T07:00:00Z (yerel "HH:mm" DST'de belirsiz) */
	saat: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/)
		.refine((v) => !Number.isNaN(Date.parse(v)), 'Geçersiz saat'),
	ad: z.string().trim().min(2, 'Lütfen adınızı yazın').max(80, 'Ad en fazla 80 karakter olabilir'),
	telefon: z
		.string()
		.trim()
		.transform((v, ctx) => {
			const n = normalizeTrPhone(v);
			if (!n) {
				ctx.addIssue({
					code: 'custom',
					message: 'Geçerli bir cep telefonu girin (05xx xxx xx xx)'
				});
				return z.NEVER;
			}
			return n;
		}),
	kvkk: z.literal('on', { error: 'Devam etmek için aydınlatma metnini onaylayın' }),
	/** Honeypot: gerçek kullanıcı görmez, boş kalır */
	website: z.string().max(0)
});

export type BookingFields = Record<string, string>;

/** FormData'dan yalnız metin alanları (File vb. atılır; fail() serileştirmesi çökmesin). */
export function formStrings(fd: FormData): BookingFields {
	const out: BookingFields = {};
	for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
	return out;
}
