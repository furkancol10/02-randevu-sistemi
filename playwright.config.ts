import { defineConfig, devices } from '@playwright/test';

try {
	process.loadEnvFile('.env');
} catch {
	// .env yoksa ortam değişkenleri kullanılır
}

const PORT = 4173;

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	globalSetup: './e2e/global-setup.ts',
	// Tek DB'ye yazan akışlar: sırayla
	workers: 1,
	use: { baseURL: `http://localhost:${PORT}` },
	projects: [
		{
			name: 'mobil-360',
			// 360px genişlik, dokunmatik
			use: { ...devices['Pixel 7'], viewport: { width: 360, height: 740 } }
		}
	],
	webServer: {
		command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: { DATABASE_URL: process.env.DATABASE_URL ?? '' }
	}
});
