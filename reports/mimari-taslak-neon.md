# Randevu Sistemi — Mimari Taslak (MVP)

## 1. Teknoloji Yığını
- **Seçim:** SvelteKit 2 (Svelte 5) + `@sveltejs/adapter-vercel`, Drizzle ORM + ham SQL migration, PostgreSQL, Zod, Tailwind CSS v4, Vitest + Playwright.
- **Gerekçe:** Drizzle tip güvenli sorgu sağlarken PostgreSQL’in `tstzrange` ve `EXCLUDE` kısıtlarını ham SQL migration ile doğrudan yönetmeye izin verir. Bu yığın 2-3 günde mobil öncelikli, portföy kalitesinde temiz kod üretir.
- **Reddedilen:** Prisma (serverless soğuk başlatma ve exclusion constraint sürtünmesi); tamamen ham SQL (tip güvenliği kaybı).

## 2. Veri Modeli (`Europe/Istanbul`)
- **Seçim:** `tenants` (`id, slug, name, timezone, config_json`), `services` (`id, tenant_id, name, duration_min, price_try, active`), `staff` (`id, tenant_id, name, active`), `staff_services`, `working_hours` (`staff_id, weekday, start_time, end_time`), `time_off` (`staff_id, period tstzrange`), `appointments` (`id, tenant_id, service_id, staff_id, customer_name, customer_phone, slot tstzrange, status, cancel_token, created_at`).
- **Gerekçe:** Randevu ve izin aralıkları `tstzrange` (UTC) saklanır; haftalık saatler yerel `TIME` tutulup `Europe/Istanbul` bağlamında dönüştürülür, böylece saat dilimi kaymaları önlenir.
- **Reddedilen:** Randevuları JSONB içinde tutmak (veritabanı düzeyinde çakışma kısıtı kurulamaz).

## 3. Slot Hesaplama ve Çakışma Önleme
- **Seçim:** Günün çalışma saatlerinden `time_off` ve iptal edilmemiş randevular çıkarılır; sabit adım (örn. 15 dk) ile hizmet süresine uyan aday slotlar üretilir. "Fark etmez" seçiminde uygun personellerin birleşimi sunulur ve kayıtta en az yüklü müsait personel atanır. Eşzamanlı çakışma, `btree_gist` ile `EXCLUDE USING gist (staff_id WITH =, slot WITH &&) WHERE (status <> 'cancelled')` kısıtıyla engellenir; `23P01` hatası `409 Conflict` döner.
- **Gerekçe:** Uygulama içi kontrol yarış koşuluna açıktır; PostgreSQL exclusion constraint iki eşzamanlı isteğin aynı slotu almasını atomik biçimde imkânsız kılar.
- **Reddedilen:** Uygulama katmanında `SELECT` + `INSERT` veya Redis kilidi (yarış riski / ek altyapı).

## 4. Tek Salon vs. Çok Kiracılı
- **Seçim:** Paylaşımlı şemada `tenant_id` + `/[slug]` yönlendirmesiyle hafif çok kiracılı yapı; MVP’de kuaför ana demosu ve ikinci sektör önizlemesi.
- **Gerekçe:** `tenant_id` en baştan maliyetsizdir ve şablon satışı veya çoklu sektör vitrini için şema göçü gerektirmeden ölçeklenir.
- **Reddedilen:** Sabit tek kiracı (satışta yeniden yazım); kiracı başına ayrı DB (operasyonel yük).

## 5. Admin Kimlik Doğrulama
- **Seçim:** `admin_users` (`scrypt`/`argon2` parola özeti) + `sessions` tablosu ve `hooks.server.ts` üzerinden `HttpOnly; SameSite=Lax; Secure` çerez oturumu; canlı demoda önceden doldurulmuş herkese açık demo girişi.
- **Gerekçe:** Harici sağlayıcı bağımlılığı olmadan standart, denetlenebilir web güvenliği gösterir.
- **Reddedilen:** Clerk/Auth0 (ek bağımlılık/kurulum yükü); `localStorage` JWT (XSS riski).

## 6. Maliyetsiz Hatırlatma
- **Seçim:** Onay ekranında önceden doldurulmuş `wa.me` ve `mailto:` bağlantıları + sunucuda üretilen RFC 5545 `.ics` takvim dosyası; opsiyonel ücretsiz e-posta API’si (anahtar yoksa zarifçe devre dışı).
- **Gerekçe:** Sıfır maliyetle hem takvim hatırlatması hem de müşterinin salona tek tıkla WhatsApp onayı göndermesi sağlanır.
- **Reddedilen:** SMS/WhatsApp Business API (kredi maliyeti ve işletme doğrulaması MVP’yi aşar).

## 7. Barındırma ve Veritabanı
- **Seçim:** Vercel Hobby + Neon PostgreSQL ücretsiz katmanı (`btree_gist` destekli, test/demo için DB branching avantajlı). *Doğrulama notu: Güncel ücretsiz katman kotaları ve uyku gecikmeleri yayından önce kontrol edilmelidir.*
- **Gerekçe:** Sıfır TL maliyetle otomatik CI/CD ve tam PostgreSQL eklenti desteği sunar.
- **Reddedilen:** VPS (maliyet/bakım); Cloudflare D1 (SQLite exclusion constraint eksikliği).

## 8. Klasör Yapısı ve Test Stratejisi
- **Seçim:** `src/lib/server/db`, `src/lib/server/booking` (saf slot motoru), `src/lib/config/templates`, `src/routes/[slug]` (müşteri), `src/routes/admin` (salon). Kabul testleri: Vitest ile saf slot/saat-dilimi testleri; gerçek test PostgreSQL’inde `Promise.all` eşzamanlı çakışma testi (*kabul: tam 1 başarı + 1 `409`, kısıt yoksa başarısız*); Playwright ile 1 uçtan uca rezervasyon+admin onay akışı.
- **Gerekçe:** Saf hesaplama hızlı test edilir; en kritik çakışma kuralı gerçek veritabanında sahte mock olmadan doğrulanır.
- **Reddedilen:** DB’yi mock’layan testler (exclusion constraint davranışını doğrulayamaz).

## 9. Sektör Şablonu (Config)
- **Seçim:** Tip güvenli şablon konfigürasyonu (`terminology`: hizmet/personel/randevu etiketleri, tema, slot adımı, iptal penceresi, "fark etmez" bayrağı) `tenants.config_json` ile birleştirilir.
- **Gerekçe:** Kuaför, klinik, diyetisyen ve halı saha (`staff` → saha) aynı çekirdeği kod değiştirmeden kullanır.
- **Reddedilen:** Sektör başına ayrı repo/branch (bakım maliyeti); dinamik EAV alan motoru (aşırı mühendislik).

## 10. Riskler ve MVP Dışı Bırakılanlar
- **Seçim:** Demo kötüye kullanımı, spam ve soğuk başlatma risklerine karşı IP rate limit, honeypot, günlük demo verisi sıfırlama ve yükleme durumu uygulanır. **MVP dışı:** online ödeme/kapora, otomatik SMS/WhatsApp, müşteri üyeliği, seri randevu, gelişmiş raporlama.
- **Gerekçe:** Kapsamı 2-3 günde tamamlanabilir tutarak çekirdek rezervasyon güvenilirliği ve portföy kod kalitesine odaklanılır.
- **Reddedilen:** İlk sürümde ödeme ve SMS eklemek (hukuki, finansal ve takvim riski).

