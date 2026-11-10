// Preview-only profile: username and avatar live in this browser until real profiles exist.
// Nothing here reaches the backend; replace this module when profiles are stored for real.

import { avatarPalettes, avatarUri } from './avatar.js';

export type MockProfile = { username: string; avatar: number };

// The preview offers the first three palettes, each with a round and a square face.
const palettes = avatarPalettes.slice(0, 3);

export const avatarCount = palettes.length * 2;

export function profileAvatarUri(index: number) {
	// Indexes are always in range: callers pass a stored avatar or a picker index below avatarCount.
	return avatarUri(palettes[index % palettes.length]!, index < palettes.length);
}

const defaultUsername = (email: string) => email.split('@')[0];

/** The name to show, falling back to the email's local part when the username is blank. */
export function displayName(profile: MockProfile, email: string) {
	return profile.username || defaultUsername(email);
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
	const fallback = { username: defaultUsername(email), avatar: 0 };
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
