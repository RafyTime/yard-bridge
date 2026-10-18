<script lang="ts">
	import { SvelteURL } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';
	let { gameId = null, token = null }: { gameId?: Id<'games'> | null; token?: string | null } =
		$props();
	const client = useConvexClient();
	const invitation = useQuery(api.games.invitation, () => (token ? { token } : 'skip'));
	const requests = useQuery(api.games.requests, () => (gameId ? { gameId } : 'skip'));
	let link = $state('');
	let pending = $state(false);
	let error = $state(false);
	$effect(() => {
		if (invitation.data?.gameId)
			void goto(`?game=${invitation.data.gameId}`, { replaceState: true });
	});
	async function act(command: () => Promise<unknown>) {
		if (pending) return;
		pending = true;
		error = false;
		try {
			await command();
		} catch {
			error = true;
		} finally {
			pending = false;
		}
	}
	async function invite() {
		if (!gameId) return;
		const token = await client.mutation(api.games.invite, { gameId });
		const url = new SvelteURL(page.url.href);
		url.search = '';
		url.searchParams.set('invite', token);
		link = url.href;
	}
</script>

<section class="flex min-w-0 flex-col gap-4" aria-labelledby="invitation-heading">
	{#if token}
		<Button class="min-h-11" variant="outline" onclick={() => goto(page.url.pathname)}
			>{m.games_back()}</Button
		>
		{#if invitation.error}<p role="alert">{m.invite_unavailable()}</p>
		{:else if invitation.data}
			<h2 id="invitation-heading" class="text-2xl font-semibold break-words">
				{invitation.data.name}
			</h2>
			{#if invitation.data.status === 'invited'}
				<p>{m.invite_intro()}</p>
				<Button
					class="min-h-11"
					disabled={pending}
					onclick={() => act(() => client.mutation(api.games.requestSeat, { token: token! }))}
					>{m.invite_request()}</Button
				>
			{:else if invitation.data.status === 'pending'}<p role="status">{m.invite_pending()}</p>
			{:else if invitation.data.status === 'rejected'}<p role="status">
					{m.invite_rejected()}
				</p>{/if}
		{:else}<p role="status">{m.games_loading()}</p>{/if}
	{:else if gameId}
		<h3 id="invitation-heading" class="text-lg font-medium">{m.invite_title()}</h3>
		<Button class="min-h-11" variant="outline" disabled={pending} onclick={() => act(invite)}
			>{m.invite_create()}</Button
		>
		{#if link}
			<Field.FieldGroup
				><Field.Field>
					<Field.FieldLabel for="invitation-link">{m.invite_link()}</Field.FieldLabel>
					<Input
						id="invitation-link"
						value={link}
						readonly
						onclick={(event) => event.currentTarget.select()}
					/>
					<Field.FieldDescription>{m.invite_link_hint()}</Field.FieldDescription>
				</Field.Field></Field.FieldGroup
			>
		{/if}
		{#if requests.error}<p role="alert">{m.invite_error()}</p>
		{:else if requests.data}
			{#if requests.data.length === 0}<p class="text-muted-foreground">
					{m.invite_no_requests()}
				</p>{/if}
			<ul class="flex flex-col gap-4">
				{#each requests.data as request (request.id)}
					<li class="flex min-w-0 flex-col gap-2">
						<p class="break-all">{request.email}</p>
						<div class="flex gap-2">
							<Button
								class="min-h-11"
								disabled={pending}
								onclick={() =>
									act(() =>
										client.mutation(api.games.decideSeat, { requestId: request.id, approve: true })
									)}>{m.invite_approve()}</Button
							>
							<Button
								class="min-h-11"
								variant="outline"
								disabled={pending}
								onclick={() =>
									act(() =>
										client.mutation(api.games.decideSeat, { requestId: request.id, approve: false })
									)}>{m.invite_reject()}</Button
							>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	{#if error}<p role="alert">{m.invite_error()}</p>{/if}
</section>
