import { convexAuth } from '@convex-dev/auth/server';
import { emailCode } from './emailCode';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [emailCode]
});
