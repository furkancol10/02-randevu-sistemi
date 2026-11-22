# Notlar

## Ürün kırılımı

- Müşteri tarafı: salon sayfası → hizmet seç → personel seç (veya fark etmez) → müsait slot → ad + telefon → onay ekranı + takvime ekle / WhatsApp linki
- Salon tarafı: giriş → günlük/haftalık takvim → randevu onay/iptal → hizmet, personel, çalışma saatleri, tatil/izin yönetimi

## Bileşenler / özellikler

- Hizmetler (süre, fiyat), personel (hangi hizmetleri yapar, çalışma saatleri), slot hesaplama, çakışma kontrolü (DB seviyesinde), hatırlatma linki (wa.me / e-posta), admin takvimi ve onay

## Açık sorular

- Çakışma kontrolü: Postgres exclusion constraint mı, transaction + kilit mi?
- Yayın: nerede barınacak (Vercel/Netlify + Neon/Supabase Postgres, ya da tek VPS)?
- Admin girişi: tek salon için basit oturum mu, çok kiracılı (multi-tenant) mı?
- Hatırlatma: yalnız tıklanır link mi, zamanlanmış gönderim mi (SMS/WhatsApp API maliyeti)?
- Çok sektör şablonu: terimler/ayarlar config ile mi?
