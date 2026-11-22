import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SLUG, ensureDemo } from '../../src/lib/server/demo/seed';
import { appointments, businesses, services } from '../../src/lib/server/db/schema';
import { close, createFixture, db, resetData } from './helpers';

vi.mock('#lib/server/db/index.ts', async () => ({ db: (await import('./helpers')).db }));
const { POST } = await import('../../src/routes/api/demo-reset/+server');

const SECRET = 'test-secret-0123456789';
const call = (headers: Record<string, string> = {}) =>
	POST({
		request: new Request('http://x.test/api/demo-reset', { method: 'POST', headers })
	} as never);

beforeEach(async () => {
	await resetData();
	process.env.DEMO_RESET_SECRET = SECRET;
});
afterAll(close);

describe('POST /api/demo-reset', () => {
	it('secret yok ya da yanlış: 401 ve veri değişmez', async () => {
		await ensureDemo(db);
		await db.delete(appointments); // demo verisini boz
		for (const headers of [
			{} as Record<string, string>,
			{ 'x-demo-reset-secret': 'yanlis' },
			{ 'x-demo-reset-secret': SECRET + 'x' }
		]) {
			expect((await call(headers)).status).toBe(401);
		}
		expect(await db.select().from(appointments)).toHaveLength(0);
	});

	it('sunucuda secret tanımsızken: boş başlıkla bile 401', async () => {
		delete process.env.DEMO_RESET_SECRET;
		expect((await call({ 'x-demo-reset-secret': '' })).status).toBe(401);
		expect((await call()).status).toBe(401);
	});

	it('doğru secret: demo verisi geri gelir, diğer işletmelere dokunulmaz', async () => {
		const other = await createFixture(1, { slug: 'baska-salon' });
		await ensureDemo(db);
		await db.delete(appointments);

		const res = await call({ 'x-demo-reset-secret': SECRET });
		expect(res.status).toBe(200);

		const demo = (await db.select().from(businesses).where(eq(businesses.slug, DEMO_SLUG)))[0];
		expect(
			await db.select().from(appointments).where(eq(appointments.businessId, demo.id))
		).toHaveLength(5);

		const still = await db.select().from(businesses).where(eq(businesses.slug, 'baska-salon'));
		expect(still).toHaveLength(1);
		expect(still[0].id).toBe(other.business.id);
		expect(
			await db.select().from(services).where(eq(services.businessId, other.business.id))
		).toHaveLength(1);
	});
});

describe('ensureDemo (deploy seed)', () => {
	it('demo yoksa kurar; varsa hiçbir şeye dokunmaz', async () => {
		expect(await ensureDemo(db)).toBe(true);
		const [demo] = await db.select().from(businesses).where(eq(businesses.slug, DEMO_SLUG));
		await db.delete(appointments);
		expect(await ensureDemo(db)).toBe(false);
		const [after] = await db.select().from(businesses).where(eq(businesses.slug, DEMO_SLUG));
		expect(after.id).toBe(demo.id);
		expect(await db.select().from(appointments)).toHaveLength(0);
	});
});
