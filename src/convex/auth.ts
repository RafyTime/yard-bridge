import { convexAuth } from '@convex-dev/auth/server';
import { emailCode } from './emailCode';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [emailCode],
	// Convex Auth defaults to 10 failed codes per email, refilling one every 6 minutes
	// (240 guesses a day). For a 6-digit code we halve that; a correct code resets it.
	signIn: { maxFailedAttempsPerHour: 5 }
});
