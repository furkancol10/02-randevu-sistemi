export type StatusView = { title: string; text: string; tone: 'ok' | 'wait' | 'danger' };

/** Onay sayfasında randevu durumuna göre başlık/metin. */
export function statusView(status: string, customerName: string): StatusView {
	if (status === 'cancelled')
		return {
			title: 'Randevunuz iptal edildi',
			text: 'Bu randevu iptal edilmiştir. Yeni randevu için salon sayfasına dönebilirsiniz.',
			tone: 'danger'
		};
	if (status === 'pending')
		return {
			title: 'Randevu talebiniz alındı',
			text: 'Salon onayladığında size haber verilecek.',
			tone: 'wait'
		};
	return { title: 'Randevunuz onaylandı', text: `Görüşmek üzere, ${customerName}.`, tone: 'ok' };
}
