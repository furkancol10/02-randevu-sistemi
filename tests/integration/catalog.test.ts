import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getAppointmentByToken } from '../../src/lib/server/booking/catalog';
import { book } from '../../src/lib/server/booking/book';
import { close, createFixture, db, NOW, resetData, SLOT_10 } from './helpers';

beforeEach(resetData);
afterAll(close);

describe('getAppointmentByToken', () => {
	it.each(['-'.repeat(36), '0'.repeat(36), 'g'.repeat(36), '0'.repeat(35) + '-'])(
		'biçimi bozuk token %j: hata fırlatmaz, null döner',
		async (token) => {
			const f = await createFixture(1);
			expect(await getAppointmentByToken(db, f.business.id, token)).toBeNull();
		}
	);

	it('geçerli token kendi işletmesinde bulunur, başka işletmede null', async () => {
		const f = await createFixture(1);
		const r = await book(
			db,
			{
				businessId: f.business.id,
				serviceId: f.service.id,
				resourceId: 'any',
				start: SLOT_10,
				customerName: 'Ayşe',
				customerPhone: '+905321234567'
			},
			NOW
		);
		if (!r.ok) throw new Error('book başarısız');
		const found = await getAppointmentByToken(db, f.business.id, r.appointment.manageToken);
		expect(found?.id).toBe(r.appointment.id);
		expect(
			await getAppointmentByToken(db, f.business.id + 1, r.appointment.manageToken)
		).toBeNull();
	});
});
