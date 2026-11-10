<script lang="ts">
	import { page } from '$app/state';
	import MobileLobbyPrototype from '#lib/components/mobile-lobby-prototype.svelte';
	import Games from '#lib/components/games.svelte';
	import AppBar from '#lib/components/app-bar.svelte';
	import SignIn from '#lib/components/sign-in.svelte';
	import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
	import { useQuery } from 'convex-svelte';
	import * as m from '#lib/paraglide/messages.js';
	import { api } from '../convex/_generated/api';

	const auth = useAuth();
	const viewer = useQuery(api.players.viewer, () => (auth.isAuthenticated ? {} : 'skip'));
</script>

<svelte:head><title>Yard Bridge</title></svelte:head>

{#if import.meta.env.DEV && page.url.searchParams.has('prototype')}
	<MobileLobbyPrototype />
{:else}
	<main class="flex min-h-svh flex-col items-center gap-6 px-5 py-4">
		<div class="w-full max-w-lg">
			<!-- Sign-in state resets on its own: the form remounts after sign-out. -->
			<AppBar
				signedIn={auth.isAuthenticated}
				email={auth.isAuthenticated ? (viewer.data?.email ?? null) : null}
			/>
		</div>
		<section
			class="flex w-full max-w-lg flex-col gap-6"
			class:pb-52={auth.isAuthenticated && page.url.searchParams.has('game')}
			aria-labelledby="welcome-heading"
		>
			<!-- The app bar shows the wordmark; this names the page for assistive technology. -->
			<h1 id="welcome-heading" class="sr-only">
				{m.auth_welcome()}
			</h1>
			{#if auth.isLoading}
				<p role="status">{m.auth_loading()}</p>
			{:else if auth.isAuthenticated}
				{#if viewer.error}
					<p role="alert">{m.auth_identity_error()}</p>
				{:else if viewer.data}
					<h2 class="sr-only">{m.auth_signed_in()}</h2>
					<Games />
				{:else}
					<p role="status">{m.auth_loading()}</p>
				{/if}
			{:else}
				<SignIn />
			{/if}
		</section>
	</main>
{/if}
