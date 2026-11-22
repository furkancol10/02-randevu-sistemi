# Backlog
## Yapılacak
- [ ] Deploy: Vercel + Neon, `/api/demo-reset` + GitHub Actions gece sıfırlama (reset `seedVertical` + `seedDemoAppointments` çağırır). Vercel'de `@node-rs/argon2` Linux ikilisinin pakete girdiği doğrulanmalı (build'de diğer platform ikilileri için uyarı çıkıyor, zararsız)
- [ ] 2. sektör önizlemesi (klinik/diyetisyen/halı saha config); `requiresApproval: true` sektörde müşteri metni "talebiniz alındı" hazır, admin onayı çalışıyor
- [ ] Onay mailto: linki (işletme e-postası alanı yok; şemaya eklenecek)
- [ ] Gün şeridi 14 gün sabit; 30 güne kadar ileri-geri gezinme
- [ ] Admin: elle randevu ekleme (telefonla gelen müşteri), izin eklerken çakışan randevu uyarısı, randevu yeniden zamanlama
- [ ] Admin: şifre değiştirme, birden çok yönetici; demo girişi müşteri kurulumunda kapatılacak (`src/lib/demo.ts` + seed)
## Devam eden
