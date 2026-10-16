// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { type PassportStatic } from 'passport';
import { type ObjectId } from 'mongodb';
import { type User } from '@seed-test/shared/models/User.js';

type GetUserByEmail = (email: string) => Promise<User | null>;
type GetUserById = (id: string | ObjectId) => Promise<User | null>;

export default function initialize(
	passport: PassportStatic,
	getUserByEmail: GetUserByEmail,
	getUserById: GetUserById
): void {
	const authenticateUser = async (email: string, password: string, done: (error: unknown, user?: Express.User | false, options?: { message: string; code?: string }) => void) => {
		try {
			// not working yet , needs callback, or database change to Promises
			const user = await getUserByEmail(email);
			if (!user) 
				return done(null, false, { message: 'No user with this email' });
            
			if (!user.password) 
				return done(null, false, { message: 'Password incorrect' });
            
			if (await bcrypt.compare(password, user.password))
				return done(null, user);

			// CASE: legacy account (hashVersion !== 2) — its stored hash is bcrypt(plaintext), so the client's
			// SHA-256 digest can never match. Flag it so the client may retry once with the plaintext password.
			// `transitioned` is not the test: the old login code set it without rehashing, so it does not prove the digest format.
			// Consequence: an existing account is revealed as legacy to anyone who guesses its e-mail. Accepted,
			// because "No user with this email" already reveals existence and the flag leaks no secret.
			// LEGACY_PASSWORD is also returned for WRONG passwords on accounts registered before hashVersion existed
			// (stored bcrypt(digest), no hashVersion). The client then sends one plaintext retry over HTTPS. This cohort
			// shrinks because every successful digest login sets hashVersion 2. The retry consumes a second authLimiter slot (accepted).
			if (user.hashVersion !== 2)
				return done(null, false, { message: 'Password incorrect', code: 'LEGACY_PASSWORD' });

			return done(null, false, { message: 'Password incorrect' });
		} catch (e) {
			return done(e);
		}
	};

	// Passport verify callbacks use done() for flow control — void the async return to satisfy no-misused-promises
	passport.use('normal-local', new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
		void authenticateUser(email, password, done);
	}));

	passport.serializeUser((user, done) => {
		done(null, (user as User)._id);
	});

	passport.deserializeUser((id: ObjectId, done) => {
		void getUserById(id)
			.then((user) => done(null, user))
			.catch((error) => done(error));
	});
}