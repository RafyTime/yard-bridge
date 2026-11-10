// Temporary mock player data until real profiles exist. Everything here is
// derived from stable ids, so it never reshuffles while a Game updates.
// Names are placeholder mock data, deliberately not translated.

import { avatarPalettes, avatarUri, initials } from './avatar.js';

const adjectives = [
	'Lucky',
	'Mellow',
	'Sunny',
	'Clever',
	'Cozy',
	'Brave',
	'Jolly',
	'Swift',
	'Gentle',
	'Bold',
	'Quiet',
	'Merry'
] as const;
const animals = [
	'Otter',
	'Finch',
	'Fox',
	'Panda',
	'Owl',
	'Lynx',
	'Heron',
	'Badger',
	'Koala',
	'Robin',
	'Seal',
	'Wren'
] as const;
export type MockIdentity = { name: string; initials: string; avatar: string };

// FNV-1a: a small, stable string hash; quality is irrelevant for mock names.
function hash(id: string) {
	let value = 0x811c9dc5;
	for (let index = 0; index < id.length; index++) {
		value ^= id.charCodeAt(index);
		value = Math.imul(value, 0x01000193);
	}
	return value >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
	// Lists are non-empty constants, so the index is always in range.
	return items[seed % items.length]!;
}

export function mockIdentity(seatId: string): MockIdentity {
	const seed = hash(seatId);
	const adjective = pick(adjectives, seed);
	const animal = pick(animals, seed >>> 8);
	const name = `${adjective} ${animal}`;
	return {
		name,
		initials: initials(name),
		avatar: avatarUri(pick(avatarPalettes, seed >>> 16), (seed >>> 24) % 2 === 0)
	};
}

// A Game holds at most four Seats, matching the backend's limit.
export const mockSeatLimit = 4;

/** Mock taken-Seat count for a Game card until the Games list returns real counts. */
export function mockSeatCount(gameId: string) {
	return 1 + (hash(gameId) % mockSeatLimit);
}
