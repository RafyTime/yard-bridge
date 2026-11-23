<script lang="ts">
	// PROTOTYPE (throwaway): floating variant switcher, synced to ?variant= and ←/→ keys.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { variants }: { variants: readonly { key: string; name: string }[] } = $props();

	const index = $derived(
		Math.max(
			0,
			variants.findIndex(({ key }) => key === page.url.searchParams.get('variant'))
		)
	);

	function go(step: number) {
		const next = variants[(index + step + variants.length) % variants.length];
		if (!next) return;
		const url = new URL(page.url.href);
		url.searchParams.set('variant', next.key);
		void goto(url, { replace: true, reset: false });
	}

	function onkeydown(event: KeyboardEvent) {
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.closest('input, textarea, [contenteditable]') || target.isContentEditable)
		)
			return;
		if (event.key === 'ArrowLeft') go(-1);
		if (event.key === 'ArrowRight') go(1);
	}
</script>

<svelte:window {onkeydown} />

{#if import.meta.env.DEV}
	<div
		class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-1.5 py-1 font-mono text-xs text-white shadow-lg ring-2 ring-fuchsia-400"
	>
		<button class="size-9 rounded-full hover:bg-white/15" onclick={() => go(-1)}>
			<span aria-hidden="true">←</span><span class="sr-only">Previous variant</span>
		</button>
		<span class="px-2 whitespace-nowrap" aria-live="polite"
			>{variants[index]?.key} · {variants[index]?.name}</span
		>
		<button class="size-9 rounded-full hover:bg-white/15" onclick={() => go(1)}>
			<span aria-hidden="true">→</span><span class="sr-only">Next variant</span>
		</button>
	</div>
{/if}
