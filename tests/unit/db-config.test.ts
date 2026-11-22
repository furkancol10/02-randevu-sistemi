import { describe, expect, it } from 'vitest';
import { poolOptions } from '../../src/lib/server/db/client';

describe('poolOptions (serverless + Neon pooler)', () => {
	it('varsayılan: küçük havuz, boşta bağlantı kapanır, prepared statement yok', () => {
		expect(poolOptions({})).toEqual({
			max: 3,
			idle_timeout: 20,
			connect_timeout: 10,
			max_lifetime: 1800,
			prepare: false
		});
	});

	it('ortam değişkenleriyle ayarlanır', () => {
		expect(
			poolOptions({
				DB_POOL_MAX: '6',
				DB_IDLE_TIMEOUT: '5',
				DB_CONNECT_TIMEOUT: '3',
				DB_MAX_LIFETIME: '600'
			})
		).toMatchObject({ max: 6, idle_timeout: 5, connect_timeout: 3, max_lifetime: 600 });
	});

	it('geçersiz/negatif/boş değer varsayılana düşer; prepare her durumda false', () => {
		const o = poolOptions({ DB_POOL_MAX: 'abc', DB_IDLE_TIMEOUT: '-1', DB_CONNECT_TIMEOUT: '' });
		expect(o).toMatchObject({ max: 3, idle_timeout: 20, connect_timeout: 10, prepare: false });
	});
});
