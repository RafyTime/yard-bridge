# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.17.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:static" paraglide="languageTags:en, es, uk+demo:yes" --install bun ./
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Convex connection check

Convex functions live in `src/convex/`. Run `bunx convex dev` while changing backend
code to sync it to your development deployment and regenerate the API types.
Run `bun run dev` in another terminal for the frontend. Frontend-only work can use
the already-running hosted deployment without the Convex watcher.

Set `PUBLIC_CONVEX_URL` in the ignored `.env.local` to your development deployment's
`.convex.cloud` URL. The frontend connects through `setupConvex` in the root layout.
That public URL is embedded in the static build; build each environment with its
own URL. Keep deployment credentials out of public environment variables.

The homepage has a temporary shared counter to verify the connection:

1. Open the homepage in two tabs and wait for the counter to load.
2. Click Increment counter in either tab. Both values should update.
3. Reload a tab. The saved count should remain.

`schema.ts` defines the `smokeCounters` table. `counter.increment` reads and writes
the count in one transaction. `counter.get` is the live query used by the page.
These demo endpoints are unauthenticated and intended for development. Remove the
counter, its table, and its smoke tests before the production release. They are not
the authorization pattern for Game commands. The demo copy is English only.

Run the isolated backend test with:

```sh
bun run test:unit --run --project convex
```

The browser smoke test is opt-in because it writes two increments to the configured
deployment. Use your development URL only. In PowerShell:

```powershell
$env:RUN_CONVEX_SMOKE = '1'
bunx playwright test tests/convex-counter.e2e.ts
Remove-Item Env:RUN_CONVEX_SMOKE
```

The browser test builds the static app, verifies two-tab updates, and reloads to
check persistence. Ordinary browser test runs skip this live backend check.

## PWA baseline

The web app manifest uses the Railway domain's root path and standalone display mode.
Temporary PNG icons include 192px and 512px app icons, a maskable icon, and an
180px Apple touch icon. Their editable source is `static/icons/icon.svg`. Regenerate
the PNGs on Windows with `powershell -File scripts/generate-pwa-icons.ps1` after
updating the script's matching geometry.

SvelteKit builds and registers `src/service-worker.ts` automatically in production.
It precaches build assets, static files, and prerendered pages, including generated
language variants. It serves those files from a cache specific to the build.
Paraglide chooses the locale from the URL, with English at `/`, Spanish at `/es`,
and Ukrainian at `/uk`, so cached pages have the same language as their URLs.
Backend requests and unknown routes use the network. This baseline does not store
Game data or queue offline commands.

To check the production behavior:

1. Run `bun run build`, then `bun run preview`.
2. Open the preview URL while online. In browser developer tools, check the manifest
   and wait for the service worker to activate.
3. Set the browser offline and reload. The app shell should still render. Also try
   a language variant or another prerendered page.
4. Restore the connection and test installation on the deployed HTTPS URL.
   On iPhone, use Safari's Add to Home Screen action.

Service workers require HTTPS or localhost. A new worker waits until tabs using
the previous worker close before activating, keeping cached HTML and assets from
the same build. Close all app tabs and reopen to use a waiting update. Clear site
data in developer tools if you want a fresh installation during testing.
