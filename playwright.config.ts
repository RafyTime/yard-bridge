import { defineConfig } from '@playwright/test';

export default defineConfig({
	forbidOnly: !!process.env.CI,
	use: { trace: 'retain-on-failure' },
	// test:e2e builds first; this server always previews that build.
	webServer: { command: 'bun run preview --host 127.0.0.1 --port 4173 --strictPort', port: 4173 },
	testMatch: '**/*.e2e.{ts,js}'
});
