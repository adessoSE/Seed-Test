var express = require("express");
var cors = require('cors');
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var MOVIES_COLLECTION = "movies";
var app = express();
app.use(bodyParser.json({limit: '100kb'}));
app.use(bodyParser.urlencoded({limit: '100kb', extended: true}));
var db;
var _ = require("underscore");

// Connect to the database before starting the application server.
/*
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database;
  console.log("Database connection ready");

  // Initialize the app.
  var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
});
*/
var server = app.listen(process.env.PORT || 8080, function () {
    var port = server.address().port;
    console.log("App now running on port", port);
  });

// var model = mongo.model('users', UsersSchema, 'users');
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

/**
 * API Description
 */
app
  .use(cors())
  .get("/", function (req, res) {
    res.writeHead(200, {'content-type': 'text/html'});
    res.write('<h1>OUTGOFOX-API</h1>');
    res.write('<h2>GET: Movies</h2>');
    res.write('<p>/movies</p>');
    res.write('<p>/movie/:id</p>');
    res.write('<p>/moviesOfGenre/:genre</p>');
    res.write('<p>/moviesOnDay/:date</p>');
    res.write('<p>/moviesOfGenreOnDay/:genre/:date</p>');

    res.write('<h2>GET: Events</h2>');
    res.write('<p>/events</p>');
    res.write('<p>/event/:id</p>');
    res.write('<p>/eventsOfCategory/:category</p>');
    res.write('<p>/eventsOnDay/:date</p>');
    res.write('<p>/eventsOfCategoryOnDay/:category/:date</p>');

    res.write('<h2>POST: Movie/Event</h2>');
    res.write('<p>/movie</p>');
    res.write('<p>/event</p>');


    res.status(200);
    res.end();
  })
  /**
   * EXAMPLE: Movies API
   */
  .get("/movies", function (req, res, next) {
    db.collection(MOVIES_COLLECTION).find({}).toArray(function (err, docs) {
      if (err) {
        handleError(res, err.message, "Failed to get movies.");
      } else {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(200).json(docs);
      }
    });
  })
  .get("/movie/:id", function (req, res) {
    var id = req.params.id;
    db.collection(MOVIES_COLLECTION)
      .findOne(
        {
          $or: [
            {'id': parseInt(id)}
          ]
        },
        function (err, docs) {
          if (err) {
            handleError(res, err.message, "Failed to get movie with id." + id);
          } else {
            console.log("id", id);
            //var filtered = _.where(docs[0], {id: parseInt(id)});
            console.log(docs);
            res.status(200).json(docs);
          }
        }
      )
  })
  .get("/moviesOfGenre/:genre", function (req, res) {
    var genre = req.params.genre;

    db.collection(MOVIES_COLLECTION)
      .find(
        {
          $or: [
            {'category': genre},
            {'category': genre.toLowerCase()}
          ]
        })
      .toArray(
        function (err, docs) {
          if (err) {
            handleError(res, err.message, "Failed to get movies with genre." + genre);
          } else {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(200).json(docs);
          }
        }
      )
  })
  .get("/moviesOfGenreOnDay/:genre/:date", function (req, res) {
    var genre = req.params.genre;
    var date = req.params.date;

    db.collection(MOVIES_COLLECTION)
      .find(
        {
          $and: [
            {$or: [{'category': genre}, {'category': genre.toLowerCase()}]},
            {$or: [{'cinemas.showtimes': date}]}
          ]
        }
      )
      .toArray(
        function (err, docs) {
          if (err) {
            handleError(res, err.message, "Failed to get movies with genre." + genre);
          } else {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(200).json(docs);
          }
        }
      )
  })
  .post("/movie", function (req, res) {
    let json = req.body;
    let id = JSON.stringify(json).substring(7, 13);
    console.log("id", id);
    db.collection(MOVIES_COLLECTION)
      .findOne(
        {
          $or: [
            {'id': id}
          ]
        }
        ,
        function (err, docs) {
          if (err) {
            handleError(res, err.message, "Failed to get to check if movie already exists.");
          }
          console.log("docs", docs);
          if (docs == null) {
            db.collection(MOVIES_COLLECTION)
              .insertOne(json, function (err, res) {
                if (err) throw err;
                console.log("1 document inserted");
                //db.close();
              });
            console.log("Movie added as new document in Collection: MOVIES", json);
            res.status(200).send({
              message: 'Added ' + json
            })
          } else {
            res.status(200).send({
              message: 'Movie already exists in the collection. Use the Update API to change this.'
            })
          }

        })
  })

module.exports = app;
