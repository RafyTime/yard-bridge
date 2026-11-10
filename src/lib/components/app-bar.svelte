<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import AccountMenu from './account-menu.svelte';

	let account: ComponentProps<typeof AccountMenu> = $props();
</script>

<!-- Equal side columns keep the wordmark centred. -->
<header class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
	<div></div>
	<p class="text-center text-3xl font-bold tracking-tight">Yard Bridge</p>
	<div class="flex justify-end"><AccountMenu {...account} /></div>
</header>
