<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { SunIcon, Moon02Icon } from '@hugeicons/core-free-icons';
	import { toggleMode } from 'mode-watcher';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../convex/_generated/api';

	const health = useQuery(api.health.check, {});
	const counter = useQuery(api.counter.get, {});
	const client = useConvexClient();
	let incrementing = $state(false);
	let incrementError = $state<string | null>(null);

	async function incrementCounter() {
		incrementing = true;
		incrementError = null;
		try {
			await client.mutation(api.counter.increment, {});
		} catch {
			incrementError = 'Could not save the increment. Check your connection and try again.';
		} finally {
			incrementing = false;
		}
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center space-y-5">
	<h1 class="text-3xl font-bold">Welcome to Yard Bridge</h1>
	{#if health.isLoading}
		<p>Connecting…</p>
	{:else if health.error}
		<p>Could not connect to Convex.</p>
	{:else}
		<p>{health.data}</p>
	{/if}
	<section aria-labelledby="counter-heading" class="flex flex-col items-center gap-3">
		<h2 id="counter-heading" class="text-lg font-medium">Convex connection check</h2>
		<p class="text-muted-foreground">Temporary shared counter. Try it in two tabs.</p>
		{#if counter.isLoading}
			<p>Loading counter…</p>
		{:else if counter.error}
			<p role="alert">Could not load the counter. Check your connection.</p>
		{:else}
			<p>Counter: <output aria-label="Counter value">{counter.data}</output></p>
		{/if}
		<Button
			onclick={incrementCounter}
			disabled={counter.isLoading || !!counter.error || incrementing}
		>
			{incrementing ? 'Saving…' : 'Increment counter'}
		</Button>
		{#if incrementError}
			<p role="alert">{incrementError}</p>
		{/if}
	</section>
	<Button onclick={toggleMode} variant="ghost" size="icon-lg">
		<HugeiconsIcon
			icon={SunIcon}
			class="scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
		/>
		<HugeiconsIcon
			icon={Moon02Icon}
			class="absolute scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
</div>
