import 'express-session';

// Session fields used by the auth flows. Declared once here so controllers can read req.session
// without casts.
declare module 'express-session' {
	interface SessionData {
		/** OAuth state issued by GET /user/github/state. The GitHub callback accepts only this value and deletes it after one attempt. */
		githubOAuthState?: string;
	}
}

export {};
