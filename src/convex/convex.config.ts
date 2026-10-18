import { defineApp } from 'convex/server';
import { v } from 'convex/values';

export default defineApp({
	env: {
		AUTH_RESEND_KEY: v.optional(v.string()),
		AUTH_EMAIL_FROM: v.optional(v.string())
	}
});
