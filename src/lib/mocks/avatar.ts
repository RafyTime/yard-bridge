// Mock avatar art shared by mock players and the preview profile until real profiles exist.

export const avatarPalettes = [
	['#d9e9ff', '#243b66'],
	['#e4dcff', '#48336e'],
	['#d5eedf', '#244d3b'],
	['#ffe3d1', '#6b3a1e']
] as const;

export type AvatarPalette = (typeof avatarPalettes)[number];

/** A local SVG data URI, so avatars need no image service. */
export function avatarUri([background, ink]: AvatarPalette, round: boolean) {
	const smile = round ? 'M17 28 Q24 34 31 28' : 'M19 29 Q24 32 29 29';
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${background}"/><path d="M6 48 Q8 35 24 35 Q40 35 42 48" fill="${ink}"/><rect x="11" y="9" width="26" height="28" rx="${round ? 13 : 9}" fill="${background}" stroke="${ink}" stroke-width="2"/><circle cx="19" cy="22" r="2" fill="${ink}"/><circle cx="29" cy="22" r="2" fill="${ink}"/><path d="${smile}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Up to two initials from a display name, or "?" when it is blank. */
export function initials(name: string) {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('') || '?'
	);
}
