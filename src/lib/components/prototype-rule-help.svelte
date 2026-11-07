<script lang="ts">
	import type { Snippet } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { InformationCircleIcon } from '@hugeicons/core-free-icons';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import type { RuleDefinition } from './prototype-rules';
	let { definition, children: row }: { definition: RuleDefinition; children: Snippet<[Snippet]> } =
		$props();
</script>

{#snippet info()}
	<Collapsible.Trigger
		class="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		aria-label="About {definition.label}"
	>
		<HugeiconsIcon icon={InformationCircleIcon} size={14} aria-hidden="true" />
	</Collapsible.Trigger>
{/snippet}

<Collapsible.Root>
	{@render row(info)}
	<Collapsible.Content class="prototype-rule-explanation overflow-hidden">
		<div class="flex flex-col gap-3 pb-4 pl-1 text-sm">
			<p>{definition.description}</p>
			<p class="text-muted-foreground">{definition.example}</p>
		</div>
	</Collapsible.Content>
</Collapsible.Root>

<style>
	:global(.prototype-rule-explanation[data-state='open']) {
		animation: rule-help-open 180ms ease-out;
	}
	:global(.prototype-rule-explanation[data-state='closed']) {
		animation: rule-help-close 140ms ease-in;
	}
	@keyframes rule-help-open {
		from {
			height: 0;
			opacity: 0;
		}
		to {
			height: var(--bits-collapsible-content-height);
			opacity: 1;
		}
	}
	@keyframes rule-help-close {
		from {
			height: var(--bits-collapsible-content-height);
			opacity: 1;
		}
		to {
			height: 0;
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.prototype-rule-explanation[data-state='open']),
		:global(.prototype-rule-explanation[data-state='closed']) {
			animation: none;
		}
	}
</style>
