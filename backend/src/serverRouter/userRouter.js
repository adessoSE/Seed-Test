const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const process = require('process');
const fetch = require('node-fetch');
const helper = require('../serverHelper');
const passport = require('passport')
const initializePassport = require('./passport-config');
const bcrypt = require('bcrypt');
const salt = bcrypt.genSaltSync(10);

const router = express.Router();
// router for all user requests

initializePassport(passport, getUserByEmail, getUserById)


function getUserByEmail(email, callback){
    mongo.getUserByEmail(email, callback)
  }
  
function getUserById(id, callback){
  mongo.getUserById(id, callback)
}
  

router
  .use(cors())
  .use(bodyParser.json({ limit: '100kb' }))
  .use(bodyParser.urlencoded({ limit: '100kb', extended: true }))
  .use((_, __, next) => {
    console.log('Time of github request:', Date.now());
    next();
  });

// get stories from github
router.get('/login', passport.authenticate('local'), (req, res) => {
    console.log('test')
});

// submits new StepType-Request as an Issue to our github
router.post('/register', async (req, res) => {
 const hashedPassword = bcrypt.hashSync(req.body.password, salt);
 const email = req.body.email;

 


});

module.exports = router;
