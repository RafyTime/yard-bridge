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
	import {
		prototypeDefaults,
		ruleDefinitions,
		ruleValue,
		type PrototypeRules
	} from './prototype-rules';

	let {
		rules,
		pendingRequest,
		onstart
	}: { rules: PrototypeRules; pendingRequest: boolean; onstart: () => void } = $props();
	let open = $state(false);
	const desktop = new MediaQuery('(min-width: 768px)');
	const changed = $derived(
		ruleDefinitions.some(({ key }) => rules[key] !== prototypeDefaults[key])
	);

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
			{#each ruleDefinitions as definition (definition.key)}<dt class="text-muted-foreground">
					{definition.label}
				</dt>
				<dd class="flex max-w-40 flex-col items-end gap-1 text-right">
					<span>{ruleValue(rules, definition.key)}</span
					>{#if rules[definition.key] !== prototypeDefaults[definition.key]}<Badge variant="outline"
							>Modified</Badge
						>{/if}
				</dd>{/each}
		</dl>
		<p class="text-sm text-muted-foreground">
			{changed ? 'Modified settings are marked above.' : 'No changes to the default rules.'}
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
		<Dialog.Content showCloseButton={false} class="max-h-[85svh] overflow-y-auto">
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
			<div class="min-h-0 overflow-y-auto px-4">{@render summary()}</div>
			<Drawer.Footer class="pb-[max(1rem,env(safe-area-inset-bottom))]"
				><Drawer.Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
					>Back to lobby</Drawer.Close
				></Drawer.Footer
			>
		</Drawer.Content>
	</Drawer.Root>
{/if}
