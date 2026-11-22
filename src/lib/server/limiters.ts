import { db } from '#lib/server/db/index.ts';
import { createRateLimiter, type Limit } from './rate-limit';

const num = (v: string | undefined, d: number) => (v && Number(v) > 0 ? Number(v) : d);

export const rateLimiter = createRateLimiter(db);

/**
 * Herkese açık randevu eylemi: IP başına 10 deneme / 10 dk (geçersiz denemeler dahil).
 * `BOOKING_RATE_MAX` ile ezilebilir (e2e testleri aynı IP'den çok randevu alır).
 */
export const BOOKING_LIMIT: Limit = {
	max: num(process.env.BOOKING_RATE_MAX, 10),
	windowMs: 10 * 60_000
};

/**
 * Admin girişi, iki bağımsız sayaç; her DENEME doğrulamadan ÖNCE atomik sayılır (paralel istekler
 * Argon2'ye ulaşamaz). E-posta: 15 dk'da 5 deneme, başarılı girişte yalnız o sayaç sıfırlanır.
 * IP: 15 dk'da 20 deneme, hiç sıfırlanmaz (başka hesapla girmek IP sayacını temizlemez).
 */
export const LOGIN_EMAIL_LIMIT: Limit = { max: 5, windowMs: 15 * 60_000 };
export const LOGIN_IP_LIMIT: Limit = { max: 20, windowMs: 15 * 60_000 };

export const bookingKey = (ip: string) => `booking:ip:${ip}`;
export const loginIpKey = (ip: string) => `login:ip:${ip}`;
export const loginEmailKey = (email: string) => `login:email:${email}`;
