<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { InformationCircleIcon } from '@hugeicons/core-free-icons';
	import { buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Tooltip from '#lib/components/ui/tooltip/index.js';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { cn } from '#lib/utils.js';
	import type { HelpMode, RuleDefinition } from './prototype-rules';
	let {
		definition,
		mode,
		nested = false,
		children: row
	}: {
		definition: RuleDefinition;
		mode: HelpMode;
		nested?: boolean;
		children: Snippet<[Snippet]>;
	} = $props();
	let open = $state(false);
	$effect(() => {
		if (mode) open = false;
	});
	const DrawerRoot = $derived(nested ? Drawer.NestedRoot : Drawer.Root);
	const triggerClass = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 shrink-0');
</script>

{#snippet icon()}<HugeiconsIcon icon={InformationCircleIcon} aria-hidden="true" />{/snippet}
{#snippet explanation()}
	<div class="flex flex-col gap-3 text-sm">
		<p>{definition.description}</p>
		<p class="text-muted-foreground">{definition.example}</p>
	</div>
{/snippet}

{#snippet inlineTrigger()}<Collapsible.Trigger
		class={triggerClass}
		aria-label="About {definition.label}">{@render icon()}</Collapsible.Trigger
	>{/snippet}
{#snippet tooltipTrigger()}<Tooltip.Trigger
		class={triggerClass}
		aria-label="About {definition.label}"
		onclick={() => (open = !open)}>{@render icon()}</Tooltip.Trigger
	>{/snippet}
{#snippet drawerTrigger()}<Drawer.Trigger class={triggerClass} aria-label="About {definition.label}"
		>{@render icon()}</Drawer.Trigger
	>{/snippet}

{#key mode}
	{#if mode === 'inline'}
		<Collapsible.Root>
			{@render row(inlineTrigger)}

			<Collapsible.Content><div class="pb-4 pl-1">{@render explanation()}</div></Collapsible.Content
			>
		</Collapsible.Root>
	{:else if mode === 'tooltip'}
		<Tooltip.Provider delayDuration={150}>
			<Tooltip.Root bind:open disableCloseOnTriggerClick>
				{@render row(tooltipTrigger)}

				<Tooltip.Content side="top" sideOffset={8} class="max-w-[min(20rem,calc(100vw-2rem))]"
					><div class="flex flex-col gap-2">
						<p>{definition.description}</p>
						<p>{definition.example}</p>
					</div></Tooltip.Content
				>
			</Tooltip.Root>
		</Tooltip.Provider>
	{:else}
		<DrawerRoot bind:open>
			{@render row(drawerTrigger)}

			<Drawer.Content>
				<Drawer.Header
					><Drawer.Title>{definition.label}</Drawer.Title><Drawer.Description
						>How this rule works</Drawer.Description
					></Drawer.Header
				>
				<div class="mx-auto w-full max-w-lg overflow-y-auto px-4">{@render explanation()}</div>
				<Drawer.Footer
					><Drawer.Close class={cn(buttonVariants({ variant: 'outline' }), 'min-h-11')}
						>Got it</Drawer.Close
					></Drawer.Footer
				>
			</Drawer.Content>
		</DrawerRoot>
	{/if}
{/key}
