// PROTOTYPE (throwaway): Player Profile art, names, and username rules for /?prototype=profile.
// #53 and #54 should lift the validated pieces (illustrations, palette, word lists,
// normalization) into real modules with tests. Nothing here touches the backend.

/** Fixed palette: a light background and a dark ink that pairs with it. Ids are what we'd store. */
export const avatarColors = [
	{ id: 'sky', label: 'Sky', background: '#d9e9ff', ink: '#243b66' },
	{ id: 'lilac', label: 'Lilac', background: '#e4dcff', ink: '#48336e' },
	{ id: 'mint', label: 'Mint', background: '#d5eedf', ink: '#244d3b' },
	{ id: 'peach', label: 'Peach', background: '#ffe3d1', ink: '#6b3a1e' },
	{ id: 'rose', label: 'Rose', background: '#ffdbe4', ink: '#6e2840' },
	{ id: 'butter', label: 'Butter', background: '#fff1b8', ink: '#5c4a0f' },
	{ id: 'teal', label: 'Teal', background: '#c9eeec', ink: '#1d4f4c' },
	{ id: 'sand', label: 'Sand', background: '#ece3d4', ink: '#4a3d2a' }
] as const;

export type AvatarColor = (typeof avatarColors)[number];
export type AvatarColorId = AvatarColor['id'];

type Ink = { ink: string; background: string; face: string };
type Illustration = {
	id: string;
	label: string;
	/** Head corner radius: 11 is the round face, 6 the square one. */
	radius: number;
	sleepy?: boolean;
	/** Drawn behind the head (hair, headphone band). */
	back?: (ink: Ink) => string;
	/** Drawn over the head (hats, glasses, beard). */
	front?: (ink: Ink) => string;
	/** Beards cover the mouth, so the smile switches to the face colour. */
	mouthOnInk?: boolean;
};

// Each keeps the mock's face-and-shoulders motif; accessories carry the variety.
export const avatarIllustrations = [
	{ id: 'classic', label: 'Classic', radius: 11 },
	{ id: 'square', label: 'Square', radius: 6 },
	{
		id: 'glasses',
		label: 'Glasses',
		radius: 11,
		front: ({ ink }) =>
			`<circle cx="19.5" cy="23" r="3.6" fill="none" stroke="${ink}" stroke-width="1.6"/><circle cx="28.5" cy="23" r="3.6" fill="none" stroke="${ink}" stroke-width="1.6"/><path d="M23.1 23h1.8" stroke="${ink}" stroke-width="1.6"/>`
	},
	{
		id: 'cap',
		label: 'Cap',
		radius: 11,
		front: ({ ink }) =>
			`<path d="M13 19Q13 9 24 9Q35 9 35 19Z" fill="${ink}"/><rect x="24" y="17" width="16" height="3" rx="1.5" fill="${ink}"/>`
	},
	{
		id: 'bun',
		label: 'Bun',
		radius: 11,
		back: ({ ink }) => `<circle cx="24" cy="8" r="4.5" fill="${ink}"/>`,
		front: ({ ink }) =>
			`<path d="M13 20Q13 11 24 11Q35 11 35 20Q31 15 24 15Q17 15 13 20Z" fill="${ink}"/>`
	},
	{
		id: 'beanie',
		label: 'Beanie',
		radius: 11,
		front: ({ ink, background }) =>
			`<circle cx="24" cy="6" r="3" fill="${ink}"/><path d="M12.5 19Q12.5 7.5 24 7.5Q35.5 7.5 35.5 19Z" fill="${ink}"/><rect x="11.5" y="16.5" width="25" height="4" rx="2" fill="${background}" stroke="${ink}" stroke-width="1.6"/>`
	},
	{
		id: 'curls',
		label: 'Curls',
		radius: 11,
		back: ({ ink }) =>
			[
				[14, 16],
				[16, 11],
				[20.5, 8.5],
				[27.5, 8.5],
				[32, 11],
				[34, 16]
			]
				.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${ink}"/>`)
				.join(''),
		front: ({ ink }) =>
			`<path d="M15 17Q19 13 24 15Q29 13 33 17Q30 11 24 11Q18 11 15 17Z" fill="${ink}"/>`
	},
	{
		id: 'headphones',
		label: 'Headphones',
		radius: 11,
		back: ({ ink }) =>
			`<path d="M11 24Q11 7 24 7Q37 7 37 24" fill="none" stroke="${ink}" stroke-width="2.4"/>`,
		front: ({ ink }) =>
			`<rect x="8.5" y="19.5" width="6" height="9" rx="3" fill="${ink}"/><rect x="33.5" y="19.5" width="6" height="9" rx="3" fill="${ink}"/>`
	},
	{
		id: 'sleepy',
		label: 'Sleepy',
		radius: 11,
		sleepy: true,
		front: ({ ink }) =>
			`<circle cx="17" cy="27.5" r="2" fill="${ink}" opacity=".18"/><circle cx="31" cy="27.5" r="2" fill="${ink}" opacity=".18"/>`
	},
	{
		id: 'crown',
		label: 'Crown',
		radius: 11,
		front: ({ ink }) =>
			`<path d="M15.5 14V5.5l4.2 4 4.3-5 4.3 5 4.2-4V14Z" fill="${ink}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`
	},
	{
		id: 'beard',
		label: 'Beard',
		radius: 11,
		mouthOnInk: true,
		front: ({ ink }) =>
			`<path d="M13 25Q13 39 24 39Q35 39 35 25Q32 30 24 30Q16 30 13 25Z" fill="${ink}"/>`
	},
	{
		id: 'visor',
		label: 'Dealer visor',
		radius: 6,
		front: ({ ink }) =>
			`<path d="M11 18.5Q24 12 37 18.5L38.5 22Q24 15.5 9.5 22Z" fill="${ink}"/><path d="M13 15.5Q24 11 35 15.5" fill="none" stroke="${ink}" stroke-width="1.4"/>`
	}
] as const satisfies readonly Illustration[];

export type AvatarIllustrationId = (typeof avatarIllustrations)[number]['id'];
/** What a Player Profile would store: two stable ids, never rendered markup. */
export type AvatarChoice = { illustration: AvatarIllustrationId; color: AvatarColorId };

const face = '#fffaf3';

export function illustrationOf(id: AvatarIllustrationId): Illustration {
	return avatarIllustrations.find((item) => item.id === id) ?? avatarIllustrations[0];
}

export function colorOf(id: AvatarColorId): AvatarColor {
	return avatarColors.find((item) => item.id === id) ?? avatarColors[0];
}

/** A local SVG data URI, so avatars need no image service. */
export function avatarUri({ illustration, color }: AvatarChoice) {
	const art = illustrationOf(illustration);
	const { background, ink } = colorOf(color);
	const paint = { ink, background, face };
	const eyes = art.sleepy
		? `<path d="M17.5 23Q19.5 25 21.5 23M26.5 23Q28.5 25 30.5 23" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round"/>`
		: `<circle cx="19.5" cy="23" r="1.8" fill="${ink}"/><circle cx="28.5" cy="23" r="1.8" fill="${ink}"/>`;
	const mouth = `<path d="M20.5 29Q24 32 27.5 29" fill="none" stroke="${art.mouthOnInk ? face : ink}" stroke-width="1.8" stroke-linecap="round"/>`;
	const svg = [
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">',
		`<rect width="48" height="48" fill="${background}"/>`,
		`<path d="M8 48Q9 36 24 36Q39 36 40 48Z" fill="${ink}"/>`,
		art.back?.(paint) ?? '',
		`<rect x="13" y="11" width="22" height="25" rx="${art.radius}" fill="${face}" stroke="${ink}" stroke-width="2"/>`,
		eyes,
		art.mouthOnInk ? (art.front?.(paint) ?? '') + mouth : mouth + (art.front?.(paint) ?? ''),
		'</svg>'
	].join('');
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

export function randomAvatar(): AvatarChoice {
	return { illustration: pick(avatarIllustrations).id, color: pick(avatarColors).id };
}

// English-only word lists: generated names stay the same in every language.
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
	'Merry',
	'Daring',
	'Nimble',
	'Witty',
	'Plucky',
	'Breezy',
	'Calm',
	'Cheery',
	'Snug',
	'Zesty',
	'Dapper',
	'Fuzzy',
	'Sly'
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
	'Wren',
	'Hare',
	'Moose',
	'Gecko',
	'Puffin',
	'Bison',
	'Lemur',
	'Marten',
	'Ibis',
	'Yak',
	'Newt',
	'Stoat',
	'Crane'
] as const;

export function randomUsername() {
	return `${pick(adjectives)} ${pick(animals)}`;
}

export const usernameLimits = { min: 2, max: 24 } as const;

/** Trim, NFC-normalize, collapse inner whitespace, and unify typographic apostrophes. */
export function normalizeUsername(raw: string) {
	return raw
		.normalize('NFC')
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[’ʼ]/g, "'");
}

// Letters, combining marks, digits; spaces only between other characters after trimming.
const allowed = /^[\p{L}\p{M}\p{N}' -]+$/u;

export type UsernameCheck = { ok: true; value: string } | { ok: false; error: string };

export function checkUsername(raw: string): UsernameCheck {
	const value = normalizeUsername(raw);
	// Count user-perceived characters so "й" written as two code points still counts once.
	const length = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value)]
		.length;
	if (length < usernameLimits.min)
		return { ok: false, error: `Use at least ${usernameLimits.min} characters.` };
	if (length > usernameLimits.max)
		return { ok: false, error: `Use at most ${usernameLimits.max} characters.` };
	if (!allowed.test(value))
		return {
			ok: false,
			error: 'Use letters, numbers, spaces, hyphens, and apostrophes only.'
		};
	if (!/[\p{L}\p{N}]/u.test(value))
		return { ok: false, error: 'Include at least one letter or number.' };
	return { ok: true, value };
}

/** Short code the Host and requester both see when pending requests look identical. */
export function requestCode(requestId: string) {
	let hash = 0x811c9dc5;
	for (const char of requestId) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
	// No 0/O/1/I so the code survives being read aloud.
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let index = 0; index < 4; index++) code += alphabet[(hash >>> (index * 5)) & 31];
	return code;
}
