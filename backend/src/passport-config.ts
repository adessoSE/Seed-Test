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
	const authenticateUser = async (email: string, password: string, done: (error: unknown, user?: Express.User | false, options?: { message: string }) => void) => {
		try {
			// not working yet , needs callback, or database change to Promises
			const user = await getUserByEmail(email);
			if (!user) 
				return done(null, false, { message: 'No user with this email' });
            
			if (!user.password) 
				return done(null, false, { message: 'Password incorrect' });
            
			if (await bcrypt.compare(password, user.password)) 
				return done(null, user);
            
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