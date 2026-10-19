<script lang="ts">
	import { untrack } from 'svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { defaultRules, type RulesConfiguration } from '../../convex/rules';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';

	let { game }: { game: FunctionReturnType<typeof api.games.view> } = $props();
	const client = useConvexClient();
	const isHost = $derived(game.isHost);
	const configurations = useQuery(api.gameRules.saved, () => (isHost ? {} : 'skip'));
	let draft = $state<RulesConfiguration>(untrack(() => ({ ...game.rules })));
	let name = $state('');
	let pending = $state(false);
	let error = $state(false);
	let saved = $state(false);
	const editable = $derived(game.isHost && game.status === 'lobby');
	const reviewed = $derived(game.seats.find((seat) => seat.id === game.viewerSeatId)?.ready);
	const valid = $derived(
		Number.isSafeInteger(draft.scoreCutoff) &&
			draft.scoreCutoff > 0 &&
			Number.isInteger(draft.handSize) &&
			draft.handSize >= 2 &&
			draft.handSize <= 9
	);
	const onOff = (value: boolean) => (value ? m.rules_on() : m.rules_off());
	const ace = (value: RulesConfiguration['aceBehavior']) =>
		value === 'skip' ? m.rules_skip() : m.rules_cancel();
	const starter = (value: RulesConfiguration['starterPolicy']) =>
		value === 'highest-score'
			? m.rules_highest()
			: value === 'previous-starter'
				? m.rules_previous()
				: m.rules_random();
	const settings = $derived([
		{
			key: 'scoreCutoff',
			label: m.games_cutoff(),
			value: String(game.rules.scoreCutoff),
			base: String(defaultRules.scoreCutoff)
		},
		{
			key: 'kingOfSpades',
			label: m.rules_king(),
			value: onOff(game.rules.kingOfSpades),
			base: onOff(defaultRules.kingOfSpades)
		},
		{
			key: 'handSize',
			label: m.games_hand_size(),
			value: String(game.rules.handSize),
			base: String(defaultRules.handSize)
		},
		{
			key: 'openingEffects',
			label: m.rules_opening(),
			value: onOff(game.rules.openingEffects),
			base: onOff(defaultRules.openingEffects)
		},
		{
			key: 'bridgeDeclaration',
			label: m.rules_bridge(),
			value: onOff(game.rules.bridgeDeclaration),
			base: onOff(defaultRules.bridgeDeclaration)
		},
		{
			key: 'aceBehavior',
			label: m.rules_ace(),
			value: ace(game.rules.aceBehavior),
			base: ace(defaultRules.aceBehavior)
		},
		{
			key: 'recycleMultiplier',
			label: m.rules_recycle(),
			value: String(game.rules.recycleMultiplier),
			base: String(defaultRules.recycleMultiplier)
		},
		{
			key: 'starterPolicy',
			label: m.rules_starter(),
			value: starter(game.rules.starterPolicy),
			base: starter(defaultRules.starterPolicy)
		}
	]);
	const changes = $derived(settings.filter((setting) => setting.value !== setting.base));
	async function act(command: () => Promise<unknown>) {
		if (pending) return;
		pending = true;
		error = false;
		saved = false;
		try {
			await command();
		} catch {
			error = true;
		} finally {
			pending = false;
		}
	}
	async function apply(rules: RulesConfiguration) {
		await client.mutation(api.gameRules.update, {
			gameId: game.id,
			expectedVersion: game.version,
			rules
		});
	}
</script>

{#snippet booleanField(key: 'kingOfSpades' | 'openingEffects' | 'bridgeDeclaration', label: string)}
	<Field.Field orientation="horizontal" data-disabled={pending}>
		<Field.FieldContent>
			<Field.FieldLabel for={`rule-${key}`}>{label}</Field.FieldLabel>
			<Field.FieldDescription
				>{m.rules_default({ value: onOff(defaultRules[key]) })}</Field.FieldDescription
			>
		</Field.FieldContent>
		<Switch id={`rule-${key}`} bind:checked={draft[key]} disabled={pending} />
	</Field.Field>
{/snippet}

<section class="flex min-w-0 flex-col gap-5" aria-labelledby="rules-heading">
	<h3 id="rules-heading" class="text-lg font-medium">{m.rules_title()}</h3>
	{#if editable}
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void act(() => apply(draft));
			}}
			aria-busy={pending}
		>
			<Field.FieldGroup>
				<Field.Field
					data-invalid={!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1}
				>
					<Field.FieldLabel for="rule-cutoff">{m.games_cutoff()}</Field.FieldLabel>
					<Input
						class="min-h-11"
						id="rule-cutoff"
						type="number"
						min={1}
						step={1}
						required
						bind:value={draft.scoreCutoff}
						disabled={pending}
						aria-invalid={!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1}
					/>
					<Field.FieldDescription
						>{m.rules_default({ value: String(defaultRules.scoreCutoff) })}</Field.FieldDescription
					>
				</Field.Field>
				{@render booleanField('kingOfSpades', m.rules_king())}
				<Field.Field
					data-invalid={!Number.isInteger(draft.handSize) ||
						draft.handSize < 2 ||
						draft.handSize > 9}
				>
					<Field.FieldLabel for="rule-hand">{m.games_hand_size()}</Field.FieldLabel>
					<Input
						class="min-h-11"
						id="rule-hand"
						type="number"
						min={2}
						max={9}
						step={1}
						required
						bind:value={draft.handSize}
						disabled={pending}
						aria-invalid={!Number.isInteger(draft.handSize) ||
							draft.handSize < 2 ||
							draft.handSize > 9}
						aria-describedby="rule-hand-hint"
					/>
					<Field.FieldDescription id="rule-hand-hint"
						>{m.rules_hand_hint()}
						{m.rules_default({ value: String(defaultRules.handSize) })}</Field.FieldDescription
					>
				</Field.Field>
				<details>
					<summary class="min-h-11 cursor-pointer py-3">{m.rules_advanced()}</summary>
					<Field.FieldGroup>
						{@render booleanField('openingEffects', m.rules_opening())}
						{@render booleanField('bridgeDeclaration', m.rules_bridge())}
						<Field.FieldSet>
							<Field.FieldLegend>{m.rules_ace()}</Field.FieldLegend>
							<ToggleGroup.Root
								type="single"
								variant="outline"
								value={draft.aceBehavior}
								disabled={pending}
								onValueChange={(value) => {
									if (value === 'skip' || value === 'cancel') draft.aceBehavior = value;
								}}
								orientation="vertical"
								aria-label={m.rules_ace()}
							>
								<ToggleGroup.Item value="skip" class="min-h-11 whitespace-normal"
									>{m.rules_skip()}</ToggleGroup.Item
								>
								<ToggleGroup.Item value="cancel" class="min-h-11 whitespace-normal"
									>{m.rules_cancel()}</ToggleGroup.Item
								>
							</ToggleGroup.Root>
							<Field.FieldDescription
								>{m.rules_default({ value: ace(defaultRules.aceBehavior) })}</Field.FieldDescription
							>
						</Field.FieldSet>
						<Field.FieldSet>
							<Field.FieldLegend>{m.rules_recycle()}</Field.FieldLegend>
							<ToggleGroup.Root
								type="single"
								variant="outline"
								value={String(draft.recycleMultiplier)}
								disabled={pending}
								onValueChange={(value) => {
									if (value === '1' || value === '2' || value === '3')
										draft.recycleMultiplier = value === '1' ? 1 : value === '2' ? 2 : 3;
								}}
								aria-label={m.rules_recycle()}
							>
								{#each [1, 2, 3] as value (value)}<ToggleGroup.Item
										value={String(value)}
										class="min-h-11 min-w-11">{value}</ToggleGroup.Item
									>{/each}
							</ToggleGroup.Root>
							<Field.FieldDescription
								>{m.rules_default({
									value: String(defaultRules.recycleMultiplier)
								})}</Field.FieldDescription
							>
						</Field.FieldSet>
						<Field.FieldSet>
							<Field.FieldLegend>{m.rules_starter()}</Field.FieldLegend>
							<ToggleGroup.Root
								type="single"
								variant="outline"
								value={draft.starterPolicy}
								disabled={pending}
								onValueChange={(value) => {
									if (
										value === 'highest-score' ||
										value === 'previous-starter' ||
										value === 'random'
									)
										draft.starterPolicy = value;
								}}
								orientation="vertical"
								aria-label={m.rules_starter()}
							>
								<ToggleGroup.Item value="highest-score" class="min-h-11 whitespace-normal"
									>{m.rules_highest()}</ToggleGroup.Item
								>
								<ToggleGroup.Item value="previous-starter" class="min-h-11 whitespace-normal"
									>{m.rules_previous()}</ToggleGroup.Item
								>
								<ToggleGroup.Item value="random" class="min-h-11 whitespace-normal"
									>{m.rules_random()}</ToggleGroup.Item
								>
							</ToggleGroup.Root>
							<Field.FieldDescription
								>{m.rules_default({
									value: starter(defaultRules.starterPolicy)
								})}</Field.FieldDescription
							>
						</Field.FieldSet>
					</Field.FieldGroup>
				</details>
				<Button class="min-h-11" type="submit" disabled={pending || !valid}
					>{m.rules_apply()}</Button
				>
				<Button
					class="min-h-11"
					variant="outline"
					disabled={pending}
					onclick={() => act(() => apply(defaultRules))}>{m.rules_reset()}</Button
				>
				<Field.FieldDescription>{m.rules_edit_hint()}</Field.FieldDescription>
			</Field.FieldGroup>
		</form>
	{/if}
	<h4 class="font-medium">{m.rules_current()}</h4>
	<dl class="flex flex-col gap-3">
		{#each settings.slice(0, 3) as setting (setting.key)}
			<div>
				<dt>{setting.label}</dt>
				<dd>
					{setting.value}
					<span class="text-muted-foreground">({m.rules_default({ value: setting.base })})</span>
				</dd>
			</div>
		{/each}
	</dl>
	<h4 class="font-medium">{m.rules_changes()}</h4>
	{#if changes.length === 0}<p class="text-muted-foreground">{m.rules_no_changes()}</p>
	{:else}<ul class="flex flex-col gap-2">
			{#each changes as setting (setting.key)}<li>
					{setting.label}: {setting.value}. {m.rules_default({ value: setting.base })}
				</li>{/each}
		</ul>{/if}
	<details>
		<summary class="min-h-11 cursor-pointer py-3">{m.rules_advanced()}</summary>
		<dl class="flex flex-col gap-3">
			{#each settings.slice(3) as setting (setting.key)}<div>
					<dt>{setting.label}</dt>
					<dd>{setting.value}. {m.rules_default({ value: setting.base })}</dd>
				</div>{/each}
		</dl>
	</details>
	<details>
		<summary class="min-h-11 cursor-pointer py-3">{m.rules_base_title()}</summary>
		<ul class="flex flex-col gap-3">
			<li>{m.rules_base_match()}</li>
			<li>{m.rules_base_draw()}</li>
			<li>{m.rules_base_ace()}</li>
			<li>{m.rules_base_score()}</li>
			<li>{m.rules_base_start()}</li>
		</ul>
	</details>
	{#if game.status === 'lobby'}
		{#if reviewed}<p role="status">{m.rules_reviewed()}</p>
		{:else}<Button
				class="min-h-11 whitespace-normal"
				disabled={pending}
				onclick={() =>
					act(() =>
						client.mutation(api.gameRules.ready, { gameId: game.id, expectedVersion: game.version })
					)}>{m.rules_ready()}</Button
			>{/if}
		<p role="status">
			{game.canStart
				? m.rules_table_ready()
				: game.seats.length < 2
					? m.rules_need_players()
					: m.rules_waiting()}
		</p>
	{:else}<p>{m.rules_locked()}</p>{/if}
	{#if editable}
		<details>
			<summary class="min-h-11 cursor-pointer py-3">{m.rules_saved_title()}</summary>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					void act(async () => {
						await client.mutation(api.gameRules.save, {
							gameId: game.id,
							expectedVersion: game.version,
							name
						});
						saved = true;
						name = '';
					});
				}}
			>
				<Field.FieldGroup>
					<Field.Field
						><Field.FieldLabel for="rules-name">{m.rules_preset_name()}</Field.FieldLabel><Input
							id="rules-name"
							class="min-h-11"
							bind:value={name}
							required
							maxlength={80}
							disabled={pending}
						/></Field.Field
					>
					<Button class="min-h-11" type="submit" disabled={pending || !name.trim()}
						>{m.rules_save()}</Button
					>
				</Field.FieldGroup>
			</form>
			{#if saved}<p role="status">{m.rules_saved()}</p>{/if}
			{#if configurations.error}<p role="alert">{m.rules_error()}</p>
			{:else if configurations.data}
				{#if configurations.data.length === 0}<p>{m.rules_saved_empty()}</p>{/if}
				<ul class="mt-3 flex flex-col gap-3">
					{#each configurations.data as configuration (configuration.id)}<li>
							<Button
								class="min-h-11 max-w-full break-all whitespace-normal"
								variant="outline"
								disabled={pending}
								onclick={() => act(() => apply(configuration.rules))}
								>{m.rules_use({ name: configuration.name })}</Button
							>
						</li>{/each}
				</ul>
			{/if}
		</details>
	{/if}
	{#if error}<p role="alert">{m.rules_error()}</p>{/if}
</section>
