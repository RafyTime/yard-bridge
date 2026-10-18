<script lang="ts">
	import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
	import { useQuery } from 'convex-svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';
	import { api } from '../convex/_generated/api';

	const auth = useAuth();
	const viewer = useQuery(api.players.viewer, () => (auth.isAuthenticated ? {} : 'skip'));
	let email = $state('');
	let sentTo = $state<string | null>(null);
	let code = $state('');
	let pending = $state(false);
	let error = $state<string | null>(null);
	let codeInput = $state<HTMLInputElement | null>(null);
	let emailInput = $state<HTMLInputElement | null>(null);
	let notice = $state('');

	$effect(() => {
		if (sentTo !== null) codeInput?.focus();
	});

	async function sendCode() {
		if (pending) return;
		pending = true;
		error = null;
		notice = '';
		const address = sentTo ?? email.trim().toLowerCase();
		try {
			await auth.signIn('resend-otp', { email: address });
			sentTo = address;
			code = '';
			notice = m.auth_code_sent();
			codeInput?.focus();
		} catch {
			error = m.auth_send_error();
		} finally {
			pending = false;
		}
	}

	async function verifyCode(event: SubmitEvent) {
		event.preventDefault();
		if (pending || sentTo === null) return;
		pending = true;
		error = null;
		notice = '';
		try {
			const result = await auth.signIn('resend-otp', { email: sentTo, code: code.trim() });
			if (!result.signingIn) error = m.auth_code_error();
			else code = '';
		} catch {
			error = m.auth_code_error();
		} finally {
			pending = false;
		}
	}

	async function signOut() {
		if (pending) return;
		pending = true;
		error = null;
		try {
			await auth.signOut();
			sentTo = null;
			code = '';
			email = '';
			notice = '';
		} catch {
			error = m.auth_sign_out_error();
		} finally {
			pending = false;
		}
	}
</script>

<svelte:head><title>Yard Bridge</title></svelte:head>

<main class="flex min-h-svh items-center justify-center px-5 py-10">
	<section class="flex w-full max-w-sm flex-col gap-6" aria-labelledby="welcome-heading">
		<header class="flex flex-col gap-2">
			<p class="text-sm font-medium text-muted-foreground">Yard Bridge</p>
			<h1 id="welcome-heading" class="text-3xl font-semibold">{m.auth_welcome()}</h1>
		</header>
		{#if auth.isLoading}
			<p role="status">{m.auth_loading()}</p>
		{:else if auth.isAuthenticated}
			{#if viewer.error}
				<p role="alert">{m.auth_identity_error()}</p>
			{:else if viewer.data}
				<h2 class="text-xl font-medium">{m.auth_signed_in()}</h2>
				<p class="break-all">{viewer.data.email}</p>
				<p class="text-muted-foreground">{m.auth_return_hint()}</p>
			{:else}
				<p role="status">{m.auth_loading()}</p>
			{/if}
			<Button class="min-h-11" onclick={signOut} disabled={pending}>{m.auth_sign_out()}</Button>
		{:else if sentTo !== null}
			<p class="break-words">{m.auth_check_email({ email: sentTo })}</p>
			<form onsubmit={verifyCode} aria-busy={pending}>
				<Field.FieldGroup>
					<Field.Field data-invalid={!!error}>
						<Field.FieldLabel for="code">{m.auth_code_label()}</Field.FieldLabel>
						<Input
							id="code"
							name="code"
							bind:ref={codeInput}
							bind:value={code}
							type="text"
							inputmode="numeric"
							autocomplete="one-time-code"
							pattern={'[0-9]{8}'}
							minlength={8}
							maxlength={8}
							required
							aria-invalid={!!error}
							aria-describedby="code-hint auth-error"
							disabled={pending}
						/>
						<Field.FieldDescription id="code-hint">{m.auth_code_hint()}</Field.FieldDescription>
					</Field.Field>
					<Button type="submit" class="min-h-11" disabled={pending}
						>{pending ? m.auth_working() : m.auth_continue()}</Button
					>
				</Field.FieldGroup>
			</form>
			<div class="flex flex-col gap-2">
				<Button variant="outline" class="min-h-11" onclick={sendCode} disabled={pending}
					>{m.auth_resend()}</Button
				>
				<Button
					variant="ghost"
					class="min-h-11"
					disabled={pending}
					onclick={() => {
						sentTo = null;
						code = '';
						error = null;
						notice = '';
						queueMicrotask(() => emailInput?.focus());
					}}>{m.auth_change_email()}</Button
				>
			</div>
		{:else}
			<p class="text-muted-foreground">{m.auth_intro()}</p>
			<form
				aria-busy={pending}
				onsubmit={(event) => {
					event.preventDefault();
					void sendCode();
				}}
			>
				<Field.FieldGroup>
					<Field.Field data-invalid={!!error}>
						<Field.FieldLabel for="email">{m.auth_email_label()}</Field.FieldLabel>
						<Input
							id="email"
							name="email"
							bind:ref={emailInput}
							bind:value={email}
							type="email"
							autocomplete="email"
							autocapitalize="none"
							spellcheck={false}
							required
							disabled={pending}
							aria-invalid={!!error}
							aria-describedby="auth-error"
						/>
					</Field.Field>
					<Button type="submit" class="min-h-11" disabled={pending}
						>{pending ? m.auth_working() : m.auth_send()}</Button
					>
				</Field.FieldGroup>
			</form>
		{/if}
		<p id="auth-error" role="alert" class="text-sm text-destructive">{error ?? ''}</p>
		<p role="status" class="text-sm text-muted-foreground">{notice}</p>
	</section>
</main>
