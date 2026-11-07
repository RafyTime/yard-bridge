<script lang="ts">
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { cn } from '#lib/utils.js';
	import RuleHelp from './prototype-rule-help.svelte';
	import RuleGroupTitle from './prototype-rule-group-title.svelte';
	import { ruleDefinitions, ruleGroups, type PrototypeRules } from './prototype-rules';
	let { draft = $bindable() }: { draft: PrototypeRules } = $props();
</script>

<Field.FieldGroup>
	{#each ruleGroups as group (group)}
		<Field.FieldSet
			><Field.FieldLegend><RuleGroupTitle {group} /></Field.FieldLegend><Field.FieldGroup
				class="gap-0 divide-y"
			>
				{#each ruleDefinitions.filter((rule) => rule.group === group) as definition (definition.key)}
					{@const compact =
						definition.key === 'scoreCutoff' ||
						definition.key === 'handSize' ||
						typeof draft[definition.key] === 'boolean'}
					<RuleHelp {definition}>
						{#snippet children(info)}
							<Field.Field
								orientation={compact ? 'horizontal' : 'vertical'}
								class={cn(
									'py-3',
									compact && 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2'
								)}
								data-invalid={(definition.key === 'scoreCutoff' &&
									(!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1)) ||
									(definition.key === 'handSize' &&
										(!Number.isInteger(draft.handSize) ||
											draft.handSize < 2 ||
											draft.handSize > 9))}
							>
								<div class="flex min-w-0 items-center">
									<Field.FieldLabel for="edit-{definition.key}"
										><span class="text-sm">{definition.label}</span></Field.FieldLabel
									>{@render info()}
								</div>
								{#if definition.key === 'scoreCutoff'}
									<Input
										id="edit-scoreCutoff"
										type="number"
										min={1}
										step={1}
										inputmode="numeric"
										required
										bind:value={draft.scoreCutoff}
										class="min-h-12 w-20"
										aria-invalid={!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1}
									/>
								{:else if definition.key === 'handSize'}
									<Input
										id="edit-handSize"
										type="number"
										min={2}
										max={9}
										inputmode="numeric"
										step={1}
										required
										bind:value={draft.handSize}
										class="min-h-12 w-20"
										aria-invalid={!Number.isInteger(draft.handSize) ||
											draft.handSize < 2 ||
											draft.handSize > 9}
									/>
								{:else if definition.key === 'kingOfSpades' || definition.key === 'openingEffects' || definition.key === 'bridgeDeclaration'}
									<div class="flex min-h-12 items-center px-3">
										<Switch id="edit-{definition.key}" bind:checked={draft[definition.key]} />
									</div>
								{:else if definition.key === 'aceBehavior'}
									<ToggleGroup.Root
										id="edit-aceBehavior"
										type="single"
										value={draft.aceBehavior}
										variant="outline"
										aria-label="Ace behavior"
										class="w-full"
										onValueChange={(value) => {
											if (value === 'skip' || value === 'cancel') draft.aceBehavior = value;
										}}
										><ToggleGroup.Item value="skip" class="min-h-12 flex-1 whitespace-normal"
											>Skip next player</ToggleGroup.Item
										><ToggleGroup.Item value="cancel" class="min-h-12 flex-1 whitespace-normal"
											>Cancel effect</ToggleGroup.Item
										></ToggleGroup.Root
									>
								{:else if definition.key === 'recycleMultiplier'}
									<ToggleGroup.Root
										id="edit-recycleMultiplier"
										type="single"
										value={String(draft.recycleMultiplier)}
										variant="outline"
										aria-label="Recycle multiplier"
										class="w-full"
										onValueChange={(value) => {
											if (value === '1' || value === '2' || value === '3')
												draft.recycleMultiplier = value === '1' ? 1 : value === '2' ? 2 : 3;
										}}
										>{#each [1, 2, 3] as value (value)}<ToggleGroup.Item
												value={String(value)}
												class="min-h-12 flex-1">×{value}</ToggleGroup.Item
											>{/each}</ToggleGroup.Root
									>
								{:else}
									<ToggleGroup.Root
										id="edit-starterPolicy"
										type="single"
										value={draft.starterPolicy}
										variant="outline"
										aria-label="Later-round starter"
										orientation="vertical"
										class="w-full"
										onValueChange={(value) => {
											if (
												value === 'highest-score' ||
												value === 'previous-starter' ||
												value === 'random'
											)
												draft.starterPolicy = value;
										}}
										><ToggleGroup.Item value="highest-score" class="min-h-12 w-full"
											>Highest score</ToggleGroup.Item
										><ToggleGroup.Item value="previous-starter" class="min-h-12 w-full"
											>Previous starter</ToggleGroup.Item
										><ToggleGroup.Item value="random" class="min-h-12 w-full"
											>Random</ToggleGroup.Item
										></ToggleGroup.Root
									>
								{/if}
								{#if definition.key === 'scoreCutoff' && (!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1)}
									<Field.FieldError class="col-span-2"
										>Enter a positive whole number.</Field.FieldError
									>
								{:else if definition.key === 'handSize' && (!Number.isInteger(draft.handSize) || draft.handSize < 2 || draft.handSize > 9)}
									<Field.FieldError class="col-span-2"
										>Choose between 2 and 9 cards.</Field.FieldError
									>
								{/if}
							</Field.Field>
						{/snippet}
					</RuleHelp>
				{/each}
			</Field.FieldGroup></Field.FieldSet
		>
	{/each}
</Field.FieldGroup>
