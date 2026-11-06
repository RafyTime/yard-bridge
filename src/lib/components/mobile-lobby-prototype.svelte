<script lang="ts">
	// Throwaway: compare three mobile lobby flows on /?prototype&variant=A.
	// All actions and generated identities exist only in memory.
	import { onMount } from 'svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Add01Icon,
		ArrowLeft01Icon,
		ArrowRight01Icon,
		Settings02Icon,
		PlayIcon,
		CheckmarkCircle02Icon,
		UserIcon,
		Cancel01Icon
	} from '@hugeicons/core-free-icons';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import PrototypeInvite from './prototype-invite.svelte';
	import PrototypeRoundReview from './prototype-round-review.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { cn } from '#lib/utils.js';

	const variants = ['A', 'B', 'C'];
	const variant = $derived(
		variants.includes(page.url.searchParams.get('variant') ?? '')
			? page.url.searchParams.get('variant')!
			: 'A'
	);
	const names: Record<string, string> = {
		A: 'Lobby overview',
		B: 'Separate views',
		C: 'Guided setup'
	};
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
	let cutoff = $state('200');
	let step = $state(0);
	const steps = ['Invite players', 'Review rules', 'Get ready'];
	const canStart = $derived(ready && request !== 'pending');

	function switchVariant(direction: number) {
		const url = new URL(page.url.href);
		url.searchParams.set(
			'variant',
			variants[(variants.indexOf(variant) + direction + variants.length) % variants.length]
		);
		void goto(url, { replace: true });
	}
	function keyboard(event: KeyboardEvent) {
		if (
			!(event.target instanceof HTMLElement) ||
			event.target.closest('input, textarea, select, button, [contenteditable], [role="group"]')
		)
			return;
		if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
			event.preventDefault();
			switchVariant(event.key === 'ArrowRight' ? 1 : -1);
		}
	}
</script>

<svelte:window onkeydown={keyboard} />

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

{#snippet rules()}
	<section aria-labelledby="rules-title" class="flex flex-col gap-4">
		<div class="flex items-center justify-between">
			<h2 id="rules-title" class="text-lg font-semibold">Table rules</h2>
			<Button variant="ghost" class="min-h-11" onclick={() => (screen = 'rules')}
				><HugeiconsIcon icon={Settings02Icon} data-icon="inline-start" aria-hidden="true" />Edit
				rules</Button
			>
		</div>
		<dl class="grid grid-cols-2 gap-3 text-sm">
			<dt class="text-muted-foreground">Score cutoff</dt>
			<dd class="text-right">{cutoff} points</dd>
			<dt class="text-muted-foreground">Cards per hand</dt>
			<dd class="text-right">5 cards</dd>
			<dt class="text-muted-foreground">Bridge declaration</dt>
			<dd class="text-right">On</dd>
		</dl>
		<p class="text-sm text-muted-foreground">
			Every player reviews the rules before the round starts. Changing a rule clears readiness.
		</p>
	</section>
{/snippet}

{#snippet start()}
	<div class="flex flex-col gap-3">
		{#if !ready}<Button class="min-h-12 w-full" variant="outline" onclick={() => (screen = 'rules')}
				>Review rules to get ready</Button
			>{/if}
		<Button class="min-h-12 w-full" disabled={!canStart} onclick={() => (screen = 'started')}
			><HugeiconsIcon icon={PlayIcon} data-icon="inline-start" aria-hidden="true" />Start round</Button
		>
		<p class="text-center text-sm text-muted-foreground" role="status">
			{request === 'pending'
				? 'Approve or decline the seat request first.'
				: !ready
					? 'Review the rules and mark yourself ready.'
					: 'Everyone is ready. You can start.'}
		</p>
	</div>
{/snippet}

<div
	class={cn(
		'mx-auto min-h-svh max-w-lg px-5 pt-5 pb-36',
		variant === 'B' && screen === 'lobby' && 'pb-64'
	)}
>
	<header class="mb-7 flex min-h-11 items-center justify-between border-b pb-4">
		<a href="?prototype&variant={variant}" class="font-semibold tracking-tight">Yard Bridge</a><span
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
	{:else if screen === 'rules'}
		<main class="flex flex-col gap-6">
			<Button variant="ghost" class="min-h-11 self-start" onclick={() => (screen = 'lobby')}
				>Back to lobby</Button
			>
			<h1 class="text-2xl font-semibold">
				{variant === 'B' ? 'Edit table rules' : 'Review table rules'}
			</h1>
			<p class="text-muted-foreground">These rules apply to everyone at the table.</p>
			<Field.FieldGroup
				><Field.Field
					><Field.FieldLabel for="cutoff">Score cutoff</Field.FieldLabel><Input
						id="cutoff"
						type="number"
						min="1"
						bind:value={cutoff}
						oninput={() => (ready = false)}
						class="min-h-12"
					/><Field.FieldDescription
						>Changing this clears your ready status in this demo.</Field.FieldDescription
					></Field.Field
				></Field.FieldGroup
			>
			<p>5 cards per hand. Bridge declaration is on.</p>
			<p class="text-sm text-muted-foreground">
				Prototype summary. The complete rule controls and game instructions will belong here.
			</p>
			<Button
				class="min-h-12"
				onclick={() => {
					ready = variant !== 'B';
					screen = 'lobby';
					step = 2;
				}}>{variant === 'B' ? 'Save rules' : 'Accept rules and get ready'}</Button
			>
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
			{#if variant === 'A'}
				{@render players()}<Separator />{@render rules()}<Separator />{@render start()}
			{:else if variant === 'B'}
				<ToggleGroup.Root
					type="single"
					bind:value={panel}
					variant="outline"
					aria-label="Lobby view"
					class="w-full"
					><ToggleGroup.Item class="min-h-12 flex-1" value="players">Players</ToggleGroup.Item
					><ToggleGroup.Item class="min-h-12 flex-1" value="rules">Rules</ToggleGroup.Item
					></ToggleGroup.Root
				>
				{#if panel === 'rules'}{@render rules()}{:else}{@render players()}{/if}
			{:else}
				<nav aria-label="Game setup">
					<ol class="flex gap-2">
						{#each steps as label, index (label)}<li class="flex-1">
								<button
									class="flex min-h-14 w-full flex-col gap-1 border-b-2 py-2 text-left text-xs"
									class:border-primary={step === index}
									aria-current={step === index ? 'step' : undefined}
									onclick={() => (step = index)}
									><span class="text-muted-foreground">Step {index + 1}</span><span>{label}</span
									></button
								>
							</li>{/each}
					</ol>
				</nav>
				{#if step === 0}{@render players()}<Button class="min-h-12" onclick={() => (step = 1)}
						>Continue to rules</Button
					>{:else if step === 1}{@render rules()}<Button
						class="min-h-12"
						onclick={() => (screen = 'rules')}>Review and accept rules</Button
					>{:else}{@render start()}<Button
						class="min-h-11"
						variant="ghost"
						onclick={() => (step = 0)}>Check players</Button
					>{/if}
			{/if}
		</main>
	{/if}
</div>

<aside
	aria-label="Prototype controls"
	class="fixed inset-x-0 bottom-0 border-t bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
>
	{#if variant === 'B' && screen === 'lobby'}
		<div aria-label="Round actions" class="mx-auto max-w-lg py-3">
			<PrototypeRoundReview
				{cutoff}
				pendingRequest={request === 'pending'}
				onstart={() => {
					ready = true;
					screen = 'started';
				}}
			/>
		</div>
		<Separator />
	{/if}
	<div class="mx-auto flex max-w-lg flex-col gap-2 pt-3">
		<div class="flex items-center justify-between gap-2">
			<Button
				class="min-h-11 min-w-11"
				variant="outline"
				aria-label="Previous layout"
				onclick={() => switchVariant(-1)}
				><HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" /></Button
			>
			<div class="text-center">
				<p class="text-sm font-medium">{variant} · {names[variant]}</p>
				<p class="text-xs text-muted-foreground">Sample data. Nothing is saved.</p>
			</div>
			<Button
				class="min-h-11 min-w-11"
				variant="outline"
				aria-label="Next layout"
				onclick={() => switchVariant(1)}
				><HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" /></Button
			>
		</div>
		<div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
			<span>View: {screen} · Ready: {ready ? 'yes' : 'no'} · Request: {request}</span><Button
				variant="ghost"
				class="min-h-11"
				onclick={() => {
					screen = 'games';
					ready = false;
					request = 'pending';
					step = 0;
					cutoff = '200';
					name = 'Friday evening';
				}}>Reset</Button
			>
		</div>
	</div>
</aside>
