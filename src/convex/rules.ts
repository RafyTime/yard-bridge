import { v, type Infer } from 'convex/values';

const bridgeValidator = v.union(v.literal('off'), v.literal('jacks'), v.literal('four-of-a-kind'));

export const rulesValidator = v.object({
	scoreCutoff: v.number(),
	kingOfSpades: v.boolean(),
	handSize: v.number(),
	openingEffects: v.boolean(),
	// Which cards may follow the first card of a batch.
	batchMode: v.union(v.literal('single'), v.literal('same-rank'), v.literal('match')),
	// Whether a freshly drawn playable card may start a batch rather than play alone.
	drawnCardBatching: v.boolean(),
	bridgeDeclaration: bridgeValidator,
	aceBehavior: v.union(v.literal('skip'), v.literal('cancel')),
	recycleMultiplier: v.union(v.literal(1), v.literal(2), v.literal(3)),
	starterPolicy: v.union(
		v.literal('highest-score'),
		v.literal('previous-starter'),
		v.literal('random')
	)
});

export type RulesConfiguration = Infer<typeof rulesValidator>;

// Stored rules may predate batch modes: Bridge was on or off and Batches were not configurable.
// Read them through `currentRules`.
export const storedRulesValidator = v.object({
	...rulesValidator.fields,
	batchMode: v.optional(rulesValidator.fields.batchMode),
	drawnCardBatching: v.optional(v.boolean()),
	bridgeDeclaration: v.union(bridgeValidator, v.boolean())
});

export const defaultRules = {
	scoreCutoff: 200,
	kingOfSpades: false,
	handSize: 5,
	openingEffects: true,
	batchMode: 'same-rank',
	drawnCardBatching: true,
	bridgeDeclaration: 'four-of-a-kind',
	aceBehavior: 'skip',
	recycleMultiplier: 2,
	starterPolicy: 'highest-score'
} as const satisfies RulesConfiguration;

// Legacy on/off Bridge settings map to Four of a kind/Off; missing Batch settings use defaults.
export function currentRules(rules: Infer<typeof storedRulesValidator>): RulesConfiguration {
	const { bridgeDeclaration: bridge } = rules;
	return {
		...rules,
		batchMode: rules.batchMode ?? defaultRules.batchMode,
		drawnCardBatching: rules.drawnCardBatching ?? defaultRules.drawnCardBatching,
		bridgeDeclaration: bridge === true ? 'four-of-a-kind' : bridge === false ? 'off' : bridge
	};
}
