import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { seedVertical } from '../../scripts/seed';
import {
	admins,
	appointments,
	businesses,
	resources,
	services
} from '../../src/lib/server/db/schema';
import { getVertical } from '../../src/lib/verticals';
import { close, db, resetData } from './helpers';

beforeEach(resetData);
afterAll(close);

describe('seedVertical atomik (#12)', () => {
	it('yarıda hata verirse eski demo veri korunur', async () => {
		const good = getVertical('kuafor');
		await seedVertical(db, 'kuafor');
		const slug = good.seed.business.slug;
		const before = await db.select().from(businesses).where(eq(businesses.slug, slug));
		expect(before).toHaveLength(1);

		// Hizmet anahtarı eşleşmeyen bozuk şablon
		const bad = structuredClone(good);
		bad.seed.resources[0].services = ['olmayan-anahtar'];
		await expect(seedVertical(db, bad)).rejects.toThrow();

		const after = await db.select().from(businesses).where(eq(businesses.slug, slug));
		expect(after).toHaveLength(1);
		expect(after[0].id).toBe(before[0].id); // silinip yeniden yazılmadı
		expect((await db.select().from(services)).length).toBeGreaterThan(0);
		expect((await db.select().from(resources)).length).toBeGreaterThan(0);
	});
});

describe('seedDemoAppointments', () => {
	it('admin panelini dolduran 5 kurgusal randevu; ikisi onay bekliyor; yönetici demo hesabı var', async () => {
		const { seedDemoAppointments } = await import('../../scripts/seed');
		const business = await seedVertical(db, 'kuafor');
		await seedDemoAppointments(db, business.slug, new Date('2026-11-20T06:00:00Z'));
		const rows = await db.select().from(appointments);
		expect(rows).toHaveLength(5);
		expect(rows.filter((r) => r.status === 'pending')).toHaveLength(2);
		const [admin] = await db.select().from(admins);
		expect(admin).toMatchObject({ businessId: business.id, email: 'demo@zumrutmakas.example' });
	});
});
