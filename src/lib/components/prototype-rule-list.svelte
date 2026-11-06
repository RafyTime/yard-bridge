<script lang="ts">
	import { Badge } from '#lib/components/ui/badge/index.js';
	import RuleHelp from './prototype-rule-help.svelte';
	import {
		prototypeDefaults,
		ruleDefinitions,
		ruleGroups,
		ruleValue,
		type HelpMode,
		type PrototypeRules
	} from './prototype-rules';
	let { rules, helpMode }: { rules: PrototypeRules; helpMode: HelpMode } = $props();
</script>

<div class="flex flex-col gap-6">
	{#each ruleGroups as group (group)}
		<section aria-label={group} class="flex flex-col gap-2">
			<h3 class="text-sm font-medium text-muted-foreground">{group}</h3>
			<dl class="divide-y">
				{#each ruleDefinitions.filter((rule) => rule.group === group) as definition (definition.key)}
					<RuleHelp {definition} mode={helpMode}>
						{#snippet children(info)}
							<div class="flex min-h-16 items-center justify-between gap-3 py-3">
								<dt class="flex min-w-0 items-center">
									<span class="text-sm font-medium">{definition.label}</span>{@render info()}
								</dt>
								<dd class="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right text-sm">
									<span>{ruleValue(rules, definition.key)}</span
									>{#if rules[definition.key] !== prototypeDefaults[definition.key]}<Badge
											variant="outline">Modified</Badge
										>{/if}
								</dd>
							</div>
						{/snippet}
					</RuleHelp>
				{/each}
			</dl>
		</section>
	{/each}
</div>
