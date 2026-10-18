import { Email } from '@convex-dev/auth/providers/Email';
import { generateRandomString } from '@oslojs/crypto/random';
import { env } from './_generated/server';

export const emailCode = Email({
	id: 'resend-otp',
	maxAge: 15 * 60,
	generateVerificationToken: async () =>
		generateRandomString(
			{ read: (bytes) => bytes.set(crypto.getRandomValues(new Uint8Array(bytes.length))) },
			'0123456789',
			8
		),
	async sendVerificationRequest({ identifier, token }) {
		const apiKey = env.AUTH_RESEND_KEY;
		const from = env.AUTH_EMAIL_FROM;
		if (!apiKey || !from) throw new Error('Email delivery is not configured');

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				from,
				to: [identifier],
				subject: 'Your Yard Bridge sign-in code',
				text: `Your Yard Bridge code is ${token}. It expires in 15 minutes. If you did not request this code, you can ignore this email.`
			})
		});
		// Provider responses can contain recipient details. Keep them out of client errors and logs.
		if (!response.ok) throw new Error('Could not send the sign-in email');
	}
});
