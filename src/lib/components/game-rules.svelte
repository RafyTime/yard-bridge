<script lang="ts">
	import { untrack } from 'svelte';
	import type { Snippet } from 'svelte';
	import * as Collapsible from '#lib/components/ui/collapsible/index.js';
	import { desktop } from '#lib/media.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import GameRound from './game-round.svelte';
	import RuleHelp from './rule-help.svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Cards01Icon,
		MagicWand01Icon,
		ArrowReloadHorizontalIcon,
		BookOpen01Icon,
		Bookmark01Icon
	} from '@hugeicons/core-free-icons';
	import type { FunctionReturnType } from 'convex/server';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import { defaultRules, type RulesConfiguration } from '../../convex/rules';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import { cn } from '#lib/utils.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';

	let {
		game,
		panel = 'rules',
		players
	}: {
		game: FunctionReturnType<typeof api.games.view>;
		panel?: 'players' | 'rules';
		players?: Snippet;
	} = $props();
	let reviewOpen = $state(false);
	const changedCount = $derived(
		Object.keys(defaultRules).filter(
			(key) => draft[key as keyof RulesConfiguration] !== baseline[key as keyof RulesConfiguration]
		).length
	);
	const client = useConvexClient();
	const isHost = $derived(game.isHost);
	const configurations = useQuery(api.gameRules.saved, () => (isHost ? {} : 'skip'));
	let draft = $state<RulesConfiguration>(untrack(() => ({ ...game.rules })));
	let baseline = $state<RulesConfiguration>(untrack(() => ({ ...game.rules })));
	let conflicted = $state(false);
	let applying = $state(false);
	const equalRules = (left: RulesConfiguration, right: RulesConfiguration) =>
		Object.keys(defaultRules).every(
			(key) => left[key as keyof RulesConfiguration] === right[key as keyof RulesConfiguration]
		);
	const dirty = $derived(!equalRules(draft, baseline));
	// Only applied-rule changes affect the draft; Seat updates retain all editor input.
	$effect(() => {
		const incoming = game.rules;
		if (applying) return;
		untrack(() => {
			if (equalRules(incoming, baseline)) return;
			if (!dirty && !conflicted) {
				baseline = { ...incoming };
				draft = { ...incoming };
			} else conflicted = true;
		});
	});
	function loadLatest() {
		baseline = { ...game.rules };
		draft = { ...game.rules };
		conflicted = false;
		error = false;
	}
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
			help: m.rules_help_scoreCutoff(),
			label: m.games_cutoff(),
			value: String(game.rules.scoreCutoff),
			base: String(defaultRules.scoreCutoff)
		},
		{
			key: 'kingOfSpades',
			help: m.rules_help_kingOfSpades(),
			label: m.rules_king(),
			value: onOff(game.rules.kingOfSpades),
			base: onOff(defaultRules.kingOfSpades)
		},
		{
			key: 'handSize',
			help: m.rules_help_handSize(),
			label: m.games_hand_size(),
			value: String(game.rules.handSize),
			base: String(defaultRules.handSize)
		},
		{
			key: 'openingEffects',
			help: m.rules_help_openingEffects(),
			label: m.rules_opening(),
			value: onOff(game.rules.openingEffects),
			base: onOff(defaultRules.openingEffects)
		},
		{
			key: 'bridgeDeclaration',
			help: m.rules_help_bridgeDeclaration(),
			label: m.rules_bridge(),
			value: onOff(game.rules.bridgeDeclaration),
			base: onOff(defaultRules.bridgeDeclaration)
		},
		{
			key: 'aceBehavior',
			help: m.rules_help_aceBehavior(),
			label: m.rules_ace(),
			value: ace(game.rules.aceBehavior),
			base: ace(defaultRules.aceBehavior)
		},
		{
			key: 'recycleMultiplier',
			help: m.rules_help_recycleMultiplier(),
			label: m.rules_recycle(),
			value: String(game.rules.recycleMultiplier),
			base: String(defaultRules.recycleMultiplier)
		},
		{
			key: 'starterPolicy',
			help: m.rules_help_starterPolicy(),
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
	async function apply() {
		if (conflicted || !valid) return;
		const rules = { ...draft };
		applying = true;
		try {
			await client.mutation(api.gameRules.update, {
				gameId: game.id,
				expectedVersion: game.version,
				rules
			});
			baseline = rules;
			draft = { ...rules };
			conflicted = false;
		} finally {
			applying = false;
		}
	}
</script>

{#snippet readyAction()}
	{#if reviewed}{#if game.isHost}<p class="text-sm text-muted-foreground">
				{m.rules_reviewed()}
			</p>{/if}
	{:else}<Button
			class="min-h-12 w-full whitespace-normal"
			disabled={pending || dirty || conflicted}
			onclick={() =>
				act(() =>
					client.mutation(api.gameRules.ready, { gameId: game.id, expectedVersion: game.version })
				)}>{m.rules_ready()}</Button
		>{/if}
{/snippet}

{#snippet review()}
	<!-- Phones get a bottom drawer, wider screens a dialog; both share the same contents. -->
	{#if desktop.current}<Dialog.Root bind:open={reviewOpen}
			><Dialog.Trigger class={cn(buttonVariants(), 'min-h-12 w-full')}
				>{m.rules_review_start()}</Dialog.Trigger
			><Dialog.Content showCloseButton={false} class="flex max-h-[85svh] flex-col"
				><Dialog.Header
					><Dialog.Title>{m.rules_current()}</Dialog.Title><Dialog.Description
						>{m.rules_review_description()}</Dialog.Description
					></Dialog.Header
				>
				<div class="-mx-4 min-h-0 overflow-y-auto px-4">{@render reviewSummary()}</div>
				{@render reviewActions(Dialog.Close)}</Dialog.Content
			></Dialog.Root
		>
	{:else}<Drawer.Root bind:open={reviewOpen} autoFocus
			><Drawer.Trigger class={cn(buttonVariants(), 'min-h-12 w-full')}
				>{m.rules_review_start()}</Drawer.Trigger
			><Drawer.Content
				><Drawer.Header
					><Drawer.Title>{m.rules_current()}</Drawer.Title><Drawer.Description
						>{m.rules_review_description()}</Drawer.Description
					></Drawer.Header
				>
				<div class="min-h-0 flex-1 overflow-y-auto px-4">{@render reviewSummary()}</div>
				<div class="border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
					{@render reviewActions(Drawer.Close)}
				</div></Drawer.Content
			></Drawer.Root
		>{/if}
{/snippet}

{#snippet reviewSummary()}
	<dl class="flex flex-col divide-y text-sm">
		{#each settings as setting (setting.key)}<div class="flex justify-between gap-4 py-3">
				<dt>
					{setting.label}{#if setting.value !== setting.base}<span
							class="block text-xs text-muted-foreground"
							>{m.rules_default({ value: setting.base })}</span
						>{/if}
				</dt>
				<dd class="flex flex-col items-end gap-1 text-right font-medium">
					{setting.value}{#if setting.value !== setting.base}<Badge variant="outline"
							>{m.rules_changed()}</Badge
						>{/if}
				</dd>
			</div>{/each}
	</dl>
	<p class="py-3 text-sm text-muted-foreground">
		{changes.length ? m.rules_changes() : m.rules_no_changes()}
	</p>
{/snippet}

{#snippet reviewActions(Close: typeof Dialog.Close | typeof Drawer.Close)}
	<div class="flex flex-col gap-3">
		{#if error}<p role="alert" class="text-sm text-destructive">{m.rules_error()}</p>{/if}
		{@render readyAction()}<GameRound {game} />
		<Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}>{m.ui_close()}</Close
		>
	</div>
{/snippet}

{#if panel === 'players' && players}{@render players()}{/if}
<div hidden={panel !== 'rules'}>
	<section class="flex min-w-0 flex-col gap-6" aria-labelledby="rules-heading">
		<div>
			<h3 id="rules-heading" class="text-lg font-semibold">{m.rules_title()}</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{editable ? m.rules_edit_hint() : m.rules_locked()}
			</p>
		</div>
		{#if conflicted}<p role="alert">{m.rules_conflict()}</p>
			<Button variant="outline" disabled={pending} onclick={loadLatest}
				>{m.rules_load_latest()}</Button
			>{/if}
		<Collapsible.Root>
			<Collapsible.Trigger
				class={cn(buttonVariants({ variant: 'secondary' }), 'min-h-12 w-full gap-2 text-sm')}
				><HugeiconsIcon
					icon={BookOpen01Icon}
					size={18}
					aria-hidden="true"
				/>{m.rules_base_title()}</Collapsible.Trigger
			>
			<Collapsible.Content>
				<ul class="flex flex-col gap-3 pt-4 text-sm text-muted-foreground">
					<li>{m.rules_base_match()}</li>
					<li>{m.rules_base_draw()}</li>
					<li>{m.rules_base_ace()}</li>
					<li>{m.rules_base_score()}</li>
					<li>{m.rules_base_start()}</li>
				</ul>
			</Collapsible.Content>
		</Collapsible.Root>
		{#if editable}
			<section class="flex flex-col gap-4 rounded-lg border p-4" aria-labelledby="saved-heading">
				<div>
					<h4 id="saved-heading" class="flex items-center gap-2.5 font-semibold">
						<HugeiconsIcon
							icon={Bookmark01Icon}
							size={18}
							aria-hidden="true"
						/>{m.rules_saved_title()}
					</h4>
					<p class="mt-1 text-sm text-muted-foreground">{m.rules_saved_hint()}</p>
				</div>
				{#if configurations.error}<p role="alert">{m.rules_error()}</p>
				{:else if configurations.data}
					{#if configurations.data.length === 0}<p class="text-sm text-muted-foreground">
							{m.rules_saved_empty()}
						</p>
					{:else}
						<Field.Field
							><Field.FieldLabel for="rules-saved">{m.rules_saved_choose()}</Field.FieldLabel
							><select
								id="rules-saved"
								class="h-11 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 md:text-sm dark:bg-input/30"
								value=""
								disabled={pending}
								onchange={(event) => {
									const choice = configurations.data?.find(
										(configuration) => configuration.id === event.currentTarget.value
									);
									if (choice) {
										draft = { ...choice.rules };
										saved = false;
									}
									// Reset the chooser so the same configuration can be picked again.
									event.currentTarget.value = '';
								}}
							>
								<option value="" disabled>{m.rules_saved_placeholder()}</option>
								{#each configurations.data as configuration (configuration.id)}<option
										value={configuration.id}>{configuration.name}</option
									>{/each}
							</select></Field.Field
						>
					{/if}
				{/if}
				<form
					class="flex flex-col gap-3"
					onsubmit={(event) => {
						event.preventDefault();
						if (dirty || conflicted) return;
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
					<Button
						class="min-h-11 whitespace-normal"
						variant="outline"
						type="submit"
						disabled={pending || !name.trim() || dirty || conflicted}>{m.rules_save()}</Button
					>
				</form>
				{#if saved}<p role="status" class="text-sm">{m.rules_saved()}</p>{/if}
			</section>
			<form
				id="rules-form"
				onsubmit={(event) => {
					event.preventDefault();
					if (!conflicted) void act(apply);
				}}
				aria-busy={pending}
			>
				<Field.FieldGroup>
					<section class="flex flex-col gap-2">
						<h4 class="mb-2 flex items-center gap-2.5 text-lg font-semibold">
							<HugeiconsIcon
								icon={Cards01Icon}
								size={20}
								aria-hidden="true"
							/>{m.rules_group_dealing()}
						</h4>
						<RuleHelp label={m.games_cutoff()} description={m.rules_help_scoreCutoff()}
							>{#snippet children(info)}
								<Field.Field
									data-invalid={!Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1}
									><div class="flex items-center justify-between gap-3">
										<div class="flex min-w-0 items-center">
											<Field.FieldLabel for="rule-scoreCutoff" class="text-sm"
												>{m.games_cutoff()}</Field.FieldLabel
											>{@render info()}
										</div>
										<Input
											id="rule-scoreCutoff"
											class="min-h-11 w-24 shrink-0"
											type="number"
											min={1}
											step={1}
											required
											bind:value={draft.scoreCutoff}
											disabled={pending}
											aria-invalid={!Number.isSafeInteger(draft.scoreCutoff) ||
												draft.scoreCutoff < 1}
											aria-describedby="error-scoreCutoff"
										/>
									</div>
									{#if !Number.isSafeInteger(draft.scoreCutoff) || draft.scoreCutoff < 1}<p
											id="error-scoreCutoff"
											class="text-sm text-destructive"
										>
											{m.rules_invalid_scoreCutoff()}
										</p>{/if}</Field.Field
								>
							{/snippet}</RuleHelp
						>
						<RuleHelp label={m.games_hand_size()} description={m.rules_help_handSize()}
							>{#snippet children(info)}
								<Field.Field
									data-invalid={!Number.isInteger(draft.handSize) ||
										draft.handSize < 2 ||
										draft.handSize > 9}
									><div class="flex items-center justify-between gap-3">
										<div class="flex min-w-0 items-center">
											<Field.FieldLabel for="rule-handSize" class="text-sm"
												>{m.games_hand_size()}</Field.FieldLabel
											>{@render info()}
										</div>
										<Input
											id="rule-handSize"
											class="min-h-11 w-24 shrink-0"
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
											aria-describedby="error-handSize"
										/>
									</div>
									{#if !Number.isInteger(draft.handSize) || draft.handSize < 2 || draft.handSize > 9}<p
											id="error-handSize"
											class="text-sm text-destructive"
										>
											{m.rules_invalid_handSize()}
										</p>{/if}</Field.Field
								>
							{/snippet}</RuleHelp
						>
						<RuleHelp label={m.rules_recycle()} description={m.rules_help_recycleMultiplier()}
							>{#snippet children(info)}
								<Field.FieldSet
									><div class="flex items-center">
										<Field.FieldLegend class="mb-0 text-sm">{m.rules_recycle()}</Field.FieldLegend
										>{@render info()}
									</div>
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
										class="w-full"
										><ToggleGroup.Item value="1" class="min-h-11 flex-1 whitespace-normal"
											>×1</ToggleGroup.Item
										><ToggleGroup.Item value="2" class="min-h-11 flex-1 whitespace-normal"
											>×2</ToggleGroup.Item
										><ToggleGroup.Item value="3" class="min-h-11 flex-1 whitespace-normal"
											>×3</ToggleGroup.Item
										></ToggleGroup.Root
									></Field.FieldSet
								>
							{/snippet}</RuleHelp
						>
					</section>
					<section class="flex flex-col gap-2">
						<h4 class="mb-2 flex items-center gap-2.5 text-lg font-semibold">
							<HugeiconsIcon
								icon={MagicWand01Icon}
								size={20}
								aria-hidden="true"
							/>{m.rules_group_effects()}
						</h4>
						<RuleHelp label={m.rules_king()} description={m.rules_help_kingOfSpades()}
							>{#snippet children(info)}
								<Field.Field orientation="horizontal"
									><div class="flex flex-1 items-center">
										<Field.FieldLabel for="rule-kingOfSpades" class="text-sm"
											>{m.rules_king()}</Field.FieldLabel
										>{@render info()}
									</div>
									<Switch
										id="rule-kingOfSpades"
										bind:checked={draft.kingOfSpades}
										disabled={pending}
									/></Field.Field
								>
							{/snippet}</RuleHelp
						>
						<RuleHelp label={m.rules_opening()} description={m.rules_help_openingEffects()}
							>{#snippet children(info)}
								<Field.Field orientation="horizontal"
									><div class="flex flex-1 items-center">
										<Field.FieldLabel for="rule-openingEffects" class="text-sm"
											>{m.rules_opening()}</Field.FieldLabel
										>{@render info()}
									</div>
									<Switch
										id="rule-openingEffects"
										bind:checked={draft.openingEffects}
										disabled={pending}
									/></Field.Field
								>
							{/snippet}</RuleHelp
						>
						<RuleHelp label={m.rules_ace()} description={m.rules_help_aceBehavior()}
							>{#snippet children(info)}
								<Field.FieldSet
									><div class="flex items-center">
										<Field.FieldLegend class="mb-0 text-sm">{m.rules_ace()}</Field.FieldLegend
										>{@render info()}
									</div>
									<ToggleGroup.Root
										type="single"
										variant="outline"
										value={draft.aceBehavior}
										disabled={pending}
										onValueChange={(value) => {
											if (value === 'skip' || value === 'cancel') draft.aceBehavior = value;
										}}
										aria-label={m.rules_ace()}
										class="w-full"
										orientation="vertical"
										><ToggleGroup.Item value="skip" class="min-h-11 flex-1 whitespace-normal"
											>{m.rules_skip()}</ToggleGroup.Item
										><ToggleGroup.Item value="cancel" class="min-h-11 flex-1 whitespace-normal"
											>{m.rules_cancel()}</ToggleGroup.Item
										></ToggleGroup.Root
									></Field.FieldSet
								>
							{/snippet}</RuleHelp
						>
					</section>
					<section class="flex flex-col gap-2">
						<h4 class="mb-2 flex items-center gap-2.5 text-lg font-semibold">
							<HugeiconsIcon
								icon={ArrowReloadHorizontalIcon}
								size={20}
								aria-hidden="true"
							/>{m.rules_group_rounds()}
						</h4>
						<RuleHelp label={m.rules_bridge()} description={m.rules_help_bridgeDeclaration()}
							>{#snippet children(info)}
								<Field.Field orientation="horizontal"
									><div class="flex flex-1 items-center">
										<Field.FieldLabel for="rule-bridgeDeclaration" class="text-sm"
											>{m.rules_bridge()}</Field.FieldLabel
										>{@render info()}
									</div>
									<Switch
										id="rule-bridgeDeclaration"
										bind:checked={draft.bridgeDeclaration}
										disabled={pending}
									/></Field.Field
								>
							{/snippet}</RuleHelp
						>
						<RuleHelp label={m.rules_starter()} description={m.rules_help_starterPolicy()}
							>{#snippet children(info)}
								<Field.FieldSet
									><div class="flex items-center">
										<Field.FieldLegend class="mb-0 text-sm">{m.rules_starter()}</Field.FieldLegend
										>{@render info()}
									</div>
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
										aria-label={m.rules_starter()}
										class="w-full"
										orientation="vertical"
										><ToggleGroup.Item
											value="highest-score"
											class="min-h-11 flex-1 whitespace-normal"
											>{m.rules_highest()}</ToggleGroup.Item
										><ToggleGroup.Item
											value="previous-starter"
											class="min-h-11 flex-1 whitespace-normal"
											>{m.rules_previous()}</ToggleGroup.Item
										><ToggleGroup.Item value="random" class="min-h-11 flex-1 whitespace-normal"
											>{m.rules_random()}</ToggleGroup.Item
										></ToggleGroup.Root
									></Field.FieldSet
								>
							{/snippet}</RuleHelp
						>
					</section>
					<div class="flex flex-col gap-2">
						<Button
							variant="outline"
							class="min-h-11 whitespace-normal"
							disabled={pending}
							aria-describedby="rules-reset-note"
							onclick={() => {
								draft = { ...defaultRules };
								saved = false;
							}}>{m.rules_reset()}</Button
						>
						<p id="rules-reset-note" class="text-sm text-muted-foreground">
							{m.rules_reset_note()}
						</p>
					</div>
				</Field.FieldGroup>
			</form>
		{:else}
			<ul class="flex flex-col divide-y">
				{#each settings as setting (setting.key)}<li>
						<RuleHelp label={setting.label} description={setting.help}
							>{#snippet children(info)}<div class="flex items-center justify-between gap-3 py-2">
									<div class="flex min-w-0 items-center">
										<span class="text-sm font-medium">{setting.label}</span>{@render info()}
									</div>
									<div class="text-right text-sm text-muted-foreground">
										{setting.value}{#if setting.value !== setting.base}<span class="block text-xs"
												>{m.rules_default({ value: setting.base })}</span
											>{/if}
									</div>
								</div>{/snippet}</RuleHelp
						>
					</li>{/each}
			</ul>
		{/if}
	</section>
</div>
{#if game.status === 'lobby'}
	<aside
		class="fixed inset-x-0 bottom-0 border-t bg-background px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
		aria-label={m.lobby_actions()}
	>
		<div class="mx-auto flex max-w-lg flex-col gap-3">
			{#if reviewed}<p class="text-sm text-muted-foreground">{m.rules_reviewed()}</p>{/if}
			{#if error}<p role="alert" class="text-sm text-destructive">{m.rules_error()}</p>{/if}
			{#if dirty || conflicted}
				<p role="status" class="text-sm text-muted-foreground">
					{m.rules_unsaved({ count: changedCount })}
				</p>
				<div class="flex gap-3">
					<Button variant="outline" class="min-h-12 flex-1" disabled={pending} onclick={loadLatest}
						>{m.ui_cancel()}</Button
					><Button
						class="min-h-12 flex-1"
						disabled={pending || !valid || conflicted}
						onclick={() => act(apply)}>{pending ? m.auth_working() : m.rules_apply()}</Button
					>
				</div>
			{:else}
				<p role="status" class="text-sm text-muted-foreground">
					{game.canStart
						? m.rules_table_ready()
						: game.seats.length < 2
							? m.rules_need_players()
							: m.rules_waiting()}
				</p>
				{#if game.isHost}{@render review()}{:else}{@render readyAction()}{/if}
			{/if}
		</div>
	</aside>
{:else if error}<p role="alert">{m.rules_error()}</p>{/if}
