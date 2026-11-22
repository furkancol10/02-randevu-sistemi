import { chromium } from '@playwright/test';

/**
 * README ekran görüntüleri. Önce: npm run db:seed && npm run build && npm run preview -- --port 4173
 * Sonra: node --env-file=.env --import tsx scripts/screenshots.ts
 */
const base = process.env.SHOT_URL ?? 'http://localhost:4173';
const browser = await chromium.launch();

const mobile = await browser.newContext({
	viewport: { width: 360, height: 740 },
	deviceScaleFactor: 2
});
const m = await mobile.newPage();
await m.goto(`${base}/demo-kuafor`);
await m.getByRole('link', { name: /Kadın Saç Kesimi/ }).click();
await m.getByRole('link', { name: /Fark etmez/ }).click();
await m.getByRole('heading', { name: 'Gün ve saat seçin' }).waitFor();
await m.screenshot({ path: 'docs/img/01-randevu-akisi-360.png' });
await m.locator('ul.grid a').first().click();
await m.getByLabel('Ad Soyad').fill('Ece Yılmaz');
await m.getByLabel('Cep telefonu').fill('0532 000 00 00');
await m.getByRole('checkbox').check();
await m.getByRole('button', { name: 'Randevuyu onayla' }).click();
await m.getByRole('heading', { name: 'Randevunuz onaylandı' }).waitFor();
await m.screenshot({ path: 'docs/img/02-onay-360.png' });

const desktop = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const d = await desktop.newPage();
await d.goto(`${base}/admin/giris`);
await d.getByRole('button', { name: 'Giriş yap' }).click();
await d.waitForURL(/\/admin(?!\/giris)/);
await d.goto(`${base}/admin/takvim`);
await d.getByRole('link', { name: 'Haftalık' }).click();
await d.waitForLoadState('networkidle');
// Demo randevuları gelecek günlerde: bugünün haftasında yoksa sonraki haftaya geç
if ((await d.getByText('Randevu yok.').count()) >= 5) {
	await d.getByRole('link', { name: 'Sonraki' }).click();
	await d.waitForTimeout(1500);
}
await d.waitForLoadState('networkidle');
await d.screenshot({ path: 'docs/img/03-admin-takvim.png' });

await browser.close();
