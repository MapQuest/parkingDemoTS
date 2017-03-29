var mqRoute = null;


var parkingSpotArray = new Array();
var parkingRemoteData = new Array();
var poiArray = new Array();
var poiFeatureGroup = null;

var targetPoiLatLng = null;

var smstoken = null;

var myLocation = null;
var newLocation = null;
var isAnimatingDrive = false;
var routeEnd = null;
var isFlyTo = false;

$( document ).ready(function() {

    //get the screen size
    $('#map')


    //create MapQuest Map Layer
    var mapLayer = MQ.mapLayer(), map;

    map = L.map('map', {
        layers: mapLayer,
        center: [37.780204001000072,-122.407895201999963],
        zoom: 17
    });

    L.control.layers({
        'Map': mapLayer,
        'Hybrid': MQ.hybridLayer(),
        'Satellite': MQ.satelliteLayer(),
        'Dark': MQ.darkLayer(),
        'Light': MQ.lightLayer()
    }, {
        'Traffic Flow': MQ.trafficLayer({layers: ['flow']}),
        'Traffic Incidents': MQ.trafficLayer({layers: ['incidents']})
    }).addTo(map);


    map.on('zoomend', function(e) {
        console.log("zoom-->:" + map.getZoom());
        if (isAnimatingDrive)
        {

            animateDriving();
        }

        if (isFlyTo) {
            map.panTo(targetPoiLatLng, { animate: true, duration: 1.5} );
            isFlyTo = false;
        }
    });

    /*
    map.on('moveend', function(e) {
        if (isAnimatingDrive)
        {
            animateDriving();
        }
    });
    */

    /*
    map.on('viewreset', function() {
        if (isAnimatingDrive)
        {
            animateDriving();
        }
    })
    */

    document.addEventListener('animationEnd', function(e){
        console.log(" --- wooot ---");
        console.log(e);
        isAnimatingDrive = false;

        //remove the circle
        var elem = document.getElementById("driveIco");
        if (elem) elem.parentNode.removeChild(elem);

        //remove the target marker
        map.removeLayer(newLocation);

        //move my current position to here
        myLocation.setLatLng(routeEnd); // move this to the end of the route


        //alert("Here we send SMS message about your spot");

        var sendTo = $('#txt-cellphone').val();

        $.ajax({
            method: 'POST',
            url: 'https://thingspace.verizon.com/api/messaging/v1/sms',
            contentType: 'application/json; charset=UTF-8',
            headers: {"Authorization": "Bearer " + smstoken},
            data: JSON.stringify({
                "recipient": sendTo,
                "senderAddress": "900040002014",
                "content": "You have arrvied at your parking spot - you have 2 hours" ,
                "transactionID": "vz" + Date.now(),
                "deliveryReport": true
            })
        }).done (function(data){
            console.log(data);
        })


    });
    

    //create svg layer to do some additional animation and drawing on the MQ leaflet map
    var svg = d3.select(map.getPanes().overlayPane).append("svg");
    var g = svg.append("g").attr("class","leaflet-zoom-hide");


    var unoccupiedOption = {
        className: "unoccupied",
        fillColor: "rgb(50,220,50)",
        color: "rgb(0,0,0)",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
    };

    var occupiedOption = {
        className: "occupied",
        fillColor: "rgb(220,220,200)",
        color: "rgb(0,0,0)",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };


    var getRandomIntInclusive = function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    var spotAnimate = function() {


        var changecount = getRandomIntInclusive(5,20);
        console.log(" ** time to animate parking spots (" + changecount + ") **");

        for (i = 0; i < changecount; i++)
        {
            var changeIndex = getRandomIntInclusive(0, parkingSpotArray.length -1);

            map.removeLayer(parkingSpotArray[changeIndex]);

            //add it back as it's new choice
            var rndNumber = getRandomIntInclusive(0,10);
            if (rndNumber == 2 || rndNumber == 4 || rndNumber == 8)
                parkingSpotArray[changeIndex].feature.properties.occupied = true;
            else
                parkingSpotArray[changeIndex].feature.properties.occupied = false;




            parkingSpotArray[changeIndex] = L.circle(parkingSpotArray[changeIndex]._latlng, parkingSpotArray[changeIndex].feature.properties.occupied ? 2 : 1, parkingSpotArray[changeIndex].feature.properties.occupied ? occupiedOption : unoccupiedOption).addTo(map);
        }

    }


    L.geoJson(howardPark, {
        pointToLayer: function (feature, latlng) {

            
            var rndNumber = getRandomIntInclusive(0,10);
            if (rndNumber == 2 || rndNumber == 4 || rndNumber == 8)
                feature.properties.occupied = true;
            else
                feature.properties.occupied = false;

            //if the POST_ID is not set, let's create one
            if (feature.properties.POST_ID == null)
            {
                var num1 = getRandomIntInclusive(100,999);
                var num2 = getRandomIntInclusive(10000,99999);

                feature.properties.POST_ID = num1 + " - " + num2;
            }
                
            {
                console.log("need post id");
            }

            var searchspot = new Object();
            searchspot.key = feature.properties.POST_ID;
            searchspot.name = feature.properties.POST_ID;


            var spot = L.circle(latlng, feature.properties.occupied ? 1 : 2, feature.properties.occupied ? occupiedOption : unoccupiedOption);
            //add this to an array for animation
            parkingSpotArray.push(spot);

            return spot;
            
        }
    }).addTo(map);

    //One we load the parking spots - let's randomize changing occupied and unoccupied spots
    //setInterval(spotAnimate, 2000); //every 2 minutes


    var toLine = d3.svg.line()
        .interpolate("linear")
        .x(function(d) {
            return applyLatLngToLayer(d).x
        })
        .y(function(d) {
            return applyLatLngToLayer(d).y
        });


    var createRoute = function(to) {

        dir = MQ.routing.directions();

        if (mqRoute ) {
            map.removeLayer(mqRoute);
        }



        dir.route({
            locations: [
                { latLng : myLocation._latlng},
                { latLng: to }
            ]
        });


        mqCustomRouteLayer = MQ.Routing.RouteLayer.extend({

            createStartMarker: function(location, stopNumber) {

                    var custom_icon;
                    var marker;

                    custom_icon = L.icon({
                        iconUrl: 'assets/nothing.png',
                        iconSize: [1, 1],
                        iconAnchor: [1,1]
                    });

                    marker = L.marker(location.latLng, {icon: custom_icon}).addTo(map);

                    return marker;


            },
            createEndMarker: function(location, stopNumber) {

                var custom_icon;
                var marker;

                custom_icon = L.icon({
                    iconUrl: 'assets/nothing.png',
                    iconSize: [1, 1],
                    iconAnchor: [1, 1]
                });

                marker = L.marker(location.latLng, {icon: custom_icon}).addTo(map);
                routeEnd = location.latLng;

                return marker;
            }

        });



        mqRoute = new mqCustomRouteLayer({
            directions: dir,
            fitBounds: true
        });




        map.addLayer(mqRoute);



    }

    var createRoutePath = function() {

        var routePathArray = new Array();
        $.each(mqRoute.routeData.legs[0].maneuvers, function (index, maneuver)
        {
            routePathArray.push(maneuver.startPoint);
        });

        return routePathArray;

    }

    var getRandomSpot = function() {

        var val = getRandomIntInclusive(1,5);

        switch(val) {
            case 1:
                return { lat: 37.782310898000048, lng: -122.407381099999952};
                break;
            case 2:
                return { lat:37.784721802000035, lng: -122.404982897999957};
                break;
            case 3:
                return { lat: 37.78214891600004, lng: -122.410036566999963};
                break;
            case 4:
                return { lat: 37.779449898000053, lng: -122.410760599999946};
                break;
            case 5:
                return { lat: 37.780435598000054, lng: -122.406418499999972};
                break;
        }

        return { lat: 37.782310898000048, lng: -122.407381099999952};

    }


    var loadPOIs = function() {

        var boundingArray = new Array();

        var redMarker = L.AwesomeMarkers.icon({
            prefix: 'fa',
            icon: 'cutlery',
            markerColor: 'red'
        });

        $.getJSON('http://www.mapquestapi.com/search/v2/polygon?key=dnMDoMRxCljxShMyxlnGF7k9zMrzbT1k&polygon=37.78575414043862,-122.405797149331008,37.780488897287022,-122.412501260578509,37.775539226725748,-122.406274010800502,37.780787600432198,-122.399639324456231,37.78575414043862,-122.405797149331008&hostedData=mqap.ntpois%7C%22group_sic_code%22=?%7C581208',
            function (data) {
                $.each(data.searchResults, function( idx, poi){
                    //console.log(poi.fields);

                    

                    boundingArray.push(poi.fields.mqap_geography.latLng);

                    var poiMarker = L.marker(poi.fields.mqap_geography.latLng, {icon: redMarker}).addTo(map);
                    poiMarker.bindPopup(poi.fields.name).openPopup();

                    console.log(poi.fields.name);

                    poiMarker.on('click', function(evt) {

                        $("#txt-search-address").val(" --> reverse geocoding...");
                        console.log(evt.target._latlng);

                        //using Mapquest we can reverse geocode this point to get an address
                        var geocode = MQ.geocode().on('success', function (e){
                            var geoaddress = e.result.best;
                            console.log(geoaddress);
                            $("#txt-search-address").val(geoaddress.street + ", " + geoaddress.adminArea5 + ", " + geoaddress.adminArea3 + "  " + geoaddress.postalCode)
                        });

                        geocode.reverse(evt.target._latlng);

                        //set the current latlng for what we geocoded
                        targetPoiLatLng = evt.target._latlng;

                    });

                    poiArray.push(poiMarker);


                });



            }).done(function() {

                //var bounds = new L.LatLngBounds(boundingArray);
                //map.fitBounds(bounds);


                //Add Marker for starting Route Point
                var blueMarker = L.AwesomeMarkers.icon({
                    prefix: 'fa',
                    icon: 'crosshairs',
                    markerColor: 'blue',
                    spin: true
                });

            myLocation = L.marker({ lat: 37.779678299000068, lng: -122.402808000999983}, {icon: blueMarker, draggable: 'true'}).addTo(map);

            });
    }

    var lineDraw = function() {

        var transform = d3.geo.transform({
            point: projectPoint
        });

        var d3path = d3.geo.path().projection(transform);

        function applyLatLngToLayer(d) {
            var y = d.geometry.coordinates[1]
            var x = d.geometry.coordinates[0]
            return map.latLngToLayerPoint(new L.LatLng(y, x))
        }

        function projectPoint(x, y) {
            var point = map.latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        } //end projectPoint

        var toLine = d3.svg.line()
            .interpolate("linear")
            .x(function(d) {
                return applyLatLngToLayer(d).x
            })
            .y(function(d) {
                return applyLatLngToLayer(d).y
            });

        var linePath = g.selectAll(".lineConnect")
            .data([featuresdata])
            .enter()
            .append("path")
            .attr("class", "lineConnect");

    }

    var animateDriving = function() {
        isAnimatingDrive = true;

        var elem = document.getElementById("driveIco");
        if (elem) elem.parentNode.removeChild(elem);



        //build the route
        var routePath = new Array();
        routePath = createRoutePath();

        //convert latLng to X,Y points
        var coordPointArray = new Array();
        $.each(routePath, function(idx, latlng){
            var coordinate = map.latLngToLayerPoint(new L.LatLng(latlng.lat, latlng.lng));
            console.log(coordinate);

            var mypoint = new Array();
            mypoint.push(coordinate.x);
            mypoint.push(coordinate.y);

            coordPointArray.push(mypoint);
        });



        var svganim = d3.select('svg.leaflet-zoom-animated');
        var zoomlevel = map.getZoom();


        var circle = svganim.append("circle")
            .attr("r", 20 - ((20 - zoomlevel) * 2) )
            .attr("cx", 400)
            .attr("cy", 400)
            .attr("id","driveIco")
            .style("fill", "#0000ff");



        var animation = new PathAnimation(circle);



        animation.start(coordPointArray, 20000, animation.tween(d3.ease("linear")));
    };

    //binding actions
    $('#btn-route').on('click', function() {
        if ($("#txt-search-address").val().length > 0) {
            createRoute(targetPoiLatLng);
        } else {
            createRoute(getRandomSpot());
        }
    });

    $('#btnDriveMe').on('click',function() {
        createRoutePath();
    });


    $('#btn-search').on('click', function() {
        if ($('#txt-search-address').val() == "restaurants" || $('#txt-search-address').val() == "Restaurants") {
            loadPOIs();
        }
    });

    $('#btn-findparking').on('click', function() {
        //zoom to the selected marker
        isFlyTo = true;
        map.setZoom(20);

        var diffsize = 0.0005;

        //Look around for parking spot
        //targetPoiLatLng
        console.log(targetPoiLatLng);
        var searchbounds = [[targetPoiLatLng.lat - diffsize, targetPoiLatLng.lng - diffsize],[targetPoiLatLng.lat + diffsize, targetPoiLatLng.lng + diffsize]];

        //var myrect = L.rectangle(searchbounds, {color: "#ff7777", weight: 2}).addTo(map);

        // get  parking in that area
        var goodspots = new Array();
        $.each(parkingSpotArray, function(idx, spot){
            if (!spot.feature.properties.occupied)
            {
                var spotlat = spot.feature.geometry.coordinates[1];
                var spotlng = spot.feature.geometry.coordinates[0];
                //console.log(spot.feature.properties.occupied + " --> " + spotlat + "," + spotlng );
                if (
                        (
                        spotlat >= (targetPoiLatLng.lat - diffsize)
                        && (spotlat <= (targetPoiLatLng.lat + diffsize))
                        )
                        &&
                        (
                            spotlng >= (targetPoiLatLng.lng - diffsize)
                            && (spotlng <= (targetPoiLatLng.lng + diffsize))
                        )
                    ) {


                    goodspots.push(spot);

                }
            }

        });

        /*
        $.each(goodspots, function(idx, spot){
            console.log(spot);
        })
        */

        var selectedIndex = getRandomIntInclusive(0,goodspots.length - 1);

        //switch target PoiLatLong to parking spot
        var selectedSpot = goodspots[selectedIndex];

        console.log("--- my spot ---");
        console.log(selectedSpot);
        targetPoiLatLng = selectedSpot._latlng;

        //move my current position to here
        //myLocation.setLatLng(selectedSpot._latlng); // move this to the end of the route


        //Add Marker for starting Route Point
        var blueMarker = L.AwesomeMarkers.icon({
            prefix: 'fa',
            icon: 'crosshairs',
            markerColor: 'blue',
            spin: true
        });

        newLocation = L.marker(selectedSpot._latlng, {icon: blueMarker, draggable: 'true'}).addTo(map);




    })

    $('#btn-sms').on('click', function() {
        $('#thingspace-sms').modal('show');

        //Get a new token from thinkspace to use for SMS messages
        $.ajax({
            method: 'POST',
            url: 'https://thingspace.verizon.com/api/ts/v1/oauth2/token',
            headers: {"Authorization" : "Basic VFkwX0tuaFZ0UndqeE5CWmkzZVdLcmtmNzFJYTpMTGREQ3NRNllFZlZaWXRGcVVTZXdBRkdHbUFh"},
            data: { "grant_type" : "client_credentials"}


        }).done(function(data){
            console.log(data);
            smstoken = data.access_token;
        })

    });

    $('#btn-drive').on('click', function() {

        //get a new SMS token
        //Get a new token from thinkspace to use for SMS messages
        $.ajax({
            method: 'POST',
            url: 'https://thingspace.verizon.com/api/ts/v1/oauth2/token',
            headers: {"Authorization" : "Basic VFkwX0tuaFZ0UndqeE5CWmkzZVdLcmtmNzFJYTpMTGREQ3NRNllFZlZaWXRGcVVTZXdBRkdHbUFh"},
            data: { "grant_type" : "client_credentials"}


        }).done(function(data){
            console.log(data);
            smstoken = data.access_token;
        })

        animateDriving();
    })

    $('#btn-send-sms').on('click', function() {

        var sendTo = $('#txt-phonenumber').val();
        var sendMsg = $('#txt-message').val();

        if (sendTo.length > 9 && sendMsg.length > 0) {
            $.ajax({
                method: 'POST',
                url: 'https://thingspace.verizon.com/api/messaging/v1/sms',
                contentType: 'application/json; charset=UTF-8',
                headers: {"Authorization": "Bearer " + smstoken},
                data: JSON.stringify({
                    "recipient": sendTo,
                    "senderAddress": "900040002014",
                    "content": sendMsg ,
                    "transactionID": "vz" + Date.now(),
                    "deliveryReport": true
                })
            }).done (function(data){
                console.log(data);
            })
        }
    });


})