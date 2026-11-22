# Mimari

Durum: onaylı (kullanıcı, 2026-11-22)

Kaynak: reports/mimari-taslak-opus.md + reports/mimari-taslak-neon.md (bağımsız; 10 kararın 10'unda aynı yön). Taban Opus taslağı, Neon'dan eklenenler işaretli.

## Kararlar

1. **Stack:** SvelteKit 3 (npm 3.4.0) + Svelte 5 (runes), TypeScript, `adapter-vercel`; Drizzle ORM + postgres.js; Zod (form actions); Tailwind v4; `date-fns` v4 + `@date-fns/tz`; Vitest + Playwright. Kurulumdan önce resmi SvelteKit 3 geçiş rehberi okunur.
2. **Saat:** anlar `timestamptz`/`tstzrange '[)'` (UTC); haftalık saatler yerel `time`, `businesses.timezone = 'Europe/Istanbul'` ile çevrilir.
3. **Veri modeli:** `businesses(id, slug, name, vertical, timezone, slot_step_min, phone, settings jsonb)`, `admins`, `sessions`, `services(…, duration_min, price_kurus, buffer_min, active)`, `resources(…, kind)` (personel/doktor/saha), `resource_services`, `working_hours` (günde çok aralık), `time_off(period tstzrange)`, `appointments(…, period tstzrange, customer_name, customer_phone, status pending|confirmed|cancelled, manage_token)`.
4. **Çakışma:** DB seviyesinde `EXCLUDE USING gist (resource_id WITH =, period WITH &&) WHERE (status <> 'cancelled')` (`btree_gist`). Tek INSERT; `23P01` → 409 "Bu saat az önce doldu". "Fark etmez": en az yüklü uygun kaynak önce denenir (Neon + Opus).
5. **Slot hesaplama:** saf fonksiyon `src/lib/server/booking/slots.ts` (çalışma aralıkları − izin − dolu randevu, buffer dahil, `slot_step_min` adım, geçmiş saat elenir).
6. **Kiracı:** paylaşımlı şema, her tabloda `business_id`, rota `/[slug]`. MVP'de 1 kuaför demosu + 1 başka sektör önizlemesi (Neon); self-servis kayıt yok.
7. **Admin girişi:** e-posta + `@node-rs/argon2`, DB oturum tablosu, httpOnly/SameSite=Lax/Secure çerez; her sorgu oturumdaki `business_id` ile filtrelenir. Demoda hazır doldurulmuş demo girişi.
8. **Hatırlatma (0 TL):** onayda `.ics` (VALARM 2 sa önce), `wa.me` ve `mailto:` linkleri, `/r/[manage_token]` görüntüle/iptal; adminde "WhatsApp ile hatırlat" butonu.
9. **Barındırma:** Vercel Hobby + Neon Free (pooled bağlantı, `prepare: false`). Demo verisi her gece sıfırlanır (GitHub Actions cron → korumalı `/api/demo-reset`). Hobby ticari değil: müşteri kurulumunda müşterinin kendi planı.
10. **Sektör şablonu:** `src/lib/verticals/{kuafor,klinik,diyetisyen,halisaha}.ts` tipli config (terimler, slot adımı, onay gerekli mi, buffer, renk, seed); `businesses.settings` salon bazında ezer.
11. **Güvenlik/kötüye kullanım:** honeypot, TR telefon doğrulama, KVKK aydınlatma metni; hız sınırı **Postgres'te** (`rate_limits` tablosu, tek upsert deyimiyle atomik sayaç; serverless'ta örnekler arası paylaşılır): randevu IP başına, giriş IP + e-posta başına.

## Klasör

`src/lib/server/{db,booking,auth}` · `src/lib/verticals` · `src/lib/ics.ts` · `src/routes/[slug]` · `src/routes/admin` · `src/routes/r/[token]` · `drizzle/` · `scripts/seed.ts` · `tests/{unit,integration}` · `e2e/`

## Kabul testleri

1. **Çakışma (en kritik):** gerçek Postgres'te (docker) aynı slota 10 paralel istek → tam 1 başarı, 9× 409; kısıt kaldırılınca test FAIL; iptal edilen slot tekrar alınabilir.
2. Slot birim: öğle arası, izin, buffer, gün sonu taşması, geçmiş saat, "fark etmez" birleşimi.
3. Saat dilimi: UTC sunucuda 09:00 İstanbul → 06:00Z.
4. Yetki: A işletmesinin admini B'nin randevusunu göremez/iptal edemez.
5. E2E (360px): hizmet → slot → ad/telefon → onay + `.ics`; admin onay/iptal.

## MVP dışı

Online ödeme/kapora, otomatik SMS/WhatsApp, müşteri hesabı, çok şube, self-servis kayıt, Google Calendar senkronu, tekrarlayan randevu, bekleme listesi, çoklu dil, raporlar.
