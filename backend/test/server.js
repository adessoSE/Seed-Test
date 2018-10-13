//During the test the env variable is set to test
process.env.NODE_ENV = 'test';
//process.env.MONGODB_URI = 'mongodb://MotherFox:02171991n@ds125263.mlab.com:25263/foxsden';
//let mongoose = require("mongoose");
/*
var express = require("express");
var cors = require('cors');
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
*/
//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();
chai.use(chaiHttp);
//var requester = chai.request(app).keepOpen();
//Our parent block
describe('Movies', () => {
  beforeEach((done) => { //Before each test we empty the database
    done();
    /*
    movies.remove({}, (err) => {
      done();
    });
    */
  });
  /*
    * Test the /GET route
    */
  describe('/GET landing page', () => {
    it('it should GET API Description page', (done) => {
      chai.request(server)
        .get('/')
        .end((err, res) => {
          res.should.have.status(200);
          //res.body.should.be.a('array');
          //res.body.length.should.be.eql(0);
          done();
        });
    });
  });

  /*
    * Test the /GET route
    */
  describe('/GET movies', () => {
    it('it should GET all movies', (done) => {
      chai.request(server)
        .get('/events')
        .end((err, res) => {
          res.should.have.status(200);
          //res.body.should.be.a('array');
          //res.body.length.should.be.eql(0);
          done();
        });
    });
  });


});
