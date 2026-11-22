import { z } from 'zod';
import { normalizeTrPhone } from './phone';

export const bookingSchema = z.object({
	hizmet: z.coerce.number().int().positive(),
	personel: z.union([z.literal('herhangi'), z.coerce.number().int().positive()]),
	gun: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	saat: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
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
