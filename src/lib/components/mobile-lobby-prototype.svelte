<script lang="ts">
	// Throwaway B lobby: compare help with /?prototype&help=tooltip|inline|drawer.
	// All actions and generated identities exist only in memory.
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		ArrowLeft01Icon,
		CheckmarkCircle02Icon,
		UserIcon,
		Cancel01Icon
	} from '@hugeicons/core-free-icons';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import PrototypeInvite from './prototype-invite.svelte';
	import PrototypeRoundReview from './prototype-round-review.svelte';
	import PrototypeRuleList from './prototype-rule-list.svelte';
	import PrototypeRulesEditor from './prototype-rules-editor.svelte';
	import HelpSwitcher from './prototype-help-switcher.svelte';
	import { prototypeDefaults, type PrototypeRules, type HelpMode } from './prototype-rules';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { cn } from '#lib/utils.js';

	const helpMode: HelpMode = $derived(
		page.url.searchParams.get('help') === 'tooltip'
			? 'tooltip'
			: page.url.searchParams.get('help') === 'drawer'
				? 'drawer'
				: 'inline'
	);
	let screen = $state('games');
	let panel = $state('players');
	let name = $state('Friday evening');
	let ready = $state(false);
	let request = $state<'pending' | 'approved' | 'declined'>('pending');
	const approved = $derived(request === 'approved');
	const adjectives = ['Lucky', 'Mellow', 'Sunny', 'Clever', 'Cozy', 'Brave'];
	const animals = ['Otter', 'Finch', 'Fox', 'Panda', 'Owl', 'Lynx'];
	const colors = [
		['#d9e9ff', '#243b66'],
		['#e4dcff', '#48336e'],
		['#d5eedf', '#244d3b']
	];
	function identity(index: number, offset: number) {
		const nickname = `${adjectives[(index + offset) % adjectives.length]} ${animals[(index * 2 + offset) % animals.length]}`;
		const [background, ink] = colors[(index + offset) % colors.length];
		const smile = index % 2 === 0 ? 'M17 28 Q24 34 31 28' : 'M19 29 Q24 32 29 29';
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${background}"/><path d="M6 48 Q8 35 24 35 Q40 35 42 48" fill="${ink}"/><rect x="11" y="9" width="26" height="28" rx="${index % 2 === 0 ? 13 : 9}" fill="${background}" stroke="${ink}" stroke-width="2"/><circle cx="19" cy="22" r="2" fill="${ink}"/><circle cx="29" cy="22" r="2" fill="${ink}"/><path d="${smile}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
		return {
			id: index,
			nickname,
			initials: nickname
				.split(' ')
				.map((word) => word[0])
				.join(''),
			avatar: `data:image/svg+xml,${encodeURIComponent(svg)}`
		};
	}
	let identities = $state([identity(0, 0), identity(1, 0), identity(2, 0)]);
	onMount(() => {
		const offset = Math.floor(Math.random() * adjectives.length);
		identities = [identity(0, offset), identity(1, offset), identity(2, offset)];
	});
	let rules = $state<PrototypeRules>({ ...prototypeDefaults });
	function changeHelp(mode: HelpMode) {
		const url = new URL(page.url.href);
		url.searchParams.delete('variant');
		url.searchParams.set('help', mode);
		void goto(url, { replace: true, reset: false });
	}
	function saveRules(updated: PrototypeRules) {
		if (JSON.stringify(updated) !== JSON.stringify(rules)) ready = false;
		rules = updated;
	}
</script>

{#snippet players()}
	<section aria-labelledby="players-title" class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 id="players-title" class="text-lg font-semibold">Players</h2>
			<p class="text-sm text-muted-foreground">{approved ? 3 : 2} of 4 seats</p>
		</div>
		<ul class="flex flex-col divide-y">
			{#each identities.slice(0, approved ? 3 : 2) as person, index (person.id)}
				<li class="flex min-w-0 items-center gap-3 py-3">
					<Avatar.Root size="lg"
						><Avatar.Image src={person.avatar} alt="" /><Avatar.Fallback
							>{person.initials}</Avatar.Fallback
						></Avatar.Root
					>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<p class="truncate font-medium">{person.nickname}</p>
						<div class="flex items-center gap-1.5">
							{#if index === 0}<Badge variant="secondary">You</Badge><Badge variant="outline"
									>Host</Badge
								>{:else}<p class="text-xs text-muted-foreground">Seat {index + 1}</p>{/if}
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
						{#if index !== 0 || ready}<HugeiconsIcon
								icon={CheckmarkCircle02Icon}
								size={16}
								aria-hidden="true"
							/>Ready{:else}Review rules{/if}
					</div>
				</li>
			{/each}
			{#each Array(approved ? 1 : 2).keys() as index (index)}
				<li class="flex items-center gap-3 py-3 text-muted-foreground">
					<span class="flex size-10 items-center justify-center rounded-full border border-dashed"
						><HugeiconsIcon icon={UserIcon} size={18} aria-hidden="true" /></span
					>
					<div>
						<p class="text-sm">Available seat</p>
						<p class="text-xs">Seat {index + (approved ? 4 : 3)}</p>
					</div>
				</li>
			{/each}
		</ul>
		{#if request === 'pending'}
			<section class="flex flex-col gap-4 rounded-lg border p-4" aria-labelledby="request-title">
				<h3 id="request-title" class="text-sm font-medium">Seat request</h3>
				<div class="flex min-w-0 items-center gap-3">
					<Avatar.Root size="lg"
						><Avatar.Image src={identities[2].avatar} alt="" /><Avatar.Fallback
							>{identities[2].initials}</Avatar.Fallback
						></Avatar.Root
					>
					<div class="min-w-0">
						<p class="truncate font-medium">{identities[2].nickname}</p>
						<p class="text-xs text-muted-foreground">Wants to join your game</p>
					</div>
				</div>
				<div class="flex gap-2">
					<Button class="min-h-11 flex-1" onclick={() => (request = 'approved')}
						><HugeiconsIcon
							icon={CheckmarkCircle02Icon}
							data-icon="inline-start"
							aria-hidden="true"
						/>Approve seat</Button
					>
					<Button
						class="min-h-11 flex-1"
						variant="outline"
						onclick={() => {
							request = 'declined';
							screen = 'declined';
						}}
						><HugeiconsIcon
							icon={Cancel01Icon}
							data-icon="inline-start"
							aria-hidden="true"
						/>Decline</Button
					>
				</div>
			</section>
		{/if}
		<PrototypeInvite gameName={name} />
	</section>
{/snippet}

<div class={cn('mx-auto min-h-svh max-w-lg px-5 pt-5 pb-36', screen === 'lobby' && 'pb-64')}>
	<header class="mb-7 flex min-h-11 items-center justify-between border-b pb-4">
		<a href="?prototype&help={helpMode}" class="font-semibold tracking-tight">Yard Bridge</a><span
			class="text-xs text-muted-foreground">Mobile prototype</span
		>
	</header>
	{#if screen === 'games'}
		<main class="flex flex-col gap-7">
			<div class="flex items-center justify-between gap-3">
				<h1 class="text-3xl font-semibold tracking-tight">Your games</h1>
				<Button class="min-h-11" onclick={() => (screen = 'create')}
					><HugeiconsIcon icon={Add01Icon} data-icon="inline-start" aria-hidden="true" />New game</Button
				>
			</div>
			<p class="text-muted-foreground">Pick up where you left off.</p>
			<section class="flex flex-col gap-4" aria-labelledby="waiting-title">
				<h2 id="waiting-title" class="text-sm font-medium text-muted-foreground">
					Waiting to start
				</h2>
				<div class="flex flex-col gap-4 rounded-xl border p-5">
					<div>
						<h3 class="text-xl font-semibold">{name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">You host this game</p>
					</div>
					<p class="text-sm">
						{approved ? 3 : 2} players seated. {request === 'pending'
							? '1 seat request waiting.'
							: 'Ready to review the rules.'}
					</p>
					<Button class="min-h-12 w-full" onclick={() => (screen = 'lobby')}>Open lobby</Button>
				</div>
			</section>
			<p class="text-sm text-muted-foreground">Your seat is saved when you leave.</p>
		</main>
	{:else if screen === 'create'}
		<main class="flex flex-col gap-6">
			<Button class="min-h-11 self-start" variant="ghost" onclick={() => (screen = 'games')}
				>Back to games</Button
			>
			<h1 class="text-2xl font-semibold">New private game</h1>
			<form
				onsubmit={(event) => {
					event.preventDefault();
					screen = 'lobby';
				}}
			>
				<Field.FieldGroup
					><Field.Field
						><Field.FieldLabel for="prototype-name">Game name</Field.FieldLabel><Input
							id="prototype-name"
							bind:value={name}
							required
							maxlength={80}
							class="min-h-12"
						/></Field.Field
					><Button class="min-h-12" type="submit" disabled={!name.trim()}>Create game</Button
					></Field.FieldGroup
				>
			</form>
		</main>
	{:else if screen === 'started' || screen === 'declined'}
		<main class="flex flex-col gap-6">
			<h1 class="text-2xl font-semibold">
				{screen === 'started' ? 'The round would start here' : 'Seat request declined'}
			</h1>
			<p class="text-muted-foreground">This is a local simulation. No game data was changed.</p>
			<Button class="min-h-12" onclick={() => (screen = 'lobby')}>Return to lobby</Button>
		</main>
	{:else}
		<main class="flex flex-col gap-6">
			<Button variant="ghost" class="min-h-11 self-start" onclick={() => (screen = 'games')}
				><HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" aria-hidden="true" />All
				games</Button
			>
			<div>
				<h1 class="text-3xl font-semibold tracking-tight break-words">{name}</h1>
				<p class="mt-2 text-muted-foreground">Waiting for players. You're the host.</p>
			</div>
			<ToggleGroup.Root
				type="single"
				value={panel}
				onValueChange={(value) => {
					if (value === 'players' || value === 'rules') panel = value;
				}}
				variant="outline"
				aria-label="Lobby view"
				class="w-full"
				><ToggleGroup.Item class="min-h-12 flex-1" value="players">Players</ToggleGroup.Item
				><ToggleGroup.Item class="min-h-12 flex-1" value="rules">Rules</ToggleGroup.Item
				></ToggleGroup.Root
			>
			{#if panel === 'rules'}
				<PrototypeRulesEditor {rules} {helpMode} onchangehelp={changeHelp} onsave={saveRules} />
				<section aria-labelledby="rules-title" class="flex flex-col gap-4">
					<div class="flex items-center justify-between">
						<h2 id="rules-title" class="text-lg font-semibold">Table rules</h2>
						<span class="text-sm text-muted-foreground">Read only</span>
					</div>
					<PrototypeRuleList {rules} {helpMode} />
				</section>
			{:else}{@render players()}{/if}
		</main>
	{/if}
</div>

<aside
	aria-label="Prototype controls"
	class="fixed inset-x-0 bottom-0 border-t bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
>
	{#if screen === 'lobby'}<div aria-label="Round actions" class="mx-auto max-w-lg py-3">
			<PrototypeRoundReview
				{rules}
				pendingRequest={request === 'pending'}
				onstart={() => {
					ready = true;
					screen = 'started';
				}}
			/>
		</div>
		<Separator />{/if}
	<div class="mx-auto flex max-w-lg flex-col gap-2 pt-3">
		<HelpSwitcher value={helpMode} onchange={changeHelp} />
		<div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>B · Help: {helpMode} · Ready: {ready ? 'yes' : 'no'}</span><Button
				variant="ghost"
				class="min-h-11"
				onclick={() => {
					screen = 'games';
					ready = false;
					request = 'pending';
					rules = { ...prototypeDefaults };
					name = 'Friday evening';
				}}>Reset</Button
			>
		</div>
	</div>
</aside>
