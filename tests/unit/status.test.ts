import { describe, expect, it } from 'vitest';
import { statusView } from '../../src/lib/status';

describe('statusView (onay sayfası durumu)', () => {
	it('iptal edilmiş randevu "onaylandı" demez', () => {
		const v = statusView('cancelled', 'Ayşe');
		expect(v.title).toBe('Randevunuz iptal edildi');
		expect(v.tone).toBe('danger');
	});
	it('pending / confirmed', () => {
		expect(statusView('pending', 'Ayşe').title).toBe('Randevu talebiniz alındı');
		expect(statusView('confirmed', 'Ayşe')).toMatchObject({
			title: 'Randevunuz onaylandı',
			tone: 'ok'
		});
	});
});
