<script lang="ts">
	// Throwaway final review for the host. All start behavior stays in memory.
	import { MediaQuery } from 'svelte/reactivity';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { PlayIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { cn } from '#lib/utils.js';

	let {
		cutoff,
		pendingRequest,
		onstart
	}: { cutoff: string | number; pendingRequest: boolean; onstart: () => void } = $props();
	let open = $state(false);
	const desktop = new MediaQuery('(min-width: 768px)');
	const changed = $derived(Number(cutoff) !== 200);

	function start() {
		if (pendingRequest) return;
		open = false;
		onstart();
	}
</script>

{#snippet trigger()}
	<HugeiconsIcon icon={CheckmarkCircle02Icon} data-icon="inline-start" aria-hidden="true" />Review
	and start
{/snippet}

{#snippet summary()}
	<div class="flex flex-col gap-5">
		<dl class="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-4 text-sm">
			<dt class="text-muted-foreground">Score cutoff</dt>
			<dd class="flex flex-col items-end gap-1">
				<span>{cutoff} points</span>{#if changed}<Badge variant="outline">Changed from 200</Badge
					>{/if}
			</dd>
			<dt class="text-muted-foreground">Cards per hand</dt>
			<dd>5 cards</dd>
			<dt class="text-muted-foreground">Bridge declaration</dt>
			<dd>On</dd>
		</dl>
		<p class="text-sm text-muted-foreground">
			{changed
				? 'The score cutoff differs from the default rules.'
				: 'No changes to the default rules.'}
		</p>
		<div class="flex flex-col gap-3">
			<p role="status" class="text-sm text-muted-foreground">
				{pendingRequest
					? 'Resolve the pending seat request in Players before starting.'
					: 'The other players are ready. Starting confirms you accept these rules.'}
			</p>
			<Button class="min-h-12 w-full" disabled={pendingRequest} onclick={start}
				><HugeiconsIcon icon={PlayIcon} data-icon="inline-start" aria-hidden="true" />Start round</Button
			>
		</div>
	</div>
{/snippet}

{#if desktop.current}
	<Dialog.Root bind:open>
		<Dialog.Trigger class={cn(buttonVariants(), 'min-h-12 w-full')}
			>{@render trigger()}</Dialog.Trigger
		>
		<Dialog.Content showCloseButton={false}>
			<Dialog.Header
				><Dialog.Title>Ready to start?</Dialog.Title><Dialog.Description
					>Check the agreed rules before dealing the first round.</Dialog.Description
				></Dialog.Header
			>
			{@render summary()}
			<Dialog.Footer
				><Dialog.Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
					>Back to lobby</Dialog.Close
				></Dialog.Footer
			>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger class={cn(buttonVariants(), 'min-h-12 w-full')}
			>{@render trigger()}</Drawer.Trigger
		>
		<Drawer.Content>
			<Drawer.Header
				><Drawer.Title>Ready to start?</Drawer.Title><Drawer.Description
					>Check the agreed rules before dealing the first round.</Drawer.Description
				></Drawer.Header
			>
			<div class="overflow-y-auto px-4">{@render summary()}</div>
			<Drawer.Footer class="pb-[max(1rem,env(safe-area-inset-bottom))]"
				><Drawer.Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
					>Back to lobby</Drawer.Close
				></Drawer.Footer
			>
		</Drawer.Content>
	</Drawer.Root>
{/if}
