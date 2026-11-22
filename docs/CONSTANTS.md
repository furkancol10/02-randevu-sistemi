# Sabitler

| ad                      | değer                                                                                                 | not                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| demo yönetici           | demo@zumrutmakas.example / demo-1234                                                                  | yalnız demo; src/lib/demo.ts, giriş sayfasında hazır dolu                 |
| oturum süresi           | 7 gün                                                                                                 | src/lib/server/auth/session.ts                                            |
| müşteri iptal penceresi | 2 saat (kuaför)                                                                                       | verticals/*.ts `cancelWindowHours`                                        |
| randevu IP sınırı       | 10 / 10 dk                                                                                            | `BOOKING_RATE_MAX` ile ezilir                                             |
| giriş sınırı            | e-posta başına 5 deneme / 15 dk (başarılı giriş sıfırlar) + IP başına 20 deneme / 15 dk (sıfırlanmaz) | src/lib/server/limiters.ts                                                |
| DB havuzu               | max 3, idle_timeout 20 sn, max_lifetime 1800 sn                                                       | `DB_POOL_MAX`, `DB_IDLE_TIMEOUT`, `DB_CONNECT_TIMEOUT`, `DB_MAX_LIFETIME` |
