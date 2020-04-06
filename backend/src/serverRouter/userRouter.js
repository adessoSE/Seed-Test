const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const helper = require('../serverHelper');
const passport = require('passport')
const initializePassport = require('../passport-config');
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const mongo = require('../database/mongodatabase');

const router = express.Router();
// router for all user requests

initializePassport(passport, mongo.getUserByEmail, mongo.getUserById)

router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
    console.log('Time of user request:', Date.now());
    next();
  });

// logges in user
router.post('/login', (req, res, next) => {
    passport.authenticate('local', function(error, user, info){
        if(error){
            return res.json(error);
        }
        if(!user){
            info.status = 'error';
            return res.json(info);
        }
        req.logIn(user, async function(err){
            if(err){
                return res.json(err);
            }else {
                let results = await helper.getGithubStories(req.user.githubAccountName, req.user.githubRepo, req.user.githubToken, res)
                res.json(results);
            }
        });
    })
    (req, res, next)
});

// registers user
router.post('/register', async (req, res) => {
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hashedPassword;
    console.log('user: ' + JSON.stringify(req.body))
    let user = await mongo.registerUser(req.body)
    res.json(user)
});

//logout for user
router.get('/logout', async (req, res) => {
    req.logout();
    res.json({status: 'success'})
});

router.post('/loginGithub', async (req, res) => {
    passport.authenticate('twitter');
})

module.exports = router;
