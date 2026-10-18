import { v } from 'convex/values';

export const rulesValidator = v.object({
	scoreCutoff: v.number(),
	kingOfSpades: v.boolean(),
	handSize: v.number(),
	openingEffects: v.boolean(),
	bridgeDeclaration: v.boolean(),
	aceBehavior: v.union(v.literal('skip'), v.literal('cancel')),
	recycleMultiplier: v.union(v.literal(1), v.literal(2), v.literal(3)),
	starterPolicy: v.union(
		v.literal('highest-score'),
		v.literal('previous-starter'),
		v.literal('random')
	)
});

export const defaultRules = {
	scoreCutoff: 200,
	kingOfSpades: false,
	handSize: 5,
	openingEffects: true,
	bridgeDeclaration: true,
	aceBehavior: 'skip',
	recycleMultiplier: 2,
	starterPolicy: 'highest-score'
} as const;
