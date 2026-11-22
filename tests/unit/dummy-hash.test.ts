import { hash, verify } from '@node-rs/argon2';
import { describe, expect, it } from 'vitest';
import { DUMMY_HASH } from '../../src/lib/server/auth/password';

const params = (h: string) => h.split('$').slice(1, 4).join('$'); // argon2id$v=19$m=…,t=…,p=…

describe('DUMMY_HASH (olmayan kullanıcı yolu, Neon #6)', () => {
	it('sabit bir değerdir: istek anında hash üretilmez (soğuk başlangıçta 2x süre yok)', () => {
		expect(typeof DUMMY_HASH).toBe('string');
	});
	it('gerçek şifre özetiyle aynı argon2 maliyet parametrelerini kullanır (süre eşit)', async () => {
		expect(params(DUMMY_HASH)).toBe(params(await hash('baska-sifre')));
	});
	it('geçerli bir özettir: verify hata fırlatmadan false döner (kısa devre yok)', async () => {
		await expect(verify(DUMMY_HASH, 'herhangi-bir-sifre')).resolves.toBe(false);
	});
});
