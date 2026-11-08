<script lang="ts">
	import { SvelteURL, MediaQuery } from 'svelte/reactivity';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Copy01Icon } from '@hugeicons/core-free-icons';
	const desktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);
	let feedback = $state('');
	async function copy() {
		try {
			await navigator.clipboard.writeText(link);
			feedback = m.invite_copied();
		} catch {
			feedback = m.invite_copy_error();
		}
	}
	async function share() {
		try {
			await navigator.share({ url: link });
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError'))
				feedback = m.invite_share_error();
		}
	}
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { useConvexClient, useQuery } from 'convex-svelte';
	import { api } from '../../convex/_generated/api';
	import type { Id } from '../../convex/_generated/dataModel';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
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

		{#if desktop.current}<Dialog.Root bind:open
				><Dialog.Trigger
					class={buttonVariants({ variant: 'outline', class: 'min-h-12 w-full' })}
					onclick={() => {
						feedback = '';
						if (!link) void act(invite);
					}}>{m.invite_create()}</Dialog.Trigger
				><Dialog.Content
					><Dialog.Header
						><Dialog.Title>{m.invite_title()}</Dialog.Title><Dialog.Description
							>{m.invite_link_hint()}</Dialog.Description
						></Dialog.Header
					>{@render invitationContents()}</Dialog.Content
				></Dialog.Root
			>
		{:else}<Drawer.Root bind:open
				><Drawer.Trigger
					class={buttonVariants({ variant: 'outline', class: 'min-h-12 w-full' })}
					onclick={() => {
						feedback = '';
						if (!link) void act(invite);
					}}>{m.invite_create()}</Drawer.Trigger
				><Drawer.Content
					><Drawer.Header
						><Drawer.Title>{m.invite_title()}</Drawer.Title><Drawer.Description
							>{m.invite_link_hint()}</Drawer.Description
						></Drawer.Header
					>
					<div class="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
						{@render invitationContents()}
					</div></Drawer.Content
				></Drawer.Root
			>{/if}
		{#if requests.error}<p role="alert">{m.invite_error()}</p>
		{:else if requests.data}
			{#if requests.data.length === 0}<p class="text-muted-foreground">
					{m.invite_no_requests()}
				</p>{/if}
			<ul class="flex flex-col gap-4">
				{#each requests.data as request (request.id)}
					<li class="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
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

{#snippet invitationContents()}
	<div class="flex flex-col gap-3">
		{#if link}<Field.FieldGroup
				><Field.Field
					><Field.FieldLabel for="invitation-link">{m.invite_link()}</Field.FieldLabel
					><InputGroup.Root class="min-h-12"
						><InputGroup.Input
							id="invitation-link"
							value={link}
							readonly
							onclick={(event) => event.currentTarget.select()}
						/><InputGroup.Addon align="inline-end"
							><Button
								variant="ghost"
								size="icon"
								class="size-11"
								aria-label={m.invite_copy()}
								onclick={copy}><HugeiconsIcon icon={Copy01Icon} aria-hidden="true" /></Button
							></InputGroup.Addon
						></InputGroup.Root
					></Field.Field
				></Field.FieldGroup
			>
			{#if typeof navigator !== 'undefined' && typeof navigator.share === 'function'}<Button
					variant="outline"
					class="min-h-12"
					onclick={share}>{m.invite_share()}</Button
				>{/if}
		{:else if pending}<p role="status">{m.auth_working()}</p>{/if}
		{#if error}<p role="alert">{m.invite_error()}</p>
			<Button variant="outline" disabled={pending} onclick={() => act(invite)}
				>{m.invite_create()}</Button
			>{/if}
		<p role="status" class="text-sm text-muted-foreground">{feedback}</p>
		<Button variant="ghost" class="min-h-11" onclick={() => (open = false)}>{m.ui_done()}</Button>
	</div>
{/snippet}
