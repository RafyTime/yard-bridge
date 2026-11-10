// Preview-only profile: username and avatar live in this browser until real profiles exist.
// Nothing here reaches the backend; replace this module when profiles are stored for real.

export type MockProfile = { username: string; avatar: number };

const palettes = [
	['#d9e9ff', '#243b66'],
	['#e4dcff', '#48336e'],
	['#d5eedf', '#244d3b']
] as const;

export const avatarCount = palettes.length * 2;

/** A local SVG data URI, so avatars need no image service. */
export function avatarUri(index: number) {
	const [background, ink] = palettes[index % palettes.length];
	const round = index < palettes.length;
	const smile = round ? 'M17 28 Q24 34 31 28' : 'M19 29 Q24 32 29 29';
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${background}"/><path d="M6 48 Q8 35 24 35 Q40 35 42 48" fill="${ink}"/><rect x="11" y="9" width="26" height="28" rx="${round ? 13 : 9}" fill="${background}" stroke="${ink}" stroke-width="2"/><circle cx="19" cy="22" r="2" fill="${ink}"/><circle cx="29" cy="22" r="2" fill="${ink}"/><path d="${smile}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function initials(username: string) {
	return (
		username
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((word) => word[0].toUpperCase())
			.join('') || '?'
	);
}

// Keyed by email so two accounts sharing a browser keep separate previews.
const storageKey = (email: string) => `yard-bridge:mock-profile:${email}`;

function isProfile(value: unknown): value is MockProfile {
	return (
		typeof value === 'object' &&
		value !== null &&
		'username' in value &&
		typeof value.username === 'string' &&
		'avatar' in value &&
		typeof value.avatar === 'number' &&
		Number.isInteger(value.avatar) &&
		value.avatar >= 0 &&
		value.avatar < avatarCount
	);
}

export function loadProfile(email: string): MockProfile {
	const fallback = { username: email.split('@')[0], avatar: 0 };
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(storageKey(email)) ?? 'null');
		return isProfile(stored) ? stored : fallback;
	} catch {
		// Blocked or corrupt storage only loses the preview, so show the default.
		return fallback;
	}
}

/** Returns false when the browser refuses storage, so the caller can say so. */
export function saveProfile(email: string, profile: MockProfile) {
	try {
		localStorage.setItem(storageKey(email), JSON.stringify(profile));
		return true;
	} catch {
		return false;
	}
}
