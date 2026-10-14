import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, lazyPlugins } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// Oxlint owns JS/TS correctness; ESLint retains the existing Svelte/TS rules.
	lint: {
		ignorePatterns: ['src/convex/_generated/**', 'src/lib/paraglide/**', 'static/**'],
		rules: { 'no-undef': 'off' },
		// Svelte's named component exports require svelte-check, not tsgolint.
		options: { denyWarnings: true }
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		trailingComma: 'none',
		printWidth: 100,
		sortPackageJson: false,
		sortTailwindcss: {
			stylesheet: './src/routes/layout.css'
		},
		svelte: {},
		ignorePatterns: [
			'package-lock.json',
			'pnpm-lock.yaml',
			'yarn.lock',
			'bun.lock',
			'bun.lockb',
			'/static/',
			'/src/convex/_generated/',
			'/project.inlang/.meta.json',
			'/project.inlang/README.md'
		]
	},
	plugins: lazyPlugins(() => [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),

		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// Static pages and their cached copies must agree on the URL's locale.
			strategy: ['url', 'baseLocale']
		})
	]),
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/convex/**']
				}
			},
			{
				test: {
					name: 'convex',
					environment: 'edge-runtime',
					include: ['src/convex/**/*.test.ts']
				}
			}
		]
	}
});
