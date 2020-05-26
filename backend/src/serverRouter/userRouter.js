const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const request = require('request')
const helper = require('../serverHelper');
const passport = require('passport');
const initializePassport = require('../passport-config');
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);
const mongo = require('../database/mongodatabase');
const UserError = require('../errors/CustomErrors')
const router = express.Router();
// router for all user requests

initializePassport(passport, mongo.getUserByEmail, mongo.getUserById, mongo.getUserByGithub)

router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL);
    res.header('Access-Control-Allow-Credentials','true' );
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Credentials, Authorization, X-Redirect");
   next();
  })
  .use((_, __, next) => {
    console.log('Time of user request:', Date.now());
    next();
  });

// logges in user
router.post('/login', (req, res, next) => {
    try{
        passport.authenticate('normal-local', function(error, user, info){
            if(error){
                throw new UserError(error)
            }else if(!user){
                info.status = 'error';
                return res.json(info);
            }
            req.logIn(user, async function(err){
                if(err){
                    throw new UserError(err)
                }else {
                    if(req.user.github && req.user.github.lastRepository){
                        let response = {
                            status: 'success',
                            message: 'repository',
                            repository: req.user.github.lastRepository
                        };
                        res.json(response);
    
                    } else {
                        res.json(user);
                    }
                }
            });
        })
        (req, res, next)
    }catch(error){
        if(error instanceof UserError){
            res.status(401).json(error);
        }
    }
});

router.post('/githubLogin', (req, res) =>{
    console.log(req.body)
    req.body.id = parseInt(req.body.id)
    passport.authenticate('github-local', function (error, user, info) {
        console.log('in authenticate: ' + JSON.stringify(info))
        if(error){
            return res.json(error);
        } else if(!user){
            info.status = 'error';
            return res.json(info);
        }
        req.logIn(user, async function(err){
            if(err){
                return res.json(err);
            }else {
                if(req.user.github.lastRepository){
                    let response = {
                        status: 'success',
                        message: 'repository',
                        repository: req.user.github.lastRepository
                    };
                    res.json(response);

                } else {
                    res.json(user);
                }
            }
        });
    })(req,res);
});

router.post('/githubRegister', async (req, res) => {
    console.log('githubRegister:')
    try{
        let user = await mongo.findOrRegister(req.body)
        res.json(user)
    }catch(error){
        res.sendStatus(400)
    }
});

router.post('/mergeGithub', async (req, res) => {
    let {userId, login, id} = req.body;
    id = parseInt(id);
    try{
        let user = await mongo.mergeGithub(userId, login, id)
        res.json(user)
    }catch(error){
        res.sendStatus(400)
    }
});


// registers user
router.post('/register', async (req, res) => {
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);
    req.body.password = hashedPassword;
    try{
        let user = await mongo.registerUser(req.body)
        res.json(user)
    }catch(error){
        console.log('in error')
        res.status(400).send(error)
    }
});

//logout for user
router.get('/logout', async (req, res) => {
    req.logout();
    res.json({status: 'success'})
});

module.exports = router;
