var express = require("express");
var bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post("/", function(req, res) {
  var size = Object.keys(req.body).length;
  if(req.body.smsStatus) {
    console.log("\nSMS_DeliveryReport:");
  } else if(req.body.type) {
    //OptIn or OptOut
    if(req.body.type == "OptIn") {
        console.log("\nOpt In from %s",req.body.recipient);
    } else if(req.body.type == "OptOut") {
        console.log("\nOpt Out from %s",req.body.recipient);
    } else {
        console.log("\nUnrecognized OptIn or OptOut message");
    };
  } else if(size == 4) {
    //SMS_MobileOriginatedMessage
    console.log("\nMO message from %s",req.body.sender);
  } else {
    //unknown callback
    console.log("\nUnrecognized request")
  };
  console.log(req.body);
  return res.end();
  //return res.send(req.body);
});

var server = app.listen(3000, function () {
    console.log("Listening on port %s...", server.address().port);
});
