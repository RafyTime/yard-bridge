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
