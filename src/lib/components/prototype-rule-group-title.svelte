<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cards01Icon,
		MagicWand01Icon,
		ArrowReloadHorizontalIcon
	} from '@hugeicons/core-free-icons';
	import type { ruleGroups } from './prototype-rules';
	let { group }: { group: (typeof ruleGroups)[number] } = $props();
	const icons = {
		'Dealing and scoring': Cards01Icon,
		'Card effects': MagicWand01Icon,
		'Ending and starting rounds': ArrowReloadHorizontalIcon
	};
</script>

<span class="flex items-center gap-2.5 text-lg font-semibold">
	<HugeiconsIcon
		icon={icons[group]}
		size={20}
		class="shrink-0 text-muted-foreground"
		aria-hidden="true"
	/>
	{group}
</span>
