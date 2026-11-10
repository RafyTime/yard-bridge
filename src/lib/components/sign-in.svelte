<script lang="ts">
	import { tick } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { useAuth } from '@mmailaender/convex-auth-svelte/svelte';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Loading03Icon } from '@hugeicons/core-free-icons';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import * as m from '#lib/paraglide/messages.js';

	const auth = useAuth();
	let email = $state('');
	let sentTo = $state<string | null>(null);
	let code = $state('');
	let pending = $state(false);
	let error = $state<string | null>(null);
	let codeInput = $state<HTMLInputElement | null>(null);
	let emailInput = $state<HTMLInputElement | null>(null);
	let notice = $state('');

	// Each step slides in; reduced motion swaps steps instantly.
	const stepIn = () => ({ y: 8, duration: prefersReducedMotion.current ? 0 : 200 });

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

	async function changeEmail() {
		sentTo = null;
		code = '';
		error = null;
		notice = '';
		await tick();
		emailInput?.focus();
	}
</script>

{#snippet busy(label: string)}
	<HugeiconsIcon icon={Loading03Icon} class="animate-spin motion-reduce:animate-none" />
	{label}
{/snippet}

<div class="flex flex-col gap-8 pt-6 sm:pt-12">
	<div class="flex flex-col gap-2 text-center">
		<h2 class="text-2xl font-semibold tracking-tight text-balance">{m.auth_welcome_title()}</h2>
		<p class="text-balance text-muted-foreground">{m.auth_intro()}</p>
	</div>

	<div class="overflow-hidden rounded-2xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
		{#key sentTo === null}
			<div class="flex flex-col gap-5" in:fly={stepIn()}>
				<div class="flex flex-col gap-1">
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						{m.auth_step({ step: sentTo === null ? 1 : 2, total: 2 })}
					</p>
					{#if sentTo === null}
						<h3 class="text-lg font-semibold">{m.auth_email_title()}</h3>
						<p class="text-sm text-muted-foreground">{m.auth_email_description()}</p>
					{:else}
						<h3 class="text-lg font-semibold">{m.auth_code_title()}</h3>
						<p class="text-sm text-muted-foreground">{m.auth_code_sent_to()}</p>
						<p class="font-medium break-all">{sentTo}</p>
					{/if}
				</div>

				{#if sentTo === null}
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
							<Button type="submit" class="min-h-11" disabled={pending}>
								{#if pending}{@render busy(m.auth_sending())}{:else}{m.auth_send()}{/if}
							</Button>
						</Field.FieldGroup>
					</form>
				{:else}
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
									class="text-center font-mono text-lg tracking-[0.3em]"
									aria-invalid={!!error}
									aria-describedby="code-hint auth-error"
									disabled={pending}
								/>
								<Field.FieldDescription id="code-hint">{m.auth_code_hint()}</Field.FieldDescription>
							</Field.Field>
							<Button type="submit" class="min-h-11" disabled={pending}>
								{#if pending}{@render busy(m.auth_verifying())}{:else}{m.auth_continue()}{/if}
							</Button>
						</Field.FieldGroup>
					</form>
					<div class="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
						<Button variant="ghost" class="min-h-11" onclick={sendCode} disabled={pending}
							>{m.auth_resend()}</Button
						>
						<Button variant="ghost" class="min-h-11" disabled={pending} onclick={changeEmail}
							>{m.auth_change_email()}</Button
						>
					</div>
				{/if}
			</div>
		{/key}

		<!-- Live regions sit outside the step so announcements survive the swap. -->
		<p id="auth-error" role="alert" class="mt-3 text-sm text-destructive empty:mt-0">
			{error ?? ''}
		</p>
		<p role="status" class="mt-3 text-sm text-muted-foreground empty:mt-0">{notice}</p>
	</div>
</div>
