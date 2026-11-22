export type ServiceSeed = {
	key: string;
	name: string;
	durationMin: number;
	priceKurus: number;
	bufferMin?: number;
};

export type ResourceSeed = {
	name: string;
	/** Yaptığı hizmetler (ServiceSeed.key) */
	services: string[];
	/** Haftalık program dışı kapalı günler (0=Pazar … 6=Cumartesi) */
	offDays?: number[];
};

export type VerticalConfig = {
	id: 'kuafor' | 'klinik' | 'diyetisyen' | 'halisaha';
	/** Arayüz terimleri */
	terms: {
		resource: string; // "Personel"
		resourceAny: string; // "Fark etmez"
		service: string; // "Hizmet"
		appointment: string; // "randevu"
	};
	resourceKind: string;
	slotStepMin: number;
	/** true → randevu `pending` başlar, admin onaylar */
	requiresApproval: boolean;
	/** Kaç gün sonrasına randevu alınabilir */
	maxAdvanceDays: number;
	/** Müşteri, randevudan en geç kaç saat önce iptal edebilir (admin iptali bundan etkilenmez) */
	cancelWindowHours: number;
	accent: string;
	seed: {
		business: { slug: string; name: string; phone: string; address: string };
		services: ServiceSeed[];
		resources: ResourceSeed[];
		/** Hafta günü → çalışma aralıkları (yerel "HH:mm") */
		hours: Record<number, { start: string; end: string }[]>;
	};
};
