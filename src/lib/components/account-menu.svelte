<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Cancel01Icon, UserIcon } from '@hugeicons/core-free-icons';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import * as Drawer from '#lib/components/ui/drawer/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import {
		avatarCount,
		avatarUri,
		initials,
		loadProfile,
		saveProfile,
		type MockProfile
	} from '#lib/mocks/profile.js';
	import * as m from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';

	let {
		signedIn,
		email,
		onSignedOut
	}: {
		signedIn: boolean;
		/** Null while signed out or while the session's identity is still loading. */
		email: string | null;
		onSignedOut: () => void;
	} = $props();

	const auth = useAuth();
	const desktop = new MediaQuery('(min-width: 768px)');
	const languageNames = {
		en: m.settings_language_en,
		es: m.settings_language_es,
		uk: m.settings_language_uk
	} satisfies Record<Locale, () => string>;
	const modes = [
		['light', m.settings_light],
		['dark', m.settings_dark],
		['system', m.settings_system]
	] as const;
	const isMode = (value: string): value is (typeof modes)[number][0] =>
		modes.some(([mode]) => mode === value);
	const isLocale = (value: string): value is Locale => locales.some((locale) => locale === value);

	let open = $state(false);
	let profile = $derived(email ? loadProfile(email) : null);
	let saveFailed = $state(false);
	let signingOut = $state(false);
	let signOutFailed = $state(false);

	function updateProfile(next: MockProfile) {
		if (!email) return;
		profile = next;
		saveFailed = !saveProfile(email, next);
	}

	async function signOut() {
		if (signingOut) return;
		signingOut = true;
		signOutFailed = false;
		try {
			await auth.signOut();
			open = false;
			onSignedOut();
		} catch {
			signOutFailed = true;
		} finally {
			signingOut = false;
		}
	}
</script>

{#snippet trigger()}
	{#if profile}
		<Avatar.Root class="size-9"
			><Avatar.Image src={avatarUri(profile.avatar)} alt="" /><Avatar.Fallback
				>{initials(profile.username)}</Avatar.Fallback
			></Avatar.Root
		>
	{:else}<HugeiconsIcon icon={UserIcon} size={22} aria-hidden="true" />{/if}
{/snippet}

{#snippet settings()}
	<div class="flex flex-col gap-6 text-sm">
		{#if profile && email}
			<section class="flex flex-col gap-4" aria-labelledby="profile-heading">
				<div class="flex min-w-0 items-center gap-3">
					<Avatar.Root class="size-14"
						><Avatar.Image src={avatarUri(profile.avatar)} alt="" /><Avatar.Fallback
							>{initials(profile.username)}</Avatar.Fallback
						></Avatar.Root
					>
					<div class="flex min-w-0 flex-col gap-1">
						<h3 id="profile-heading" class="truncate text-base font-semibold">
							{profile.username || email.split('@')[0]}
						</h3>
						<p class="text-xs text-muted-foreground">
							<span class="sr-only">{m.account_email()}: </span><span class="break-all"
								>{email}</span
							>
						</p>
					</div>
				</div>
				<div class="flex flex-col gap-2 rounded-lg border border-dashed p-3">
					<Badge variant="secondary" class="self-start">{m.profile_preview()}</Badge>
					<p class="text-xs text-muted-foreground">{m.profile_preview_hint()}</p>
				</div>
				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="profile-username">{m.profile_username()}</Field.FieldLabel>
						<Input
							id="profile-username"
							class="min-h-11"
							value={profile.username}
							maxlength={32}
							autocomplete="nickname"
							oninput={(event) =>
								profile && updateProfile({ ...profile, username: event.currentTarget.value })}
						/>
					</Field.Field>
					<Field.FieldSet>
						<Field.FieldLegend class="text-sm">{m.profile_avatar()}</Field.FieldLegend>
						<ToggleGroup.Root
							type="single"
							spacing={2}
							value={String(profile.avatar)}
							onValueChange={(value) => {
								const avatar = Number(value);
								if (profile && value && Number.isInteger(avatar))
									updateProfile({ ...profile, avatar });
							}}
							aria-label={m.profile_avatar()}
							class="grid grid-cols-6 justify-items-center gap-1"
						>
							{#each Array.from({ length: avatarCount }, (_, index) => index) as index (index)}
								<ToggleGroup.Item
									value={String(index)}
									aria-label={m.profile_avatar_option({ number: index + 1 })}
									class="aspect-square size-auto w-full max-w-12 rounded-full p-0.5 data-[state=on]:ring-2 data-[state=on]:ring-primary"
									><img
										src={avatarUri(index)}
										alt=""
										class="size-full rounded-full"
									/></ToggleGroup.Item
								>
							{/each}
						</ToggleGroup.Root>
					</Field.FieldSet>
				</Field.FieldGroup>
				{#if saveFailed}<p role="alert" class="text-destructive">{m.profile_save_error()}</p>{/if}
			</section>
			<Separator />
		{/if}
		<Field.FieldSet>
			<Field.FieldLegend class="text-sm">{m.settings_language()}</Field.FieldLegend>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				value={getLocale()}
				onValueChange={(value) => {
					// Paraglide's URL strategy navigates to the localized page, which keeps the choice.
					if (isLocale(value) && value !== getLocale()) void setLocale(value);
				}}
				aria-label={m.settings_language()}
				class="w-full"
			>
				{#each locales as locale (locale)}
					<ToggleGroup.Item
						value={locale}
						lang={locale}
						class="min-h-11 min-w-0 flex-1 px-1 whitespace-normal"
						>{languageNames[locale]()}</ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
		</Field.FieldSet>
		<Field.FieldSet>
			<Field.FieldLegend class="text-sm">{m.settings_appearance()}</Field.FieldLegend>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				value={userPrefersMode.current}
				onValueChange={(value) => {
					// mode-watcher applies the class and persists the choice in localStorage.
					if (isMode(value)) setMode(value);
				}}
				aria-label={m.settings_appearance()}
				class="w-full"
			>
				{#each modes as [mode, label] (mode)}
					<ToggleGroup.Item value={mode} class="min-h-11 min-w-0 flex-1 px-1 whitespace-normal"
						>{label()}</ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
		</Field.FieldSet>
		{#if signedIn}
			<Separator />
			<div class="flex flex-col gap-2">
				<Button variant="outline" class="min-h-11" onclick={signOut} disabled={signingOut}
					>{signingOut ? m.auth_working() : m.auth_sign_out()}</Button
				>
				{#if signOutFailed}<p role="alert" class="text-destructive">
						{m.auth_sign_out_error()}
					</p>{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#if desktop.current}
	<Dialog.Root bind:open>
		<Dialog.Trigger
			class={buttonVariants({ variant: 'ghost', class: 'size-11 rounded-full p-0' })}
			aria-label={m.account_title()}>{@render trigger()}</Dialog.Trigger
		>
		<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title class="text-base">{m.account_title()}</Dialog.Title>
				<Dialog.Description
					>{signedIn ? m.account_description() : m.settings_description()}</Dialog.Description
				>
			</Dialog.Header>
			{@render settings()}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger
			class={buttonVariants({ variant: 'ghost', class: 'size-11 rounded-full p-0' })}
			aria-label={m.account_title()}>{@render trigger()}</Drawer.Trigger
		>
		<!-- Full height on phones: the settings are a panel of their own, not a quick action. -->
		<Drawer.Content
			class="h-dvh data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh"
		>
			<Drawer.Header
				class="flex-row items-start justify-between gap-2 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left"
			>
				<div class="flex min-w-0 flex-col gap-1">
					<Drawer.Title class="text-base">{m.account_title()}</Drawer.Title>
					<Drawer.Description
						>{signedIn ? m.account_description() : m.settings_description()}</Drawer.Description
					>
				</div>
				<Drawer.Close
					class={buttonVariants({ variant: 'ghost', size: 'icon', class: 'size-11 shrink-0' })}
					><HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" /><span class="sr-only"
						>{m.ui_close()}</span
					></Drawer.Close
				>
			</Drawer.Header>
			<div class="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
				{@render settings()}
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
