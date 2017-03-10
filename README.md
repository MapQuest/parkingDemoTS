This git project contains two node applications

1) CallbackListener - for handling the thingspace sms callback service

2) demo - the demo application

run 'npm install' in both directories to install the dependencies

demo\app.js - you can adjust the port number that you want to run the application on
CallbackListener\cblistener.js - at the bottom you can update the port 3000 to whichever port you would like

demo can be run by changing into the demo folder, running 'node app.js'
callback listerner can be run by changing into the CallbackListener folder and running 'node cblistener'


Demo Instructions  (these will change a bit over the next few days)
===================

1) open the demo app, currently setup to run on port 8080, example on local machine http://localhost:8080/
2) type in "restuarants" in the Search bar, hit Search - you will get Poi points and a current position marker
3) move the position marker around to different streets
4) click on any poi that you want to go to (there will be more happening up next) - it will show the address
5) Hit route, it will draw an MQ route
6) Hit drive and watch the animation



