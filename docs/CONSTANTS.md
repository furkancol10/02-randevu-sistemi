# Sabitler
| ad | değer | not |
|----|-------|-----|
| demo yönetici | demo@zumrutmakas.example / demo-1234 | yalnız demo; src/lib/demo.ts, giriş sayfasında hazır dolu |
| oturum süresi | 7 gün | src/lib/server/auth/session.ts |
| müşteri iptal penceresi | 2 saat (kuaför) | verticals/*.ts `cancelWindowHours` |
| randevu IP sınırı | 10 / 10 dk | `BOOKING_RATE_MAX` ile ezilir |
| giriş sınırı | 5 başarısız / 15 dk / IP | src/lib/server/limiters.ts |
