// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById, getUserByGithub) {
	const authenticateUser = async (email, password, done) => {
		//console.log('login-info', email, password, done)
		// not working yet , needs callback, or database change to Promises
		const user = await getUserByEmail(email);
		if (!user) return done(null, false, { message: 'No user with this email' });
		try {
			if (await bcrypt.compare(password, user.password)) return done(null, user);
			return done(null, false, { message: 'Password incorrect' });
		} catch (e) {
			console.log(`error: ${e}`);
			return done(e);
		}
	};

	const authenticateUserGithub = async (login, id, done) => {
		const user = await getUserByGithub(login, id);
		if (!user) return done(null, false, { message: 'No user with this Github Account' });
		return done(null, user);
	};

	passport.use('normal-local', new LocalStrategy({ usernameField: 'email' }, authenticateUser));
	passport.use('github-local', new LocalStrategy({ usernameField: 'login', passwordField: process.env.PASSPORT_GITHUB_LOCAL_PW_FIELD }, authenticateUserGithub));

	// eslint-disable-next-line no-underscore-dangle
	passport.serializeUser((user, done) => done(null, user._id));
	passport.deserializeUser(async (id, done) => {
		const user = await getUserById(id);
		return done(null, user);
	});
}

module.exports = initialize;
