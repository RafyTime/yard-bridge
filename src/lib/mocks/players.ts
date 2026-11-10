// Temporary mock player data until real profiles exist. Everything here is
// derived from stable ids, so it never reshuffles while a Game updates.
// Names are placeholder mock data, deliberately not translated.

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
const colors = [
	['#d9e9ff', '#243b66'],
	['#e4dcff', '#48336e'],
	['#d5eedf', '#244d3b'],
	['#ffe3d1', '#6b3a1e']
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
	const [background, ink] = pick(colors, seed >>> 16);
	const round = (seed >>> 24) % 2 === 0;
	const smile = round ? 'M17 28 Q24 34 31 28' : 'M19 29 Q24 32 29 29';
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${background}"/><path d="M6 48 Q8 35 24 35 Q40 35 42 48" fill="${ink}"/><rect x="11" y="9" width="26" height="28" rx="${round ? 13 : 9}" fill="${background}" stroke="${ink}" stroke-width="2"/><circle cx="19" cy="22" r="2" fill="${ink}"/><circle cx="29" cy="22" r="2" fill="${ink}"/><path d="${smile}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/></svg>`;
	return {
		name: `${adjective} ${animal}`,
		initials: `${adjective[0]}${animal[0]}`,
		avatar: `data:image/svg+xml,${encodeURIComponent(svg)}`
	};
}

// Tables hold at most four Seats, matching the backend's limit.
export const mockSeatLimit = 4;

/** Mock taken-Seat count for a Game card until the Games list returns real counts. */
export function mockSeatCount(gameId: string) {
	return 1 + (hash(gameId) % mockSeatLimit);
}
