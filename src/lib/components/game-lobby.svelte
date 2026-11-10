<script lang="ts">
	import type { FunctionReturnType } from 'convex/server';
	import { api } from '../../convex/_generated/api';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { mockIdentity } from '#lib/mocks/players.js';
	import * as m from '#lib/paraglide/messages.js';
	import Invitations from './invitations.svelte';
	import GameRules from './game-rules.svelte';
	let { game }: { game: FunctionReturnType<typeof api.games.view> } = $props();
	let panel = $state<'players' | 'rules'>('players');
	const gameId = $derived(game.id);
</script>

{#snippet players()}
	<section class="flex flex-col gap-4" aria-label={m.lobby_players()}>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h3 class="text-lg font-semibold">{m.lobby_players()}</h3>
			<p class="text-sm text-muted-foreground">
				{m.invite_seat_count({ count: game.seats.length })}
			</p>
		</div>
		<ul class="flex flex-col divide-y">
			{#each game.seats as seat, index (seat.id)}{@const identity = mockIdentity(seat.id)}
				<li class="flex min-w-0 items-center gap-3 py-4">
					<!-- Decorative: the mock name beside it already identifies the Seat. -->
					<Avatar.Root size="lg" aria-hidden="true"
						><Avatar.Image src={identity.avatar} alt="" /><Avatar.Fallback
							>{identity.initials}</Avatar.Fallback
						></Avatar.Root
					>
					<div class="flex min-w-0 flex-1 flex-col gap-1.5">
						<p class="truncate font-medium">{identity.name}</p>
						<div class="flex flex-wrap items-center gap-1.5">
							<p class="text-xs text-muted-foreground">{m.invite_seat({ number: index + 1 })}</p>
							{#if seat.isHost}<Badge variant="outline">{m.invite_host()}</Badge
								>{/if}{#if seat.id === game.viewerSeatId}<Badge variant="secondary"
									>{m.invite_you()}</Badge
								>{/if}
						</div>
					</div>
					<span class="max-w-28 text-right text-xs text-muted-foreground"
						>{seat.ready ? m.rules_seat_ready() : m.rules_seat_waiting()}</span
					>
				</li>{/each}
			{#each Array(4 - game.seats.length).keys() as index (index)}<li
					class="flex items-center gap-3 py-4 text-muted-foreground"
				>
					<span
						class="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed"
						aria-hidden="true">+</span
					>
					<div>
						<p class="text-sm">{m.lobby_available()}</p>
						<p class="text-xs">
							{m.invite_seat({ number: game.seats.length + index + 1 })}
						</p>
					</div>
				</li>{/each}
		</ul>
		{#if game.isHost}<Invitations {gameId} />{/if}
		<p class="text-xs text-muted-foreground">{m.games_saved()}</p>
	</section>
{/snippet}
<ToggleGroup.Root
	type="single"
	variant="outline"
	value={panel}
	onValueChange={(value) => {
		if (value === 'players' || value === 'rules') panel = value;
	}}
	aria-label={m.lobby_view()}
	class="w-full"
	><ToggleGroup.Item class="min-h-12 flex-1" value="players">{m.lobby_players()}</ToggleGroup.Item
	><ToggleGroup.Item class="min-h-12 flex-1" value="rules">{m.rules_title()}</ToggleGroup.Item
	></ToggleGroup.Root
>

<GameRules {game} {panel} {players} />
