//Install express server
const express = require('express');
const path = require('path');
const app = express();
import {Constants} from 'constants';

// Serve only the static files form the dist directory
app.use(express.static(__dirname + '/dist/cucumber-frontend'));

app.get('/*', function(req,res) {

    res.sendFile(path.join(__dirname+'/dist/cucumber-frontend/index.html'));
});

// Start the app by listening on the default Heroku port
app.listen(Constants.port || 4200, function () {
    let port = this.address().port;
    console.log("App now running on port", port);
});
