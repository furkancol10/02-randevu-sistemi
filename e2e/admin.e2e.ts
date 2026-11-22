import { expect, test, type Page } from '@playwright/test';
import { seedAppointment } from './helpers';

const noOverflow = async (page: Page) => {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
};

async function login(page: Page) {
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/admin\/giris$/);
	// Demo bilgileri hazır dolu
	await expect(page.getByLabel('E-posta')).toHaveValue('demo@zumrutmakas.example');
	await noOverflow(page);
	await page.screenshot({ path: 'test-results/360-admin-giris.png' });
	await page.getByRole('button', { name: 'Giriş yap' }).click();
	await expect(page).toHaveURL(/\/admin\/takvim$/);
}

test('360px: admin girişi → bir randevuyu onayla → diğerini iptal et → çıkış', async ({ page }) => {
	const toConfirm = await seedAppointment({
		name: 'E2E Onay Müşterisi',
		time: '10:00',
		status: 'pending'
	});
	await seedAppointment({ name: 'E2E İptal Müşterisi', time: '12:00', status: 'confirmed' });

	await login(page);
	await expect(page.getByRole('heading', { name: 'Takvim' })).toBeVisible();

	// Günlük görünüm, ilgili güne git
	await page.goto(`/admin/takvim?gun=${toConfirm.date}`);
	await noOverflow(page);
	await page.screenshot({ path: 'test-results/360-admin-takvim.png' });
	await expect(page.getByRole('link', { name: /E2E Onay Müşterisi/ })).toContainText(
		'Onay bekliyor'
	);

	// Onayla
	await page.getByRole('link', { name: /E2E Onay Müşterisi/ }).click();
	await expect(page.getByTestId('durum')).toHaveText('Onay bekliyor');
	const wa = page.getByRole('link', { name: 'WhatsApp ile hatırlat' });
	await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/905321234567\?text=/);
	const text = decodeURIComponent((await wa.getAttribute('href'))!.split('?text=')[1]);
	expect(text).toContain('Merhaba E2E Onay Müşterisi');
	expect(text).toContain('10:00');
	expect(text).toContain('/r/');
	await page.screenshot({ path: 'test-results/360-admin-detay.png' });
	await page.getByRole('button', { name: 'Onayla' }).click();
	await expect(page.getByTestId('durum')).toHaveText('Onaylı');
	await expect(page.getByRole('button', { name: 'Onayla' })).toHaveCount(0);

	// Diğerini iptal et
	await page.goto(`/admin/takvim?gun=${toConfirm.date}`);
	await expect(page.getByRole('link', { name: /E2E Onay Müşterisi/ })).toContainText('Onaylı');
	await page.getByRole('link', { name: /E2E İptal Müşterisi/ }).click();
	await page.getByRole('button', { name: 'Randevuyu iptal et' }).click();
	await expect(page.getByTestId('durum')).toHaveText('İptal edildi');
	await page.goto(`/admin/takvim?gun=${toConfirm.date}`);
	await expect(page.getByRole('link', { name: /E2E İptal Müşterisi/ })).toContainText('İptal');

	// Haftalık görünüm aynı randevuları içerir, taşma yok
	await page.getByRole('link', { name: 'Haftalık' }).click();
	await expect(page.getByRole('link', { name: /E2E Onay Müşterisi/ })).toBeVisible();
	await noOverflow(page);

	// Çıkış: oturum biter, panel yeniden korumalı
	await page.getByRole('button', { name: 'Çıkış' }).click();
	await expect(page).toHaveURL(/\/admin\/giris$/);
	await page.goto('/admin/takvim');
	await expect(page).toHaveURL(/\/admin\/giris$/);
});

test('yanlış şifre girişi reddeder; çerezsiz erişim yönlendirilir', async ({ page }) => {
	await page.goto('/admin/giris');
	await page.getByLabel('Şifre').fill('yanlis-sifre');
	await page.getByRole('button', { name: 'Giriş yap' }).click();
	await expect(page.getByRole('alert')).toContainText('E-posta veya şifre hatalı');
	await page.goto('/admin/hizmetler');
	await expect(page).toHaveURL(/\/admin\/giris$/);
});

test('360px: hizmet ekle, personel çalışma saati ve izin ekle', async ({ page }) => {
	await login(page);

	await page.goto('/admin/hizmetler');
	await page.getByText('Yeni hizmet ekle').click();
	await page.getByLabel('Hizmet adı').first().fill('E2E Keratin Bakım');
	await page.getByLabel('Fiyat (TL)').first().fill('850,50');
	await page.getByRole('button', { name: 'Ekle' }).click();
	await expect(page.getByRole('status')).toContainText('E2E Keratin Bakım');
	await expect(page.getByText('E2E Keratin Bakım').first()).toBeVisible();
	await noOverflow(page);

	await page.goto('/admin/personel');
	await page.getByRole('link', { name: /Mehmet/ }).click();
	// Pazar günü ikinci aralık ekle
	await page.getByLabel('Gün').selectOption('0');
	await page.getByLabel('Başlangıç').first().fill('10:00');
	await page.getByLabel('Bitiş').first().fill('14:00');
	await page.getByRole('button', { name: 'Aralık ekle' }).click();
	await expect(page.getByRole('status')).toContainText('Çalışma saati eklendi');
	await expect(page.getByText('10:00–14:00')).toBeVisible();
	// Çakışan aralık reddedilir
	await page.getByLabel('Gün').selectOption('0');
	await page.getByLabel('Başlangıç').first().fill('12:00');
	await page.getByLabel('Bitiş').first().fill('16:00');
	await page.getByRole('button', { name: 'Aralık ekle' }).click();
	await expect(page.getByRole('alert')).toContainText('çakışıyor');

	await page.getByLabel('Başlangıç').nth(1).fill('2027-03-01T09:00');
	await page.getByLabel('Bitiş').nth(1).fill('2027-03-03T18:00');
	await page.getByLabel('Neden').fill('E2E yıllık izin');
	await page.getByRole('button', { name: 'İzin ekle' }).click();
	await expect(page.getByRole('status')).toContainText('İzin eklendi');
	await expect(page.getByText(/E2E yıllık izin/)).toBeVisible();
	await noOverflow(page);
});
