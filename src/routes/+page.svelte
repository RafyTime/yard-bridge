<script>
	import { Button } from '$lib/components/ui/button';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { SunIcon, Moon02Icon } from '@hugeicons/core-free-icons';
	import { toggleMode } from 'mode-watcher';
</script>

<div class="flex min-h-screen flex-col items-center justify-center space-y-5">
	<h1 class="text-3xl font-bold">Welcome to Yard Bridge</h1>
	<Button size="lg" class="p-5 text-xl">This is a button</Button>
	<Button onclick={toggleMode} variant="ghost" size="icon-lg">
		<HugeiconsIcon
			icon={SunIcon}
			class="scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
		/>
		<HugeiconsIcon
			icon={Moon02Icon}
			class="absolute scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
		/>
		<span class="sr-only">Toggle theme</span>
	</Button>
</div>
