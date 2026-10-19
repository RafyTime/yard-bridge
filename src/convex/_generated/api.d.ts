/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as auth from "../auth.js";
import type * as cards from "../cards.js";
import type * as counter from "../counter.js";
import type * as emailCode from "../emailCode.js";
import type * as gameRules from "../gameRules.js";
import type * as games from "../games.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as players from "../players.js";
import type * as rounds from "../rounds.js";
import type * as rules from "../rules.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  auth: typeof auth;
  cards: typeof cards;
  counter: typeof counter;
  emailCode: typeof emailCode;
  gameRules: typeof gameRules;
  games: typeof games;
  health: typeof health;
  http: typeof http;
  players: typeof players;
  rounds: typeof rounds;
  rules: typeof rules;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
