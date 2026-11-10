<script lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import AccountMenu from './account-menu.svelte';

	let {
		start,
		...account
	}: ComponentProps<typeof AccountMenu> & {
		/** Optional control on the left, such as a way back. */
		start?: Snippet;
	} = $props();
</script>

<!-- Equal side columns keep the wordmark centred whatever sits beside it. -->
<header class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
	<div class="flex min-w-0 justify-start">{@render start?.()}</div>
	<p class="text-center text-3xl font-bold tracking-tight">Yard Bridge</p>
	<div class="flex justify-end"><AccountMenu {...account} /></div>
</header>
