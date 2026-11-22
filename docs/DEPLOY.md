# Yayına alma (Vercel Hobby + Neon + GitHub)

Tüm hesap adımlarını sen yaparsın. Kod tarafı hazır: build sırasında migration + demo kurulumu (`scripts/deploy-db.ts`), `/api/demo-reset`, `.github/workflows/demo-reset.yml`.

## 0. Ön kontrol

Bu klasörde gizli bilgi yok (`.env` git'e girmez; `git status` temiz olmalı). Mevcut `origin` uzağı eski bir adresi gösteriyor (`furkancol10/02-randevu-sistemi`); aşağıda yeni repoya çevrilir.

## 1. GitHub reposu + push

1. Terminalde (proje klasöründe):
   ```bash
   gh auth status                      # giriş yoksa: gh auth login
   git remote remove origin            # eski origin'i kaldır
   gh repo create furkancol10/randevu-sistemi --public --source . --remote origin
   git push -u origin main             # dal adı farklıysa: git branch --show-current
   ```
2. github.com/furkancol10/randevu-sistemi sayfasında dosyaların göründüğünü ve `.env` olmadığını kontrol et.

## 2. Vercel'de projeyi içe aktar

1. vercel.com → **Add New… → Project** → GitHub hesabını bağla → `randevu-sistemi` yanında **Import**.
2. Framework Preset: **SvelteKit** (otomatik). Build/Output ayarlarına dokunma (`vercel-build` script'i kullanılır).
3. **Deploy'a henüz basma.** Önce Environment Variables bölümüne `DEMO_RESET_SECRET` ekle:
   - Değer üret: `openssl rand -hex 32` (çıktıyı bir yere kaydet, GitHub'da da lazım)
   - Environments: Production + Preview işaretli.
4. Proje oluşunca Settings → **Build and Deployment → Node.js Version**: `24.x` (adapter build ortamındaki sürümü kullanır).
5. Settings → **Functions → Function Region**: kod `fra1` ister; panelde farklıysa Frankfurt (`fra1`) seç.

## 3. Neon kaynağını projeye bağla

1. Vercel → üst menü **Storage** → `randevu-sistemi-db` (Neon) kaynağını aç.
2. **Connect to Project** → `randevu-sistemi` projesini seç → Environments: **Production ve Preview** (Development isteğe bağlı) → Custom Prefix **boş bırak** → Connect.
3. Proje → Settings → Environment Variables altında şunlar görünmeli: `DATABASE_URL` (pooled, uygulama kullanır) ve `DATABASE_URL_UNPOOLED` (direkt, migration kullanır). Elle değiştirme.
4. "Preview branching" açma (kapalıyken önizlemeler aynı DB'yi kullanır; migration idempotent olduğu için sorun olmaz).

## 4. İlk deploy

1. Proje → **Deployments** → en üstteki deploy'un ⋮ menüsü → **Redeploy** (değişkenler yalnız bağlantıdan sonraki deploy'lara girer; ilk deploy başarısız olduysa buradan tekrar).
2. Build log'unda şu satırları ara: `deploy-db: migration tamam` ve `deploy-db: demo salonu kuruldu`.
3. Bittiğinde Domains'teki adresi (ör. `https://randevu-sistemi-xxxx.vercel.app`) kopyala.

## 5. Doğrulama

- `https://ADRES/demo-kuafor` açılır, hizmet → saat → randevu alınır, onay sayfası gelir.
- `https://ADRES/admin` → demo giriş bilgileri (`demo@zumrutmakas.example` / `demo-1234`) ile giriş yapılır, takvimde randevular görünür.
- Reset ucu secret'sız reddediliyor mu:
  ```bash
  curl -i -X POST https://ADRES/api/demo-reset                      # 401 beklenir
  curl -i -X POST -H "x-demo-reset-secret: SECRET" https://ADRES/api/demo-reset   # 200 {"ok":true,...}
  ```
- Kontrol: aynı deploy tekrar çalışınca veri silinmez (`demo salonu zaten var`).

## 6. Gece sıfırlama için GitHub secret'ları

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Ad                  | Değer                                                         |
| ------------------- | ------------------------------------------------------------- |
| `DEMO_URL`          | `https://randevu-sistemi-xxxx.vercel.app` (sonda `/` olmadan) |
| `DEMO_RESET_SECRET` | Vercel'e girdiğin aynı değer                                  |

Sonra **Actions → Demo sıfırlama → Run workflow** ile elle bir kez çalıştır; yeşil olmalı. Cron her gece 00:00 UTC (03:00 İstanbul) çalışır. GitHub, 60 gün hareketsiz repoda zamanlanmış workflow'u durdurur; durursa Actions sekmesinden yeniden etkinleştir.

## 7. README'yi güncelle

`README.md` içindeki `https://DEMO-URL-BURAYA` yerine gerçek adresi yaz, commit + push et.

## Sorun giderme

- Build "DATABASE_URL_UNPOOLED/DATABASE_URL tanımlı değil" diyor: Neon kaynağı projeye bağlı değil ya da Production ortamı işaretli değil (Adım 3), sonra Redeploy.
- Demo reset 401: iki yerdeki secret farklı ya da Vercel'de değişiklikten sonra redeploy yapılmadı.
- Hobby planı ticari kullanıma kapalıdır; müşteri kurulumunda müşterinin kendi planı kullanılır.
