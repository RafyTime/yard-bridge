# Use Convex for authoritative game state

Status: accepted, pending an end-to-end SvelteKit authentication check.

Yard Bridge needs live turns, private hands, atomic rule enforcement, and games that remain available across long breaks. We chose Convex so a TypeScript mutation can validate a move and commit its state and history together, with live queries delivering each player's authorized view. Supabase was a viable alternative, but its Postgres and auth setup would add more integration work for this small game. Convex Auth is the initial login choice because email codes are its narrow requirement; its beta status and community-maintained Svelte adapter require an early integration check before the game depends on it. Game data will be exportable outside Convex for recovery.
