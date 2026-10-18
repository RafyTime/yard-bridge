import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	forbidOnly: !!process.env.CI,
	use: { trace: 'retain-on-failure' },
	// test:e2e builds first; this server always previews that build.
	webServer: { command: 'bun run preview --host 127.0.0.1 --port 4173 --strictPort', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}',
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
		{ name: 'pixel-auth', testMatch: '**/tests/auth.e2e.ts', use: { ...devices['Pixel 7'] } },
		{ name: 'firefox-auth', testMatch: '**/tests/auth.e2e.ts', use: { browserName: 'firefox' } },
		{ name: 'iphone-auth', testMatch: '**/tests/auth.e2e.ts', use: { ...devices['iPhone 13'] } }
	]
});
