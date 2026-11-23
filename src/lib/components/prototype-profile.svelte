<script lang="ts">
	// PROTOTYPE (throwaway): four account-sheet composers for Player Profiles on
	// /?prototype=profile&variant=A|B|C|D, beside a live preview of every place the
	// profile shows (lobby, Host approvals, waiting screen, table, recent moves).
	// All state lives in memory; nothing reaches Convex.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { DiceIcon, PencilEdit01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
	import * as Avatar from '#lib/components/ui/avatar/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import * as Field from '#lib/components/ui/field/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';
	import { cn } from '#lib/utils.js';
	import PrototypeSwitcher from './prototype-switcher.svelte';
	import {
		avatarColors,
		avatarIllustrations,
		avatarUri,
		checkUsername,
		colorOf,
		illustrationOf,
		randomAvatar,
		randomUsername,
		requestCode,
		usernameLimits,
		type AvatarChoice,
		type AvatarColorId,
		type AvatarIllustrationId
	} from './prototype-profile-art';

	const variants = [
		{ key: 'A', name: 'Grid sheet' },
		{ key: 'B', name: 'Stage + tabs' },
		{ key: 'C', name: 'Stepper' },
		{ key: 'D', name: 'Stage + grid' }
	] as const;
	const variant = $derived(
		variants.find(({ key }) => key === page.url.searchParams.get('variant'))?.key ?? 'A'
	);

	// What a Player Profile row would hold. Fixed first, randomized on mount to mimic signup
	// without a server/client hydration mismatch.
	let profile = $state<{ username: string; avatar: AvatarChoice }>({
		username: 'Lucky Otter',
		avatar: { illustration: 'classic', color: 'sky' }
	});
	let draft = $state('Lucky Otter');
	let touched = $state(false);
	let savedAt = $state<string | null>(null);
	const check = $derived(checkUsername(draft));

	onMount(() => {
		const username = randomUsername();
		profile = { username, avatar: randomAvatar() };
		draft = username;
	});

	function saved() {
		savedAt = new Date().toLocaleTimeString();
	}
	function commitUsername() {
		touched = true;
		if (!check.ok) return;
		draft = check.value;
		if (check.value === profile.username) return;
		profile.username = check.value;
		saved();
	}
	function shuffleUsername() {
		draft = randomUsername();
		touched = false;
		commitUsername();
	}
	function setIllustration(id: AvatarIllustrationId) {
		profile.avatar = { ...profile.avatar, illustration: id };
		saved();
	}
	function setColor(id: AvatarColorId) {
		profile.avatar = { ...profile.avatar, color: id };
		saved();
	}
	function surprise() {
		profile.avatar = randomAvatar();
		saved();
	}
	const isIllustration = (value: string): value is AvatarIllustrationId =>
		avatarIllustrations.some(({ id }) => id === value);
	const isColor = (value: string): value is AvatarColorId =>
		avatarColors.some(({ id }) => id === value);

	const illustrationIndex = $derived(
		avatarIllustrations.findIndex(({ id }) => id === profile.avatar.illustration)
	);
	function stepIllustration(step: number) {
		const count = avatarIllustrations.length;
		setIllustration(avatarIllustrations[(illustrationIndex + step + count) % count]!.id);
	}

	// Variant B: which option strip is showing.
	let stageTab = $state<'illustration' | 'color'>('illustration');

	// ---- Mock Game around the profile -------------------------------------------------------
	type Person = { id: string; username: string; avatar: AvatarChoice };
	const seedRequests: Person[] = [
		{ id: 'req-7f3a', username: 'Quiet Wren', avatar: { illustration: 'sleepy', color: 'lilac' } },
		{ id: 'req-91bc', username: 'Quiet Wren', avatar: { illustration: 'sleepy', color: 'lilac' } },
		{ id: 'req-c044', username: 'Quiet Wren', avatar: { illustration: 'crown', color: 'butter' } }
	];
	let others = $state<Person[]>([
		{ id: 'seat-2', username: 'Brave Badger', avatar: { illustration: 'cap', color: 'peach' } },
		{ id: 'seat-3', username: 'Cozy Heron', avatar: { illustration: 'beanie', color: 'teal' } }
	]);
	let requests = $state<Person[]>([...seedRequests]);
	let seat3Copies = $state(false);
	// The requester's own waiting screen, from req-91bc's point of view.
	const watchedRequest = 'req-91bc';

	const seats = $derived([
		{ id: 'seat-1', username: profile.username, avatar: profile.avatar, you: true, host: true },
		...others.map((person) => ({
			...person,
			username: seat3Copies && person.id === 'seat-3' ? profile.username : person.username,
			you: false,
			host: false
		}))
	]);

	const sameLook = (a: AvatarChoice, b: AvatarChoice) =>
		a.illustration === b.illustration && a.color === b.color;
	/** Seat numbers only where a username repeats among seated players. */
	function seatLabel(index: number) {
		const name = seats[index]!.username;
		const repeated = seats.filter((seat) => seat.username === name).length > 1;
		return repeated ? `${name} (Seat ${index + 1})` : name;
	}
	/** Request codes only where pending requests share both username and avatar. */
	function needsCode(person: Person) {
		return requests.some(
			(other) =>
				other.id !== person.id &&
				other.username === person.username &&
				sameLook(other.avatar, person.avatar)
		);
	}
	function approve(person: Person) {
		requests = requests.filter(({ id }) => id !== person.id);
		if (seats.length < 4) others = [...others, { ...person, id: `seat-${seats.length + 1}` }];
	}
	function decline(person: Person) {
		requests = requests.filter(({ id }) => id !== person.id);
	}
	function resetGame() {
		others = others.slice(0, 2);
		requests = [...seedRequests];
		seat3Copies = false;
	}
	const waiting = $derived(requests.find(({ id }) => id === watchedRequest));
	const turnIndex = 2;
</script>

{#snippet face(choice: AvatarChoice, size: string, label = '')}
	<Avatar.Root class={size} aria-hidden={label ? undefined : 'true'}
		><Avatar.Image src={avatarUri(choice)} alt={label} /><Avatar.Fallback>?</Avatar.Fallback
		></Avatar.Root
	>
{/snippet}

{#snippet swatch(id: AvatarColorId, size = 'size-9')}
	{@const color = colorOf(id)}
	<span
		class={cn('relative block rounded-full ring-1 ring-black/10', size)}
		style:background={color.background}
		aria-hidden="true"
		><span class="absolute inset-[30%] rounded-full" style:background={color.ink}></span></span
	>
{/snippet}

{#snippet usernameInput(inputClass = '')}
	<Input
		id="profile-username"
		class={cn('min-h-11', inputClass)}
		bind:value={draft}
		maxlength={48}
		autocomplete="nickname"
		aria-invalid={touched && !check.ok}
		aria-describedby="profile-username-help"
		onblur={commitUsername}
		onkeydown={(event) => event.key === 'Enter' && commitUsername()}
	/>
{/snippet}

{#snippet usernameHelp()}
	<p
		id="profile-username-help"
		class={cn('text-xs', touched && !check.ok ? 'text-destructive' : 'text-muted-foreground')}
		role={touched && !check.ok ? 'alert' : undefined}
	>
		{#if touched && !check.ok}{check.error}{:else}{usernameLimits.min}–{usernameLimits.max} characters.
			Others in your Games see this name; it doesn't need to be unique.{/if}
	</p>
{/snippet}

<!-- A: everything visible at once, two independent pickers stacked under a header. -->
{#snippet variantA()}
	<div class="flex flex-col gap-6 text-sm">
		<div class="flex items-center gap-3">
			{@render face(profile.avatar, 'size-16')}
			<div class="flex min-w-0 flex-col gap-1">
				<h3 class="truncate text-base font-semibold">{profile.username}</h3>
				<p class="text-xs text-muted-foreground">
					{illustrationOf(profile.avatar.illustration).label} on {colorOf(profile.avatar.color)
						.label}
				</p>
			</div>
		</div>
		<Field.Field>
			<Field.FieldLabel for="profile-username">Username</Field.FieldLabel>
			<div class="flex gap-2">
				{@render usernameInput()}
				<Button variant="outline" class="min-h-11" onclick={shuffleUsername}>Shuffle</Button>
			</div>
			{@render usernameHelp()}
		</Field.Field>
		<Field.FieldSet>
			<Field.FieldLegend class="text-sm">Illustration</Field.FieldLegend>
			<ToggleGroup.Root
				type="single"
				spacing={2}
				value={profile.avatar.illustration}
				onValueChange={(value) => isIllustration(value) && setIllustration(value)}
				aria-label="Illustration"
				class="grid grid-cols-6 justify-items-center gap-1"
			>
				{#each avatarIllustrations as item (item.id)}
					<ToggleGroup.Item
						value={item.id}
						aria-label={item.label}
						title={item.label}
						class="aspect-square size-auto w-full max-w-14 rounded-full p-0.5 data-[state=on]:ring-2 data-[state=on]:ring-primary"
						><img
							src={avatarUri({ illustration: item.id, color: profile.avatar.color })}
							alt=""
							class="size-full rounded-full"
						/></ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
		</Field.FieldSet>
		<Field.FieldSet>
			<Field.FieldLegend class="text-sm">Background</Field.FieldLegend>
			<ToggleGroup.Root
				type="single"
				spacing={2}
				value={profile.avatar.color}
				onValueChange={(value) => isColor(value) && setColor(value)}
				aria-label="Background color"
				class="flex flex-wrap gap-2"
			>
				{#each avatarColors as color (color.id)}
					<ToggleGroup.Item
						value={color.id}
						aria-label={color.label}
						title={color.label}
						class="size-11 rounded-full p-1 data-[state=on]:ring-2 data-[state=on]:ring-primary"
						>{@render swatch(color.id)}</ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
		</Field.FieldSet>
		<Button variant="ghost" class="min-h-11 self-start" onclick={surprise}>Surprise me</Button>
	</div>
{/snippet}

<!-- B: one big avatar on a stage; a tab picks which single strip of options shows. -->
{#snippet variantB()}
	<div class="flex flex-col items-center gap-5 text-sm">
		<div class="relative">
			{@render face(profile.avatar, 'size-32')}
			<Button
				variant="secondary"
				size="icon"
				class="absolute -right-1 -bottom-1 size-11 rounded-full shadow"
				onclick={surprise}
				aria-label="Random avatar"
				title="Random avatar"><span aria-hidden="true">🎲</span></Button
			>
		</div>
		<div class="flex w-full max-w-xs flex-col gap-1">
			<label for="profile-username" class="sr-only">Username</label>
			<div class="flex items-center gap-1">
				{@render usernameInput(
					'border-transparent text-center text-lg font-semibold shadow-none hover:border-input focus-visible:border-ring'
				)}
				<Button
					variant="ghost"
					size="icon"
					class="size-11 shrink-0"
					onclick={shuffleUsername}
					aria-label="Random username"
					title="Random username"><span aria-hidden="true">↻</span></Button
				>
			</div>
			<div class="text-center">{@render usernameHelp()}</div>
		</div>
		<ToggleGroup.Root
			type="single"
			variant="outline"
			value={stageTab}
			onValueChange={(value) => {
				if (value === 'illustration' || value === 'color') stageTab = value;
			}}
			aria-label="Edit"
			class="w-full"
		>
			<ToggleGroup.Item value="illustration" class="min-h-11 flex-1">Illustration</ToggleGroup.Item>
			<ToggleGroup.Item value="color" class="min-h-11 flex-1">Background</ToggleGroup.Item>
		</ToggleGroup.Root>
		<div class="-mx-1 w-full overflow-x-auto px-1 pb-2">
			{#if stageTab === 'illustration'}
				<ToggleGroup.Root
					type="single"
					spacing={2}
					value={profile.avatar.illustration}
					onValueChange={(value) => isIllustration(value) && setIllustration(value)}
					aria-label="Illustration"
					class="flex w-max gap-3"
				>
					{#each avatarIllustrations as item (item.id)}
						<ToggleGroup.Item
							value={item.id}
							aria-label={item.label}
							class="flex h-auto flex-col gap-1 rounded-xl p-1.5 data-[state=on]:bg-accent data-[state=on]:ring-2 data-[state=on]:ring-primary"
							><img
								src={avatarUri({ illustration: item.id, color: profile.avatar.color })}
								alt=""
								class="size-16 rounded-full"
							/><span class="text-xs">{item.label}</span></ToggleGroup.Item
						>
					{/each}
				</ToggleGroup.Root>
			{:else}
				<ToggleGroup.Root
					type="single"
					spacing={2}
					value={profile.avatar.color}
					onValueChange={(value) => isColor(value) && setColor(value)}
					aria-label="Background color"
					class="flex w-max gap-3"
				>
					{#each avatarColors as color (color.id)}
						<ToggleGroup.Item
							value={color.id}
							aria-label={color.label}
							class="flex h-auto flex-col gap-1 rounded-xl p-1.5 data-[state=on]:bg-accent data-[state=on]:ring-2 data-[state=on]:ring-primary"
							><img
								src={avatarUri({ illustration: profile.avatar.illustration, color: color.id })}
								alt=""
								class="size-16 rounded-full"
							/><span class="text-xs">{color.label}</span></ToggleGroup.Item
						>
					{/each}
				</ToggleGroup.Root>
			{/if}
		</div>
	</div>
{/snippet}

<!-- C: compact; arrows flip illustrations, a dot row picks color. No grid to scan. -->
{#snippet variantC()}
	<div class="flex flex-col gap-6 text-sm">
		<div class="flex flex-col items-center gap-3">
			<div class="flex items-center gap-4">
				<Button
					variant="outline"
					size="icon"
					class="size-11 rounded-full"
					onclick={() => stepIllustration(-1)}
					aria-label="Previous illustration">‹</Button
				>
				{@render face(profile.avatar, 'size-24')}
				<Button
					variant="outline"
					size="icon"
					class="size-11 rounded-full"
					onclick={() => stepIllustration(1)}
					aria-label="Next illustration">›</Button
				>
			</div>
			<p class="text-xs text-muted-foreground" aria-live="polite">
				{illustrationOf(profile.avatar.illustration).label} · {illustrationIndex + 1} of {avatarIllustrations.length}
			</p>
			<ToggleGroup.Root
				type="single"
				spacing={2}
				value={profile.avatar.color}
				onValueChange={(value) => isColor(value) && setColor(value)}
				aria-label="Background color"
				class="flex flex-wrap justify-center gap-1"
			>
				{#each avatarColors as color (color.id)}
					<ToggleGroup.Item
						value={color.id}
						aria-label={color.label}
						title={color.label}
						class="size-11 rounded-full p-2 data-[state=on]:ring-2 data-[state=on]:ring-primary"
						>{@render swatch(color.id, 'size-7')}</ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
		</div>
		<Separator />
		<Field.Field>
			<Field.FieldLabel for="profile-username">Username</Field.FieldLabel>
			<div class="relative">
				{@render usernameInput('pr-24')}
				<Button
					variant="ghost"
					class="absolute top-0 right-0 min-h-11 text-xs"
					onclick={shuffleUsername}>New name</Button
				>
			</div>
			{@render usernameHelp()}
		</Field.Field>
	</div>
{/snippet}

<!-- D: B's stage with A's always-visible pickers, sized for a phone-width sheet. -->
{#snippet variantD()}
	<div class="flex flex-col items-center gap-5 text-sm">
		<div class="relative">
			{@render face(profile.avatar, 'size-32')}
			<Button
				variant="secondary"
				size="icon"
				class="absolute -right-1 -bottom-1 size-11 rounded-full shadow"
				onclick={surprise}
				aria-label="Random avatar"
				title="Random avatar"><HugeiconsIcon icon={DiceIcon} size={20} aria-hidden="true" /></Button
			>
		</div>
		<div class="flex w-full max-w-xs flex-col gap-1">
			<label for="profile-username" class="sr-only">Username</label>
			<div class="flex items-center gap-1">
				<!-- Spacer balances the refresh button so the name stays centred. -->
				<span class="size-11 shrink-0" aria-hidden="true"></span>
				<div class="relative min-w-0 flex-1">
					{@render usernameInput(
						'rounded-none border-0 border-b border-dashed border-muted-foreground/50 bg-transparent px-8 text-center text-lg font-semibold shadow-none focus-visible:border-solid focus-visible:border-ring focus-visible:ring-0 dark:bg-transparent'
					)}
					<HugeiconsIcon
						icon={PencilEdit01Icon}
						size={16}
						class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="size-11 shrink-0"
					onclick={shuffleUsername}
					aria-label="Random username"
					title="Random username"
					><HugeiconsIcon icon={RefreshIcon} size={20} aria-hidden="true" /></Button
				>
			</div>
			<div class="text-center">{@render usernameHelp()}</div>
		</div>
		<ToggleGroup.Root
			type="single"
			spacing={2}
			value={profile.avatar.color}
			onValueChange={(value) => isColor(value) && setColor(value)}
			aria-label="Background color"
			class="grid w-full grid-cols-8 justify-items-center"
		>
			{#each avatarColors as color (color.id)}
				<ToggleGroup.Item
					value={color.id}
					aria-label={color.label}
					title={color.label}
					class="size-11 rounded-full p-1.5 data-[state=on]:ring-2 data-[state=on]:ring-primary"
					>{@render swatch(color.id, 'size-8')}</ToggleGroup.Item
				>
			{/each}
		</ToggleGroup.Root>
		<ToggleGroup.Root
			type="single"
			spacing={2}
			value={profile.avatar.illustration}
			onValueChange={(value) => isIllustration(value) && setIllustration(value)}
			aria-label="Illustration"
			class="grid w-full grid-cols-4 justify-items-center gap-3"
		>
			{#each avatarIllustrations as item (item.id)}
				<ToggleGroup.Item
					value={item.id}
					aria-label={item.label}
					title={item.label}
					class="aspect-square size-auto w-full max-w-20 rounded-full p-1 data-[state=on]:ring-2 data-[state=on]:ring-primary"
					><img
						src={avatarUri({ illustration: item.id, color: profile.avatar.color })}
						alt=""
						class="size-full rounded-full"
					/></ToggleGroup.Item
				>
			{/each}
		</ToggleGroup.Root>
	</div>
{/snippet}

<main class="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-4 pt-4 pb-28">
	<header class="flex items-center justify-between">
		<p class="font-semibold">Yard Bridge</p>
		<Badge variant="outline" class="border-fuchsia-400 text-fuchsia-600">Profile prototype</Badge>
		{@render face(profile.avatar, 'size-9', profile.username)}
	</header>

	<div class="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
		<section
			class="flex flex-col gap-4 md:rounded-2xl md:border md:p-5"
			aria-labelledby="sheet-heading"
		>
			<div>
				<h2 id="sheet-heading" class="text-base font-semibold">Account</h2>
				<p class="text-xs text-muted-foreground">
					Only you see your sign-in email: <span class="break-all">you@example.com</span>
				</p>
			</div>
			{#if variant === 'A'}{@render variantA()}{:else if variant === 'B'}{@render variantB()}{:else if variant === 'C'}{@render variantC()}{:else}{@render variantD()}{/if}
			<Separator />
			<div class="flex flex-col gap-1">
				<p class="text-xs font-medium">Stored Player Profile</p>
				<pre class="overflow-x-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(
						profile,
						null,
						2
					)}</pre>
				<p class="text-xs text-muted-foreground" aria-live="polite">
					{savedAt ? `Saved ${savedAt}` : 'Assigned at signup'} · draft: “{draft}” → {check.ok
						? `“${check.value}”`
						: 'invalid'}
				</p>
			</div>
		</section>

		<section class="flex flex-col gap-6" aria-labelledby="where-heading">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="where-heading" class="text-base font-semibold">Where it shows (live)</h2>
				<div class="flex gap-2">
					<Button
						variant={seat3Copies ? 'secondary' : 'outline'}
						size="sm"
						onclick={() => (seat3Copies = !seat3Copies)}
						>{seat3Copies ? 'Seat 3 uses own name' : 'Seat 3 copies your name'}</Button
					>
					<Button variant="ghost" size="sm" onclick={resetGame}>Reset</Button>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium text-muted-foreground">Lobby</h3>
				<ul class="flex flex-col divide-y rounded-xl border px-4">
					{#each seats as seat, index (seat.id)}
						<li class="flex min-w-0 items-center gap-3 py-3">
							{@render face(seat.avatar, 'size-10')}
							<div class="flex min-w-0 flex-1 flex-col gap-1">
								<p class="truncate font-medium">{seat.username}</p>
								<div class="flex flex-wrap items-center gap-1.5">
									<p class="text-xs text-muted-foreground">Seat {index + 1}</p>
									{#if seat.host}<Badge variant="outline">Host</Badge>{/if}
									{#if seat.you}<Badge variant="secondary">You</Badge>{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium text-muted-foreground">Host approvals</h3>
				{#if requests.length === 0}
					<p class="text-sm text-muted-foreground">No pending requests.</p>
				{/if}
				<ul class="flex flex-col gap-2">
					{#each requests as person (person.id)}
						<li class="flex min-w-0 items-center gap-3 rounded-xl border p-3">
							{@render face(person.avatar, 'size-10')}
							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<p class="truncate font-medium">{person.username}</p>
								{#if needsCode(person)}
									<p class="text-xs text-muted-foreground">
										Code <span class="font-mono font-semibold tracking-wider text-foreground"
											>{requestCode(person.id)}</span
										>
									</p>
								{/if}
							</div>
							<Button size="sm" variant="outline" onclick={() => decline(person)}>Decline</Button>
							<Button size="sm" onclick={() => approve(person)} disabled={seats.length >= 4}
								>Approve</Button
							>
						</li>
					{/each}
				</ul>
				<p class="text-xs text-muted-foreground">
					No emails here. Codes appear only while two requests share both name and avatar.
				</p>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium text-muted-foreground">
					Waiting screen (requester {watchedRequest})
				</h3>
				<div class="flex items-center gap-3 rounded-xl border border-dashed p-3">
					{@render face(profile.avatar, 'size-10')}
					<div class="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
						{#if waiting}
							<p>Waiting for <span class="font-medium">{profile.username}</span> to approve you.</p>
							{#if needsCode(waiting)}
								<p class="text-xs text-muted-foreground">
									Tell the Host your code: <span class="font-mono font-semibold text-foreground"
										>{requestCode(waiting.id)}</span
									>
								</p>
							{/if}
						{:else}
							<p class="text-muted-foreground">Request resolved.</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<h3 class="text-sm font-medium text-muted-foreground">Table and recent moves</h3>
				<div class="flex flex-wrap gap-3 rounded-xl border p-3">
					{#each seats as seat, index (seat.id)}
						<div
							class={cn(
								'flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs',
								index === turnIndex % seats.length && 'border-primary bg-accent'
							)}
						>
							{@render face(seat.avatar, 'size-7')}<span class="max-w-32 truncate"
								>{seatLabel(index)}</span
							>
						</div>
					{/each}
				</div>
				<ul class="flex flex-col gap-1 text-sm">
					<li>
						<span class="font-medium">{seatLabel(turnIndex % seats.length)}</span>'s turn
					</li>
					<li class="text-muted-foreground">{seatLabel(0)} played a 7 of hearts</li>
					<li class="text-muted-foreground">{seatLabel(1)} drew a card</li>
				</ul>
			</div>
		</section>
	</div>
</main>

<PrototypeSwitcher {variants} />
