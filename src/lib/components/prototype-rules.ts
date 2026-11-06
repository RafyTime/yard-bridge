// Sample-only rules shared by the lobby, draft editor, and final review.
export type PrototypeRules = {
	scoreCutoff: number;
	handSize: number;
	kingOfSpades: boolean;
	openingEffects: boolean;
	bridgeDeclaration: boolean;
	aceBehavior: 'skip' | 'cancel';
	recycleMultiplier: 1 | 2 | 3;
	starterPolicy: 'highest-score' | 'previous-starter' | 'random';
};
export const prototypeDefaults: PrototypeRules = {
	scoreCutoff: 200,
	handSize: 5,
	kingOfSpades: false,
	openingEffects: true,
	bridgeDeclaration: true,
	aceBehavior: 'skip',
	recycleMultiplier: 2,
	starterPolicy: 'highest-score'
};
export type HelpMode = 'tooltip' | 'inline' | 'drawer';
export const ruleDefinitions = [
	{
		key: 'scoreCutoff',
		label: 'Score cutoff',
		group: 'Dealing and scoring',
		description:
			"Reaching this total exactly resets your score to zero. Crossing it triggers the game's loss rule.",
		example: 'With a cutoff of 200, a total of exactly 200 resets to zero; 210 crosses the cutoff.'
	},
	{
		key: 'handSize',
		label: 'Cards per hand',
		group: 'Dealing and scoring',
		description:
			'The number of cards dealt to each player at the start of a round. Choose between 2 and 9 cards.',
		example: 'With 5 cards per hand, the starter puts their last dealt card face up and keeps 4.'
	},
	{
		key: 'recycleMultiplier',
		label: 'Recycle multiplier',
		group: 'Dealing and scoring',
		description:
			'When the draw pile is recycled during a round, this multiplier applies once to the held-card points at scoring.',
		example: 'A multiplier of 2 turns 30 held-card points into 60 before finish bonuses.'
	},
	{
		key: 'kingOfSpades',
		label: 'Special King of Spades',
		group: 'Card effects',
		description:
			'When enabled, the King of Spades makes the next player draw seven and is worth 80 points when held at scoring.',
		example: 'Turn it off to use the ordinary King behavior and value.'
	},
	{
		key: 'openingEffects',
		label: 'Opening card effects',
		group: 'Card effects',
		description:
			'Controls whether the first face-up card triggers its special effect at the start of a round.',
		example: 'When enabled, an opening 8 applies its draw-two and skip effect.'
	},
	{
		key: 'aceBehavior',
		label: 'Ace behavior',
		group: 'Card effects',
		description: 'Choose whether an Ace skips the next player or cancels an incoming effect.',
		example: 'With Skip selected, the next player loses their turn.'
	},
	{
		key: 'bridgeDeclaration',
		label: 'Bridge declaration',
		group: 'Ending and starting rounds',
		description:
			'Allows a player to end the round by playing all four cards of one rank, even if they still hold other cards.',
		example:
			'Declare Bridge with four Kings. Any cards you still hold count toward your round score.'
	},
	{
		key: 'starterPolicy',
		label: 'Later-round starter',
		group: 'Ending and starting rounds',
		description:
			'Decides who starts after the first round. The first round always starts with a random player.',
		example:
			'Highest score selects the player with the most accumulated points. Ties use previous-round points, then randomness.'
	}
] as const;
export type RuleDefinition = (typeof ruleDefinitions)[number];
export const ruleGroups = [
	'Dealing and scoring',
	'Card effects',
	'Ending and starting rounds'
] as const;
const choiceLabels: Record<string, string> = {
	skip: 'Skip next player',
	cancel: 'Cancel incoming effect',
	'highest-score': 'Highest score',
	'previous-starter': 'Previous starter',
	random: 'Random'
};
export function ruleValue(rules: PrototypeRules, key: RuleDefinition['key']) {
	const value = rules[key];
	if (typeof value === 'boolean') return value ? 'On' : 'Off';
	if (key === 'scoreCutoff') return `${value} points`;
	if (key === 'handSize') return `${value} cards`;
	if (key === 'recycleMultiplier') return `×${value}`;
	return choiceLabels[String(value)] ?? String(value);
}
