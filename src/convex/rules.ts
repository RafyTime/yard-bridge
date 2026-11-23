import { v, type Infer } from 'convex/values';

const bridgeValidator = v.union(v.literal('off'), v.literal('jacks'), v.literal('four-of-a-kind'));

export const rulesValidator = v.object({
	scoreCutoff: v.number(),
	kingOfSpades: v.boolean(),
	handSize: v.number(),
	openingEffects: v.boolean(),
	// Which cards may follow the first card of a batch.
	groupingMode: v.union(v.literal('single'), v.literal('same-rank'), v.literal('match')),
	// Whether a freshly drawn playable card may start a batch rather than play alone.
	drawnCardGrouping: v.boolean(),
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

// Stored rules may predate batch modes: Bridge was on or off and grouping was not configurable.
// Read them through `currentRules`.
export const storedRulesValidator = v.object({
	...rulesValidator.fields,
	groupingMode: v.optional(rulesValidator.fields.groupingMode),
	drawnCardGrouping: v.optional(v.boolean()),
	bridgeDeclaration: v.union(bridgeValidator, v.boolean())
});

export const defaultRules = {
	scoreCutoff: 200,
	kingOfSpades: false,
	handSize: 5,
	openingEffects: true,
	groupingMode: 'same-rank',
	drawnCardGrouping: true,
	bridgeDeclaration: 'four-of-a-kind',
	aceBehavior: 'skip',
	recycleMultiplier: 2,
	starterPolicy: 'highest-score'
} as const satisfies RulesConfiguration;

// Legacy on/off Bridge settings map to Four of a kind/Off; missing grouping settings use defaults.
export function currentRules(rules: Infer<typeof storedRulesValidator>): RulesConfiguration {
	const { bridgeDeclaration: bridge } = rules;
	return {
		...rules,
		groupingMode: rules.groupingMode ?? defaultRules.groupingMode,
		drawnCardGrouping: rules.drawnCardGrouping ?? defaultRules.drawnCardGrouping,
		bridgeDeclaration: bridge === true ? 'four-of-a-kind' : bridge === false ? 'off' : bridge
	};
}
