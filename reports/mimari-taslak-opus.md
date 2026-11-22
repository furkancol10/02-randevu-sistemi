# Mimari taslak (Opus)

Tarih: 2026-11-22. "(doğrulanmadı)" etiketli bilgiler kurulumda kontrol edilmeli.

## 1. Stack
- **SvelteKit 2.x (son sürüm) + Svelte 5 runes, `adapter-vercel`, TypeScript.** SvelteKit 3 yeni çıkmış görünüyor (doğrulanmadı), ajanların bilgisi zayıf; sonra `sv migrate` ile geçilir.
- **DB erişimi: Drizzle ORM + `postgres` (postgres.js) sürücüsü.** Tipli şema + migration; exclusion constraint elle SQL migration. Reddedilen: Prisma (ağır, `tstzrange` zayıf), ham SQL (tipsiz).
- **Doğrulama: Zod** (form actions içinde, sunucuda). Superforms/remote functions yok: az bağımlılık.
- **Stil: Tailwind CSS v4.** Bileşen kütüphanesi yok.
- **Saat: `date-fns` v4 + `@date-fns/tz`.**
- **Test: Vitest** (birim + gerçek Postgres entegrasyon), **Playwright** (e2e, 360px viewport).

## 2. Veri modeli
Anlar `timestamptz` (UTC); haftalık saatler yerel `time`, `businesses.timezone='Europe/Istanbul'` ile çevrilir (koda gömülmez).
- `businesses(id, slug, name, vertical, timezone, slot_step_min, phone, settings jsonb)`
- `admins(id, business_id, email, password_hash)`, `sessions(id_hash, admin_id, expires_at)`
- `services(id, business_id, name, duration_min, price_kurus, buffer_min, active)`
- `resources(id, business_id, name, kind, active)`: personel/doktor/saha (halı saha için genel ad).
- `resource_services(resource_id, service_id)`
- `working_hours(resource_id, weekday, start_time, end_time)`: günde çok aralık (öğle arası).
- `time_off(resource_id, period tstzrange, reason)`
- `appointments(id, business_id, resource_id, service_id, period tstzrange '[)', customer_name, customer_phone, status pending|confirmed|cancelled, manage_token, created_at)`

## 3. Slot hesaplama ve çakışma
- **Hesaplama (saf fonksiyon, `slots.ts`):** `(gün, hizmet, kaynak(lar), çalışma saatleri, izinler, dolu aralıklar, şimdi) → başlangıç listesi`. Çalışma aralıkları − izinler − dolu randevular (buffer dahil); kalan boşluk `slot_step_min` adımlarla taranır, `süre+buffer` sığanlar alınır; geçmiş/min. ön süre elenir. "Fark etmez" = uygun kaynakların birleşimi.
- **Çakışma DB seviyesinde önlenir:**
  ```sql
  CREATE EXTENSION btree_gist;
  ALTER TABLE appointments ADD CONSTRAINT no_overlap
    EXCLUDE USING gist (resource_id WITH =, period WITH &&)
    WHERE (status <> 'cancelled');
  ```
  Tek INSERT; `23P01` → 409 "Bu saat az önce doldu", slotlar yenilenir. "Fark etmez": kaynaklar günlük yüke göre sıralanıp sırayla denenir. Reddedilen: transaction + `SELECT FOR UPDATE` (kilitlenecek satır yok) ve advisory lock (hataya açık).

## 4. Kiracı modeli
**Paylaşımlı şema, her tabloda `business_id`, rota `/[slug]`.** MVP'de tek demo salon, kayıt akışı yok; şablon satışında yeniden yazım gerekmez. Reddedilen: kiracı başına DB/şema (ağır), saf tek salon (sonradan `business_id` eklemek pahalı).

## 5. Admin girişi
**E-posta + şifre (`@node-rs/argon2`), DB'de oturum tablosu, httpOnly + SameSite=Lax çerez.** Lucia rehberi deseni (`sv add` iskeleti, doğrulanmadı); her sorgu oturumdaki `business_id` ile filtrelenir. Reddedilen: Auth.js/Better Auth (tek rol için fazla).

## 6. Hatırlatma (0 TL)
- Onay ekranı: `.ics` (VALARM 2 saat önce; hatırlatmayı telefon takvimi yapar), `wa.me/?text=` ve `mailto:` linkleri, `/r/[manage_token]` görüntüle/iptal.
- Admin: randevu başına "WhatsApp ile hatırlat" (`wa.me/90…?text=…`), salon elle gönderir.
- Reddedilen: SMS/WhatsApp Business API (ücretli), zamanlanmış e-posta (cron+SMTP+spam yükü).

## 7. Barındırma
**Vercel Hobby + Neon Free.** Neon Free: proje başına 100 CU-saat/ay, 1 GB, boşta sıfıra iner (Neon SSS, Ekim 2026). Pooled bağlantı (`prepare: false`). Hobby ticari kullanıma kapalı: demo için uygun, müşteri kurulumu kendi planıyla. Demo verisi her gece sıfırlanır (GitHub Actions cron → korumalı `/api/demo-reset`). Reddedilen: Supabase (free proje 7 gün boşta duraklar, doğrulanmadı), VPS (maliyet/bakım).

## 8. Klasör ve test
```
src/lib/server/db/{schema.ts,index.ts}   drizzle/ (migration + custom SQL)
src/lib/server/booking/{slots.ts,book.ts} src/lib/server/auth/
src/lib/verticals/{kuafor,klinik,diyetisyen,halisaha}.ts  src/lib/ics.ts
src/routes/[slug]/…  src/routes/admin/…  src/routes/r/[token]/
tests/unit  tests/integration  e2e/   scripts/seed.ts
```
Kabul testleri:
1. **Çakışma (en kritik):** gerçek Postgres'te (docker) aynı slota 10 paralel istek → tam 1 başarı, 9× 409; iptal edilen slot yeniden alınabilir.
2. Slot birim testleri: öğle arası, izin, buffer, gün sonu taşması, geçmiş saat, "fark etmez" birleşimi.
3. Saat dilimi: UTC sunucuda 09:00 İstanbul → 06:00Z.
4. Yetki: A admini B'nin randevusunu göremez/iptal edemez.
5. E2E (360px): hizmet → slot → ad/telefon → onay + `.ics`; admin onay/iptal.

## 9. Sektör şablonu
`verticals/*.ts` tipli config: terimler (`resource: "Personel"/"Doktor"/"Saha"`), varsayılanlar (slot adımı, onay gerekli mi, buffer), ek müşteri alanları, renk, seed verisi. `businesses.vertical` seçer, `settings jsonb` salon bazlı üzerine yazar; sektöre özel kod dalı yok. Reddedilen: DB'de config tablosu (MVP'de tipli dosya yeterli).

## 10. Riskler ve MVP dışı
**Riskler:** açık demo admininde vandalizm (gece sıfırlama, kritik ayar kilidi); spam randevu (honeypot, IP hız sınırı, TR telefon doğrulama); Neon soğuk başlangıç (~1 sn); Hobby lisans sınırı; SvelteKit 3 geçişi; KVKK (aydınlatma metni, telefon saklama süresi).

**MVP dışı:** online ödeme, otomatik SMS/WhatsApp, müşteri hesabı, çok şubeli yönetim, salon self-servis kaydı, Google Calendar senkronu, tekrarlayan randevu, bekleme listesi, çoklu dil, raporlar.
