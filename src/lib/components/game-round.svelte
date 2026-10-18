<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as m from '#lib/paraglide/messages.js';
	let { game }: { game: FunctionReturnType<typeof api.games.view> } = $props();
	const client = useConvexClient();
	const gameId = $derived(game.id);
	const isActive = $derived(game.status === 'active');
	const round = useQuery(api.rounds.view, () => (isActive ? { gameId } : 'skip'));
	const suitSymbols = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
	const suitNames = $derived({
		clubs: m.round_clubs(),
		diamonds: m.round_diamonds(),
		hearts: m.round_hearts(),
		spades: m.round_spades()
	});
	let pending = $state(false);
	let error = $state(false);
	async function start() {
		if (pending) return;
		pending = true;
		error = false;
		try {
			await client.mutation(api.rounds.start, {
				gameId: game.id,
				expectedGameVersion: game.version
			});
		} catch {
			error = true;
		} finally {
			pending = false;
		}
	}
	function seatNumber(id: string) {
		return game.seats.findIndex((seat) => seat.id === id) + 1;
	}
</script>

{#if game.status === 'lobby' && game.isHost}
	<Button class="min-h-11" onclick={start} disabled={!game.canStart || pending}
		>{pending ? m.auth_working() : m.round_start()}</Button
	>
	{#if error}<p role="alert">{m.round_start_error()}</p>{/if}
{:else if game.status === 'active'}
	<section class="flex flex-col gap-5" aria-labelledby="round-heading">
		{#if round.error}<p role="alert">{m.round_load_error()}</p>
		{:else if round.data}
			{@const table = round.data}
			<h3 id="round-heading" class="text-xl font-semibold">
				{m.round_title({ number: table.number })}
			</h3>
			<p>{m.round_starter({ number: seatNumber(table.starterSeatId) })}</p>
			<div class="flex items-center justify-center gap-6 rounded-xl border bg-muted p-6">
				<div class="flex flex-col items-center gap-2">
					<p>{m.round_draw_pile()}</p>
					<p class="text-2xl font-semibold">{table.drawCount}</p>
				</div>
				<div class="flex flex-col items-center gap-2">
					<p>{m.round_top_card()}</p>
					<div
						role="img"
						class="flex h-20 w-14 flex-col items-center justify-center rounded-lg border bg-card text-2xl font-semibold text-card-foreground"
						aria-label={m.round_card({
							rank: table.topCard.rank,
							suit: suitNames[table.topCard.suit]
						})}
					>
						{table.topCard.rank}<span aria-hidden="true">{suitSymbols[table.topCard.suit]}</span>
					</div>
				</div>
			</div>
			<p>{m.round_current({ number: seatNumber(table.currentSeatId) })}</p>
			{#if table.opening.kind === 'choose-suit'}<p>{m.round_choose_suit()}</p>
			{:else if table.opening.kind === 'cover-six'}<p>{m.round_cover_six()}</p>
			{:else if table.opening.kind === 'effect'}
				{#if table.opening.drawCount > 0}<p>
						{m.round_draw_effect({ count: table.opening.drawCount })}
					</p>{/if}
				{#if table.opening.skip}<p>{m.round_skip_effect()}</p>{/if}
			{:else if !table.openingEffects}<p class="text-muted-foreground">
					{m.round_effects_off()}
				</p>{/if}
			{#if table.activeSuit}<p>{m.round_active_suit({ suit: suitNames[table.activeSuit] })}</p>{/if}
			<ul class="flex flex-col gap-2" aria-label={m.round_counts()}>
				{#each table.seats as seat (seat.seatId)}<li>
						{m.round_count({
							number: seatNumber(seat.seatId),
							count: seat.cardCount
						})}{seat.seatId === game.viewerSeatId ? ` · ${m.invite_you()}` : ''}
					</li>{/each}
			</ul>
			<h4 class="font-semibold">{m.round_hand()}</h4>
			<ul class="flex flex-wrap gap-2" aria-label={m.round_hand()}>
				{#each table.hand as card (`${card.rank}:${card.suit}`)}
					<li
						class="flex h-20 w-14 flex-col items-center justify-center rounded-lg border bg-card text-xl font-semibold text-card-foreground"
						aria-label={m.round_card({ rank: card.rank, suit: suitNames[card.suit] })}
					>
						{card.rank}<span aria-hidden="true">{suitSymbols[card.suit]}</span>
					</li>
				{/each}
			</ul>
			<p class="text-sm text-muted-foreground">{m.round_private_hint()}</p>
		{:else}<p role="status">{m.round_loading()}</p>{/if}
	</section>
{/if}
