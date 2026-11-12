<script lang="ts">
	import { useConvexClient, useQuery } from 'convex-svelte';
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import { suits } from '../../convex/cards';
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
	type Round = NonNullable<typeof round.data>;
	type Card = Round['hand'][number];
	type Suit = Card['suit'];
	let moving = $state(false);
	let moveError = $state(false);
	// The ordered group being arranged; it belongs to one table version and clears on any change.
	let selection = $state<{ version: number; cards: Card[] }>({ version: -1, cards: [] });
	const chosen = $derived(
		round.data && selection.version === round.data.version ? selection.cards : []
	);
	const sameCard = (left: Card, right: Card) =>
		left.rank === right.rank && left.suit === right.suit;
	// Turn commands carry the viewed version, so a move chosen from an outdated table is rejected.
	async function move(table: Round, command: 'play' | 'draw' | 'chooseSuit', suit?: Suit) {
		if (moving) return;
		moving = true;
		moveError = false;
		const turn = { roundId: table.id, expectedVersion: table.version };
		try {
			if (command === 'play')
				await client.mutation(api.rounds.play, { ...turn, cards: chosen, suit });
			else if (command === 'chooseSuit' && suit)
				await client.mutation(api.rounds.chooseSuit, { ...turn, suit });
			else await client.mutation(api.rounds.draw, turn);
		} catch {
			moveError = true;
		} finally {
			moving = false;
		}
	}
	function cardLabel(card: Card) {
		return m.round_card({ rank: card.rank, suit: suitNames[card.suit] });
	}
	// A group starts with a playable card and continues with same-rank cards; a drawn card plays alone.
	function canSelect(table: Round, card: Card) {
		const [first] = chosen;
		if (!first) return table.playable.some((item) => sameCard(item, card));
		return !table.drawnCard && card.rank === first.rank;
	}
	function toggle(table: Round, card: Card) {
		const cards = chosen.some((item) => sameCard(item, card))
			? chosen.filter((item) => !sameCard(item, card))
			: [...chosen, card];
		selection = { version: table.version, cards };
	}
	function seatNumber(id: string) {
		return game.seats.findIndex((seat) => seat.id === id) + 1;
	}
</script>

{#snippet suitPicker(table: Round, command: 'play' | 'chooseSuit', ready: boolean)}
	<fieldset class="flex flex-col gap-2">
		<legend class="mb-2 font-semibold">{m.round_pick_suit()}</legend>
		<div class="grid grid-cols-2 gap-2">
			{#each suits as suit (suit)}
				<Button
					variant="outline"
					class="min-h-11"
					disabled={moving || !ready}
					onclick={() => move(table, command, suit)}
					><span aria-hidden="true">{suitSymbols[suit]}</span>{suitNames[suit]}</Button
				>
			{/each}
		</div>
	</fieldset>
{/snippet}

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
			{@const isTurn = table.currentSeatId === game.viewerSeatId}
			{@const ready = !!chosen[0] && table.playable.some((card) => sameCard(card, chosen[0]))}
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
						aria-label={cardLabel(table.topCard)}
					>
						{table.topCard.rank}<span aria-hidden="true">{suitSymbols[table.topCard.suit]}</span>
					</div>
				</div>
			</div>
			<p>{m.round_current({ number: seatNumber(table.currentSeatId) })}</p>
			{#if table.activeSuit}<p>{m.round_active_suit({ suit: suitNames[table.activeSuit] })}</p>{/if}
			{#if table.opening.kind === 'choose-suit'}
				{#if isTurn}{@render suitPicker(table, 'chooseSuit', true)}
				{:else}<p>{m.round_choose_suit()}</p>{/if}
			{:else if table.mustCover && !isTurn}<p>
					{m.round_cover_waiting({ number: seatNumber(table.currentSeatId) })}
				</p>
			{:else if table.opening.kind === 'effect'}
				{#if table.opening.drawCount > 0}<p>
						{m.round_draw_effect({ count: table.opening.drawCount })}
					</p>{/if}
				{#if table.opening.skip}<p>{m.round_skip_effect()}</p>{/if}
			{:else if !table.openingEffects}<p class="text-muted-foreground">
					{m.round_effects_off()}
				</p>{/if}
			{#if table.drawnCard}<p role="status">
					{m.round_play_drawn({ card: cardLabel(table.drawnCard) })}
				</p>
			{:else if isTurn && table.mustCover && table.activeSuit}<p role="status">
					{m.round_cover_prompt({ suit: suitNames[table.activeSuit] })}
				</p>
			{:else if table.playable.length || table.canDraw}<p role="status">{m.round_your_turn()}</p>
			{:else if isTurn && table.opening.kind !== 'choose-suit'}<p role="status">
					{m.round_waiting_opening()}
				</p>{/if}
			{#if table.canDraw}<Button
					class="min-h-11"
					onclick={() => move(table, 'draw')}
					disabled={moving}>{moving ? m.auth_working() : m.round_draw()}</Button
				>{/if}
			{#if moveError}<p role="alert">{m.round_move_error()}</p>{/if}
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
					{@const selected = chosen.some((item) => sameCard(item, card))}
					{@const selectable = selected || canSelect(table, card)}
					<li>
						<button
							type="button"
							class="flex h-20 w-14 flex-col items-center justify-center rounded-lg border bg-card text-xl font-semibold text-card-foreground transition-transform enabled:-translate-y-1 enabled:border-primary enabled:shadow-md disabled:opacity-100 aria-pressed:-translate-y-3 aria-pressed:bg-primary aria-pressed:text-primary-foreground motion-reduce:transition-none"
							aria-label={selectable
								? m.round_select_card({ card: cardLabel(card) })
								: cardLabel(card)}
							aria-pressed={selectable ? selected : undefined}
							disabled={!selectable || moving}
							onclick={() => toggle(table, card)}
						>
							{card.rank}<span aria-hidden="true">{suitSymbols[card.suit]}</span>
						</button>
					</li>
				{/each}
			</ul>
			{#if chosen.length}
				<section
					class="flex flex-col gap-3 rounded-xl border p-4"
					aria-labelledby="selection-heading"
				>
					<h4 id="selection-heading" class="font-semibold">{m.round_selection()}</h4>
					<ol class="flex flex-wrap gap-2" aria-labelledby="selection-heading">
						{#each chosen as card (`${card.rank}:${card.suit}`)}<li
								class="rounded-md border bg-card px-2 py-1"
							>
								{cardLabel(card)}
							</li>{/each}
					</ol>
					<p class="text-sm text-muted-foreground">{m.round_selection_hint()}</p>
					{#if chosen.at(-1)?.rank === 'J'}{@render suitPicker(table, 'play', ready)}
					{:else}<Button
							class="min-h-11"
							onclick={() => move(table, 'play')}
							disabled={moving || !ready}
							>{moving ? m.auth_working() : m.round_play_selected()}</Button
						>{/if}
					<Button
						variant="ghost"
						class="min-h-11"
						onclick={() => (selection = { version: -1, cards: [] })}
						>{m.round_clear_selection()}</Button
					>
				</section>
			{/if}
			<p class="text-sm text-muted-foreground">{m.round_private_hint()}</p>
		{:else}<p role="status">{m.round_loading()}</p>{/if}
	</section>
{/if}
