import { createRateLimiter } from './rate-limit';

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);

/**
 * Herkese açık randevu eylemi: IP başına 10 deneme / 10 dk (geçersiz denemeler dahil).
 * `BOOKING_RATE_MAX` ile ezilebilir (e2e testleri aynı IP'den çok randevu alır).
 */
export const bookingLimiter = createRateLimiter({
	max: num(process.env.BOOKING_RATE_MAX, 10),
	windowMs: 10 * 60_000
});

/** Admin girişi: IP başına 15 dk içinde 5 BAŞARISIZ deneme; başarılı giriş sayacı sıfırlar. */
export const loginLimiter = createRateLimiter({ max: 5, windowMs: 15 * 60_000 });
