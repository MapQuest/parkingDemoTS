/**
 * Created by cdurham on 3/8/17.
 */

var port = 8080;

var express = require('express');
var app = express();

app.use('/', express.static('public'));

app.listen(port, function() {
    console.log(" Parking Demo listening on port: " + port);
})