<script lang="ts">
	// Throwaway invitation UI shared by the mobile lobby variants.
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import {
		Copy01Icon,
		Share08Icon,
		UserAdd01Icon,
		CheckmarkCircle02Icon
	} from '@hugeicons/core-free-icons';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as InputGroup from '#lib/components/ui/input-group/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import { cn } from '#lib/utils.js';

	let { gameName }: { gameName: string } = $props();
	let open = $state(false);
	let copied = $state(false);
	let feedback = $state('');
	let busy = $state(false);
	let canShare = $state(false);
	const desktop = new MediaQuery('(min-width: 768px)');
	const invitationLink = 'https://example.com/?invite=sample';
	const id = $props.id();
	const shareData = $derived({
		title: `Join ${gameName} on Yard Bridge`,
		text: 'Sample Yard Bridge invitation. This link is for a prototype.',
		url: invitationLink
	});
	onMount(() => {
		canShare =
			typeof navigator.share === 'function' &&
			(!navigator.canShare || navigator.canShare(shareData));
	});

	function prepare() {
		feedback = '';
		copied = false;
	}
	async function copyLink() {
		feedback = '';
		copied = false;
		try {
			await navigator.clipboard.writeText(invitationLink);
			copied = true;
			feedback = 'Invitation link copied.';
		} catch {
			feedback = 'Could not copy automatically. Select the link and copy it manually.';
		}
	}
	async function share() {
		if (busy) return;
		busy = true;
		feedback = '';
		try {
			await navigator.share(shareData);
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'AbortError'))
				feedback = 'Could not open sharing. Copy the invitation link instead.';
		} finally {
			busy = false;
		}
	}
</script>

{#snippet trigger()}
	<HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" aria-hidden="true" /> Invite friends
{/snippet}

{#snippet contents()}
	<div class="flex flex-col gap-3">
		<Field.FieldGroup
			><Field.Field>
				<Field.FieldLabel for="invite-{id}" class="sr-only">Invitation link</Field.FieldLabel>
				<InputGroup.Root class="min-h-12">
					<InputGroup.Input
						id="invite-{id}"
						value={invitationLink}
						readonly
						onclick={(event) => event.currentTarget.select()}
						aria-describedby="sample-{id}"
					/>
					<InputGroup.Addon align="inline-end" class="py-0">
						<Button
							size="icon"
							variant="ghost"
							class="size-11"
							aria-label={copied ? 'Invitation link copied' : 'Copy invitation link'}
							title={copied ? 'Link copied' : 'Copy link'}
							onclick={copyLink}
							><HugeiconsIcon
								icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
								aria-hidden="true"
							/></Button
						>
					</InputGroup.Addon>
				</InputGroup.Root>
				<Field.FieldDescription id="sample-{id}" role="status"
					>{feedback || 'Sample link. It cannot join a game.'}</Field.FieldDescription
				>
			</Field.Field></Field.FieldGroup
		>
		{#if canShare}<Button class="min-h-12 w-full" variant="outline" onclick={share} disabled={busy}
				><HugeiconsIcon icon={Share08Icon} data-icon="inline-start" aria-hidden="true" />Share
				invitation</Button
			>{/if}
	</div>
{/snippet}

{#if desktop.current}
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class={cn(buttonVariants({ variant: 'outline' }), 'min-h-12 w-full')}
			onclick={prepare}>{@render trigger()}</Dialog.Trigger
		>
		<Dialog.Content showCloseButton={false}>
			<Dialog.Header
				><Dialog.Title>Invite friends</Dialog.Title><Dialog.Description
					>{gameName}. You approve each seat request.</Dialog.Description
				></Dialog.Header
			>
			{@render contents()}
			<Dialog.Footer
				><Dialog.Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
					>Done</Dialog.Close
				></Dialog.Footer
			>
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger
			class={cn(buttonVariants({ variant: 'outline' }), 'min-h-12 w-full')}
			onclick={prepare}>{@render trigger()}</Drawer.Trigger
		>
		<Drawer.Content>
			<Drawer.Header
				><Drawer.Title>Invite friends</Drawer.Title><Drawer.Description
					>{gameName}. You approve each seat request.</Drawer.Description
				></Drawer.Header
			>
			<div class="overflow-y-auto px-4">{@render contents()}</div>
			<Drawer.Footer class="pb-[max(1rem,env(safe-area-inset-bottom))]"
				><Drawer.Close class={cn(buttonVariants({ variant: 'ghost' }), 'min-h-11 w-full')}
					>Done</Drawer.Close
				></Drawer.Footer
			>
		</Drawer.Content>
	</Drawer.Root>
{/if}
