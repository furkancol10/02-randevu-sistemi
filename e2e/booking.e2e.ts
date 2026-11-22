import { expect, test, type Page } from '@playwright/test';

test('360px: hizmet → fark etmez → slot → ad/telefon → onay + .ics', async ({ page, request }) => {
	await page.goto('/demo-kuafor');
	await expect(page.getByRole('heading', { name: 'Hizmet seçin' })).toBeVisible();

	await page.getByRole('link', { name: /Kadın Saç Kesimi/ }).click();
	await page.getByRole('link', { name: /Fark etmez/ }).click();
	await expect(page.getByRole('heading', { name: 'Gün ve saat seçin' })).toBeVisible();

	// Taşma yok: sayfa yatay kaydırılmıyor
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);

	await page.screenshot({ path: 'test-results/360-slotlar.png' });
	await page.locator('ul.grid a').first().click();
	await expect(page.getByRole('heading', { name: 'Bilgileriniz' })).toBeVisible();

	// Geçersiz telefon → hata, ad korunur
	await page.getByLabel('Ad Soyad').fill('Deneme Müşteri');
	await page.getByLabel('Cep telefonu').fill('12345');
	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Randevuyu onayla' }).click();
	await expect(page.getByText('Geçerli bir cep telefonu girin')).toBeVisible();
	await expect(page.getByLabel('Ad Soyad')).toHaveValue('Deneme Müşteri');

	await page.getByLabel('Cep telefonu').fill('0532 123 45 67');
	await page.getByRole('checkbox').check();
	await page.screenshot({ path: 'test-results/360-form.png' });
	await page.getByRole('button', { name: 'Randevuyu onayla' }).click();

	await expect(page.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();
	await expect(page.getByText('Kadın Saç Kesimi')).toBeVisible();
	await page.screenshot({ path: 'test-results/360-onay.png' });

	const wa = page.getByRole('link', { name: /WhatsApp/ });
	await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/905551234567\?text=/);

	const icsHref = await page.getByRole('link', { name: /Takvime ekle/ }).getAttribute('href');
	const ics = await request.get(icsHref!);
	expect(ics.headers()['content-type']).toContain('text/calendar');
	const body = await ics.text();
	expect(body).toContain('BEGIN:VEVENT');
	expect(body).toContain('TRIGGER:-PT2H');
});

test('aynı slotu iki müşteri: ikincisi "az önce doldu" görür ve başka saat seçebilir', async ({
	browser
}) => {
	const fillAndSubmit = async (page: Page, name: string, phone: string) => {
		await page.getByLabel('Ad Soyad').fill(name);
		await page.getByLabel('Cep telefonu').fill(phone);
		await page.getByRole('checkbox').check();
		await page.getByRole('button', { name: 'Randevuyu onayla' }).click();
	};
	const openForm = async (page: Page) => {
		await page.goto('/demo-kuafor');
		await page.getByRole('link', { name: /Erkek Saç Kesimi/ }).click();
		await page.getByRole('link', { name: 'Mehmet' }).click();
		await page.locator('ul.grid a').first().click();
		await expect(page.getByRole('heading', { name: 'Bilgileriniz' })).toBeVisible();
	};

	const a = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
	const b = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
	await openForm(a);
	await openForm(b); // ikisi de aynı slotun formunda

	await fillAndSubmit(a, 'Birinci', '0532 111 22 33');
	await expect(a.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();

	await fillAndSubmit(b, 'İkinci', '0533 444 55 66');
	await expect(b.getByRole('alert')).toContainText('Bu saat az önce doldu');
	// Aynı gün için güncel slot listesi gösterilir; yeni seçim yapılabilir
	await expect(b.getByRole('heading', { name: 'Gün ve saat seçin' })).toBeVisible();
	await b.locator('ul.grid a').first().click();
	await fillAndSubmit(b, 'İkinci', '0533 444 55 66');
	await expect(b.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();
});
