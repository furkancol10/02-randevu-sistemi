import { expect, test } from '@playwright/test';
import { seedAppointment, seedImminentAppointment } from './helpers';

test('360px: müşteri onay sayfasından yönetim bağlantısına gidip randevusunu iptal eder', async ({
	page
}) => {
	const appt = await seedAppointment({
		name: 'E2E Müşteri İptal',
		time: '16:00',
		status: 'confirmed'
	});

	await page.goto(`/demo-kuafor/onay/${appt.token}`);
	await page.getByRole('link', { name: /görüntüle \/ iptal et/ }).click();
	await expect(page).toHaveURL(new RegExp(`/r/${appt.token}$`));
	await expect(page.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();
	await expect(page.getByText('Randevudan 2 saat öncesine kadar')).toBeVisible();

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
	await page.screenshot({ path: 'test-results/360-manage.png' });

	await page.getByRole('button', { name: 'Randevuyu iptal et' }).click();
	await expect(page.getByRole('status')).toContainText('Randevunuz iptal edildi');
	await expect(page.getByRole('heading', { name: 'Randevunuz iptal edildi' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Randevuyu iptal et' })).toHaveCount(0);

	// Yeniden yükleyince de iptal görünür (kalıcı)
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Randevunuz iptal edildi' })).toBeVisible();
});

test('360px: iptal penceresi içindeki randevu (60 dk kala) çevrimiçi iptal edilemez', async ({
	page
}) => {
	const { token } = await seedImminentAppointment('E2E Yaklaşan');
	await page.goto(`/r/${token}`);
	await expect(page.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();
	await expect(page.getByText(/saatten az kaldığı için çevrimiçi iptal edilemiyor/)).toBeVisible();
	await expect(page.getByRole('button', { name: 'Randevuyu iptal et' })).toHaveCount(0);

	// Form doğrudan gönderilse bile sunucu reddeder
	const res = await page.request.post(`/r/${token}?/iptal`, {
		headers: { origin: 'http://localhost:4173' },
		form: {}
	});
	expect(res.status()).toBe(409);
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Randevunuz onaylandı' })).toBeVisible();
});

test('bozuk token 404', async ({ request }) => {
	expect((await request.get('/r/bozuk')).status()).toBe(404);
});
