// https://github.com/WebDevSimplified/Nodejs-Passport-Login/blob/master/passport-config.js
const LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById) {
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

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        //callbackURL: "http://localhost:8080/api/user/callback"
    },
    function (accessToken, refreshToken, profile, done){
        console.log('accessToken: ' + accessToken)
        console.log('refreshToken: ' + refreshToken)
        console.log('profile: ' + JSON.stringify(profile))

    }))
    passport.serializeUser((user, done) => done(null, user._id));
    passport.deserializeUser(async (id, done) => {
        let user = await getUserById(id);
        return done(null, user);
    })
}

module.exports = initialize;