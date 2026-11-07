<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Settings02Icon } from '@hugeicons/core-free-icons';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { cn } from '#lib/utils.js';
	import RuleHelp from './prototype-rule-help.svelte';
	import {
		prototypeDefaults,
		ruleDefinitions,
		ruleGroups,
		type PrototypeRules
	} from './prototype-rules';

	let {
		rules,
		onsave
	}: {
		rules: PrototypeRules;
		onsave: (rules: PrototypeRules) => void;
	} = $props();
	let open = $state(false);
	let draft = $state<PrototypeRules>({ ...prototypeDefaults });
	const desktop = new MediaQuery('(min-width: 768px)');
	const valid = $derived(
		Number.isSafeInteger(draft.scoreCutoff) &&
			draft.scoreCutoff > 0 &&
			Number.isInteger(draft.handSize) &&
			draft.handSize >= 2 &&
			draft.handSize <= 9
	);
	function begin() {
		draft = { ...rules };
	}
	function save() {
		if (!valid) return;
		onsave({ ...draft });
		open = false;
	}
</script>

{#snippet trigger()}<HugeiconsIcon
		icon={Settings02Icon}
		data-icon="inline-start"
		aria-hidden="true"
	/>Edit table rules{/snippet}
{#snippet fields()}
	<Field.FieldGroup>
		{#each ruleGroups as group (group)}
			<Field.FieldSet
				><Field.FieldLegend>{group}</Field.FieldLegend><Field.FieldGroup class="gap-0 divide-y">
					{#each ruleDefinitions.filter((rule) => rule.group === group) as definition (definition.key)}
						<RuleHelp {definition}>
							{#snippet children(info)}
								<Field.Field
									class="py-4"
									data-invalid={(definition.key === 'scoreCutoff' &&
										(!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1)) ||
										(definition.key === 'handSize' &&
											(!Number.isInteger(draft.handSize) ||
												draft.handSize < 2 ||
												draft.handSize > 9))}
								>
									<div class="flex items-center justify-between gap-2">
										<Field.FieldLabel for="edit-{definition.key}"
											>{definition.label}</Field.FieldLabel
										>{@render info()}
									</div>
									{#if definition.key === 'scoreCutoff'}
										<Input
											id="edit-scoreCutoff"
											type="number"
											min={1}
											step={1}
											required
											bind:value={draft.scoreCutoff}
											class="min-h-12"
											aria-invalid={!Number.isSafeInteger(draft.scoreCutoff) ||
												draft.scoreCutoff < 1}
										/>
									{:else if definition.key === 'handSize'}
										<Input
											id="edit-handSize"
											type="number"
											min={2}
											max={9}
											step={1}
											required
											bind:value={draft.handSize}
											class="min-h-12"
											aria-invalid={!Number.isInteger(draft.handSize) ||
												draft.handSize < 2 ||
												draft.handSize > 9}
										/>
									{:else if definition.key === 'kingOfSpades' || definition.key === 'openingEffects' || definition.key === 'bridgeDeclaration'}
										<div class="flex min-h-11 items-center justify-between px-3">
											<span class="text-sm text-muted-foreground"
												>{draft[definition.key] ? 'On' : 'Off'}</span
											><Switch id="edit-{definition.key}" bind:checked={draft[definition.key]} />
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
								</Field.Field>
							{/snippet}
						</RuleHelp>
					{/each}
				</Field.FieldGroup></Field.FieldSet
			>
		{/each}
	</Field.FieldGroup>
{/snippet}

{#snippet actions()}
	<div class="flex flex-col gap-2">
		<p class="text-xs text-muted-foreground">
			{valid
				? 'Saving changes clears readiness. Nothing changes until you save.'
				: 'Use a positive whole-number cutoff and 2 to 9 cards per hand.'}
		</p>
		<div class="flex gap-3">
			<Button variant="outline" class="min-h-12 flex-1" onclick={() => (open = false)}
				>Cancel</Button
			><Button class="min-h-12 flex-1" disabled={!valid} onclick={save}>Save rules</Button>
		</div>
	</div>
{/snippet}

{#if desktop.current}
	<Dialog.Root bind:open
		><Dialog.Trigger
			class={cn(buttonVariants({ variant: 'outline' }), 'min-h-12 w-full')}
			onclick={begin}>{@render trigger()}</Dialog.Trigger
		>
		<Dialog.Content showCloseButton={false} class="flex max-h-[85svh] flex-col sm:max-w-xl">
			<Dialog.Header
				><Dialog.Title>Edit table rules</Dialog.Title><Dialog.Description
					>Choose the rules everyone at the table will play by.</Dialog.Description
				></Dialog.Header
			>
			<div class="min-h-0 flex-1 overflow-y-auto pr-2">
				{@render fields()}
			</div>
			<Dialog.Footer class="shrink-0">{@render actions()}</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open
		><Drawer.Trigger
			class={cn(buttonVariants({ variant: 'outline' }), 'min-h-12 w-full')}
			onclick={begin}>{@render trigger()}</Drawer.Trigger
		>
		<Drawer.Content
			class="h-[calc(100svh-1rem)] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[calc(100svh-1rem)]"
		>
			<Drawer.Header class="shrink-0"
				><Drawer.Title>Edit table rules</Drawer.Title><Drawer.Description
					>Choose the rules everyone at the table will play by.</Drawer.Description
				></Drawer.Header
			>
			<div class="min-h-0 flex-1 overflow-y-auto px-4">
				{@render fields()}
			</div>
			<Drawer.Footer class="shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
				>{@render actions()}</Drawer.Footer
			>
		</Drawer.Content>
	</Drawer.Root>
{/if}
