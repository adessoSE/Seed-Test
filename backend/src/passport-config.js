// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async(email, password, done) => {

        // not working yet , needs callback, or database change to Promises 
        const user = getUserByEmail(email);
        if(user == null){
            return done(null, false, {message: 'No user with this email'});
        }

        try {
            if(await bcrypt.compare(password, user.password)){
                return done(null, user);
            }else {
                return done(null, false, {message: 'Password incorrect'});
            }
        } catch(e){
            return done(e);
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id));
    })
}

module.exports = initialize;