# Randevu Sistemi (portföy)
## Amaç
Kuaför/güzellik salonları için üyeliksiz, mobil öncelikli online randevu ve yönetim paneli; sonra klinik, diyetisyen, halı saha şablonlarına uyarlanabilir.
## Stack
SvelteKit 3 + Svelte 5, TypeScript, Drizzle + postgres.js, Zod, Tailwind v4, Vitest + Playwright, Postgres (test: docker, prod: Neon), Vercel. Ayrıntı: docs/ARCHITECTURE.md
## Komutlar
- ilk kurulum: `npm i && cp .env.example .env && npm run db:start && npm run db:migrate && npm run db:seed`
- dev: `npm run dev` (demo: /demo-kuafor) · build: `npm run build`
- test: `npm test` (= `test:unit` + `test:integration`; entegrasyon gerçek Postgres ister: `npm run db:start`) · e2e 360px: `npm run test:e2e` · tip/svelte: `npm run check` · lint: `npm run lint`
- db: `db:start|stop` (docker, postgres:17, port 5433) · `db:generate` (şema→migration) · `db:migrate` · `db:seed` (demo salonu sıfırlar)
- SvelteKit 3: `$lib` yerine `#lib/...ts` (uzantılı), `$app/env/private`; yapılandırma vite.config.ts içinde
## Model rolleri
Claude = planlar, kod yazar, commit eder; Gem Neon = kod/plan review ve ikinci görüş; Hydrogen = araştırma özetleri (reports/). Ayrıntı: kullanıcının global ~/.claude/CLAUDE.md dosyası.
## Kurallar
- Kuralları yalnızca CLAUDE.md'de düzenle (AGENTS.md/GEMINI.md symlink).
- Mimari karar onaylanıp docs/ARCHITECTURE.md'ye yazılmadan uygulama kodu yazılmaz.
- Önce araştırma: docs/NOTES.md ve reports/ dolar, sonra mimari kullanıcıya onaylatılır.
- Test: yeni davranış ve hata düzeltmesinde testi uygulamadan önce çalıştır ve FAIL gör; yalnız-mock ya da totolojik test yazma.
- Her görevin bir "bitti ne zaman" satırı olur.
- Kritik iş başka bir ajan/model tarafından gözden geçirilir.
- Türkçe arayüz, 360px mobilde çalışır; demo verisi kurgusal (gerçek işletme adı yok).
- CLAUDE.md kısa kalır (≤40 satır); ayrıntı docs/ altına gider.
- Push'u yalnızca kullanıcı yapar.
## Bitti tanımı
Görevin "bitti ne zaman" koşulu doğrulandı (kodda kabul testi geçer), kritik iş başka ajan/model tarafından gözden geçirildi, madde BACKLOG'dan CHANGELOG'a taşındı.
## Bağlantılar
- docs/NOTES.md (ürün kırılımı) | docs/ARCHITECTURE.md (mimari) | docs/BACKLOG.md (iş listesi) | docs/CHANGELOG.md (biten işler)
- docs/CONSTANTS.md (sabitler: endpoint, adres, sürüm) | reports/ (araştırma çıktıları)
