import type { VerticalConfig } from './types';

// Tüm veriler kurgusaldır; gerçek bir işletmeyle ilgisi yoktur.
const weekdayHours = [
	{ start: '09:30', end: '13:00' },
	{ start: '14:00', end: '19:30' }
];

export const kuafor: VerticalConfig = {
	id: 'kuafor',
	terms: {
		resource: 'Personel',
		resourceAny: 'Fark etmez',
		service: 'Hizmet',
		appointment: 'randevu'
	},
	resourceKind: 'personel',
	slotStepMin: 15,
	requiresApproval: false,
	maxAdvanceDays: 30,
	accent: '#be185d',
	seed: {
		business: {
			slug: 'demo-kuafor',
			name: 'Zümrüt Makas Kuaför',
			phone: '905551234567',
			address: 'Örnek Mah. Deneme Sok. No:5, Kadıköy / İstanbul'
		},
		services: [
			{ key: 'kadin-kesim', name: 'Kadın Saç Kesimi', durationMin: 60, priceKurus: 45000 },
			{ key: 'erkek-kesim', name: 'Erkek Saç Kesimi', durationMin: 30, priceKurus: 25000 },
			{ key: 'sakal', name: 'Sakal Tıraşı', durationMin: 20, priceKurus: 12000 },
			{ key: 'fon', name: 'Fön', durationMin: 30, priceKurus: 20000 },
			{ key: 'boya', name: 'Saç Boyama', durationMin: 120, priceKurus: 120000, bufferMin: 15 },
			{ key: 'manikur', name: 'Manikür', durationMin: 45, priceKurus: 30000 }
		],
		resources: [
			{ name: 'Ayşe', services: ['kadin-kesim', 'fon', 'boya', 'manikur'] },
			{ name: 'Mehmet', services: ['erkek-kesim', 'sakal', 'fon'], offDays: [1] },
			{ name: 'Elif', services: ['kadin-kesim', 'fon', 'boya', 'manikur'], offDays: [3] }
		],
		// Pazar kapalı; öğle arası 13:00-14:00
		hours: {
			1: weekdayHours,
			2: weekdayHours,
			3: weekdayHours,
			4: weekdayHours,
			5: weekdayHours,
			6: weekdayHours
		}
	}
};
