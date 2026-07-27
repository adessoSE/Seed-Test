// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { PassportStatic } from 'passport';
import { ObjectId } from 'mongodb';
import { User } from '@shared/models/User.js';

type GetUserByEmail = (email: string) => Promise<User | null>;
type GetUserById = (id: string | ObjectId) => Promise<User | null>;
type GetUserByGithub = (login: string, id: number) => Promise<User | null>;

export default function initialize(
	passport: PassportStatic,
	getUserByEmail: GetUserByEmail,
	getUserById: GetUserById,
	getUserByGithub: GetUserByGithub
): void {
	const authenticateUser = async (email: string, password: string, done: (error: any, user?: Express.User | false, options?: { message: string }) => void) => {
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

	const authenticateUserGithub = async (login: string, id: string, done: (error: any, user?: Express.User | false, options?: { message: string }) => void) => {
		try {
			const githubId = parseInt(id, 10);
			const user = await getUserByGithub(login, githubId);
			if (!user) 
				return done(null, false, { message: 'No user with this Github Account' });
            
			return done(null, user);
		} catch(e) {
			return done(e);
		}
	};

	passport.use('normal-local', new LocalStrategy({ usernameField: 'email' }, authenticateUser));
	passport.use('github-local', new LocalStrategy({ usernameField: 'login', passwordField: process.env.PASSPORT_GITHUB_LOCAL_PW_FIELD }, authenticateUserGithub));

	passport.serializeUser((user, done) => {
		done(null, (user as User)._id);
	});

	passport.deserializeUser(async (id: ObjectId, done) => {
		try {
			const user = await getUserById(id);
			done(null, user);
		} catch (error) {
			done(error);
		}
	});
}