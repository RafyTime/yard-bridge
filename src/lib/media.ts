import { MediaQuery } from 'svelte/reactivity';

/** Wide screens get centred dialogs; phones get bottom drawers. Matches Tailwind's `md`. */
export const desktop = new MediaQuery('(min-width: 768px)');
