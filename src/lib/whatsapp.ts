/** wa.me için yalnız rakam, ülke kodlu numara: "+905321234567" / "0532 123 45 67" → "905321234567". */
export function whatsappDigits(phone: string): string {
	let d = phone.replace(/\D/g, '');
	if (d.startsWith('0090')) d = d.slice(2);
	else if (d.startsWith('0')) d = '90' + d.slice(1);
	return d;
}

export type ReminderInput = {
	phone: string;
	customerName: string;
	salonName: string;
	day: string;
	time: string;
	serviceName: string;
	manageUrl: string;
};

/** Admin "WhatsApp ile hatırlat": müşterinin numarasına hazır Türkçe metinli wa.me bağlantısı. */
export function reminderUrl(i: ReminderInput): string {
	const text =
		`Merhaba ${i.customerName}, ${i.salonName} için ${i.day} saat ${i.time} ` +
		`${i.serviceName} randevunuzu hatırlatmak isteriz. ` +
		`Randevunuzu görüntülemek veya iptal etmek için: ${i.manageUrl}`;
	return `https://wa.me/${whatsappDigits(i.phone)}?text=${encodeURIComponent(text)}`;
}
