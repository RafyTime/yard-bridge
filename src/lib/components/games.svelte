<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowLeft01Icon, PlusSignIcon } from '@hugeicons/core-free-icons';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';
	import { mockSeatCount, mockSeatLimit } from '#lib/mocks/players.js';
	import Invitations from './invitations.svelte';
	import GameLobby from './game-lobby.svelte';
	import GameRules from './game-rules.svelte';
	import GameRound from './game-round.svelte';
	const invitationToken = $derived(page.url.searchParams.get('invite'));
	const client = useConvexClient();
	const games = useQuery(api.games.list, {});
	const gameId = $derived(page.url.searchParams.get('game') as Id<'games'> | null);
	const game = useQuery(api.games.view, () => (gameId ? { gameId } : 'skip'));
	let name = $state('');
	let creating = $state(false);
	let pending = $state(false);
	let error = $state(false);
	async function create(event: SubmitEvent) {
		event.preventDefault();
		if (pending) return;
		pending = true;
		error = false;
		try {
			const id = await client.mutation(api.games.create, { name });
			name = '';
			creating = false;
			await goto(`?game=${id}`);
		} catch {
			error = true;
		} finally {
			pending = false;
		}
	}
</script>

<section
	class="flex flex-col gap-6"
	aria-labelledby={invitationToken ? 'invitation-heading' : 'games-heading'}
>
	{#if invitationToken}
		<Invitations token={invitationToken} />
	{:else if gameId}
		<!-- The way back sits directly above the Game title so it is always in reach. -->
		<div class="flex flex-col items-start gap-3">
			<Button class="min-h-11" variant="outline" href={page.url.pathname}
				><HugeiconsIcon
					icon={ArrowLeft01Icon}
					size={18}
					aria-hidden="true"
				/>{m.games_back()}</Button
			>
			{#if game.data}
				<h2 id="games-heading" class="text-2xl font-semibold break-words">{game.data.name}</h2>
			{/if}
		</div>
		{#if game.error}<p role="alert">{m.games_unavailable()}</p>
		{:else if game.data}
			<p class="text-sm text-muted-foreground">
				{game.data.isHost ? m.games_host() : m.games_seated()}
			</p>
			{#if game.data.status === 'lobby'}
				{#key game.data.id}<GameLobby game={game.data} />{/key}
			{:else}<GameRound game={game.data} />{#key game.data.id}<GameRules
						game={game.data}
					/>{/key}{/if}
		{:else}<p role="status">{m.games_loading()}</p>{/if}
	{:else}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 id="games-heading" class="text-2xl font-semibold">
				{creating ? m.games_create() : m.games_title()}
			</h2>
			{#if creating}<Button class="min-h-11" variant="ghost" onclick={() => (creating = false)}
					>{m.ui_cancel()}</Button
				>{/if}
		</div>
		{#if !creating}
			<Button class="min-h-14 w-full text-base" onclick={() => (creating = true)}
				><HugeiconsIcon icon={PlusSignIcon} size={20} aria-hidden="true" />{m.games_new()}</Button
			>
		{/if}
		{#if creating}
			<form onsubmit={create} aria-busy={pending}>
				<Field.FieldGroup>
					<Field.Field data-invalid={error}>
						<Field.FieldLabel for="game-name">{m.games_name()}</Field.FieldLabel>
						<Input
							id="game-name"
							class="min-h-11"
							bind:value={name}
							maxlength={80}
							required
							disabled={pending}
							aria-invalid={error}
							aria-describedby="game-error"
						/>
					</Field.Field>
					<Button class="min-h-11" type="submit" disabled={pending || !name.trim()}
						>{pending ? m.auth_working() : m.games_create()}</Button
					>
				</Field.FieldGroup>
			</form>
			{#if error}<p id="game-error" role="alert">{m.games_create_error()}</p>{/if}
		{:else}
			{#if games.error}<p role="alert">{m.games_list_error()}</p>
			{:else if games.data}
				{#if games.data.length === 0}<p class="text-muted-foreground">{m.games_empty()}</p>{/if}
				<ul class="flex flex-col gap-3">
					{#each games.data as item (item.id)}
						<li>
							<a
								href={`?game=${item.id}`}
								class="flex min-h-20 min-w-0 flex-col gap-2 rounded-xl border bg-card px-5 py-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
							>
								<span class="text-lg font-medium break-words">{item.name}</span>
								<span class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
									<Badge variant={item.status === 'lobby' ? 'secondary' : 'default'}
										>{item.status === 'lobby' ? m.games_lobby() : m.games_active()}</Badge
									>
									<span
										>{m.games_seats({ count: mockSeatCount(item.id), limit: mockSeatLimit })}</span
									>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}<p role="status">{m.games_loading()}</p>{/if}
		{/if}
	{/if}
</section>
