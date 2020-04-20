// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
const LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById, getUserByToken) {
    const authenticateUser = async(email, password, done) => {

        // not working yet , needs callback, or database change to Promises 
        const user = await getUserByEmail(email);

        if(!user){
            return done(null, false, {message: 'No user with this email'});
        }

        try {
            if(await bcrypt.compare(password, user.password)){
                return done(null, user);
            }else {
                return done(null, false, {message: 'Password incorrect'});
            }
        } catch(e){
            console.log('error: ' + e)
            return done(e);
        }
    }

    const authenticateUserGithub = async(token, password, done) => {
        console.log('in authenticateUserGithub: ' + token + ' useless: ')
        const user = await getUserByToken(token);

        if(!user){
            return done(null, false, {message: 'No user with this Github Account'});
        }
        return done(null, user)
    }
    

    passport.use('normal-local', new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.use('github-local', new LocalStrategy({ usernameField: 'token', passwordField: 'token',}, authenticateUserGithub));

    passport.serializeUser((user, done) => done(null, user._id));
    passport.deserializeUser(async (id, done) => {
        let user = await getUserById(id);
        return done(null, user);
    })
}

module.exports = initialize;