<script lang="ts">
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import type { HelpMode } from './prototype-rules';
	let { value, onchange }: { value: HelpMode; onchange: (value: HelpMode) => void } = $props();
</script>

<div class="flex flex-col gap-2">
	<p class="text-xs text-muted-foreground">Prototype: compare rule explanations</p>
	<ToggleGroup.Root
		type="single"
		{value}
		variant="outline"
		aria-label="Rule help style"
		class="w-full"
		onValueChange={(mode) => {
			if (mode === 'tooltip' || mode === 'inline' || mode === 'drawer') onchange(mode);
		}}
	>
		<ToggleGroup.Item value="tooltip" class="min-h-11 flex-1">Tooltip</ToggleGroup.Item
		><ToggleGroup.Item value="inline" class="min-h-11 flex-1">Expand inline</ToggleGroup.Item
		><ToggleGroup.Item value="drawer" class="min-h-11 flex-1">Help drawer</ToggleGroup.Item>
	</ToggleGroup.Root>
</div>
