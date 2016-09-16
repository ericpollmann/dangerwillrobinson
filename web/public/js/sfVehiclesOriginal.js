// Global map variable
var map;

// Query radius
var radiusInKm = 2.5;

// Get a reference to the Firebase public transit open data set
// var transitFirebaseRef = new Firebase("https://publicdata-transit.firebaseio.com/")
var transitFirebaseRef = new Firebase("https://superfund-8d935.firebaseio.com/")

// Create a new GeoFire instance, pulling data from the public transit data
var geoFire = new GeoFire(transitFirebaseRef.child("_geofire"));

// Query params parsed from url (see function at end)
var urlParams;

/*************/
/*  GEOQUERY */
/*************/
// Keep track of all of the sites currently within the query
var sitesInQuery = {};

var geoQuery = null;
var startQuery = function(e) {
  var lat = parseFloat(urlParams.latitude);
  if (isNaN(lat)) {
    lat = 37.3842209;
  }
  var lon = parseFloat(urlParams.longitude);
  if (isNaN(lon)) {
    lon = -122.1142677;
  }
  
  defaultCenter = [lat, lon];
  initializeMap(defaultCenter);

  // Create a new GeoQuery instance
  geoQuery = geoFire.query({
    center: defaultCenter,
    radius: radiusInKm
  });

  /* Adds new site markers to the map when they enter the query */
  geoQuery.on("key_entered", function(siteId, siteLocation) {
    // Specify that the site has entered this query
    sitesInQuery[siteId] = true;

    // Look up the site's data
    transitFirebaseRef.child("sites").child(siteId).once("value", function(dataSnapshot) {
      // Get the site data from the Open Data Set
      site = dataSnapshot.val();

      // If the site has not already exited this query in the time it took to look up its data, add it to the map
      if (site !== null && sitesInQuery[siteId] === true) {
        // Add the site to the list of sites in the query
        sitesInQuery[siteId] = site;

        // Create a new marker for the site
        site.marker = createSiteMarker(site, getSiteColor(site));
      }
    });
  });

  /* Moves sites markers on the map when their location within the query changes */
  geoQuery.on("key_moved", function(siteId, siteLocation) {
    // Get the site from the list of sites in the query
    var site = sitesInQuery[siteId];

    // Animate the site's marker
    if (typeof site !== "undefined" && typeof site.marker !== "undefined") {
      site.marker.animatedMoveTo(siteLocation);
    }
  });

  /* Removes site markers from the map when they exit the query */
  geoQuery.on("key_exited", function(siteId, siteLocation) {
    // Get the site from the list of sites in the query
    var site = sitesInQuery[siteId];

    // If the site's data has already been loaded from the Open Data Set, remove its marker from the map
    if (site !== true) {
      site.marker.setMap(null);
    }

    // Remove the site from the list of sites in the query
    delete sitesInQuery[siteId];
  });
}

/*****************/
/*  GOOGLE MAPS  */
/*****************/
/* Initializes Google Maps */
function initializeMap(center) {
  // Get the location as a Google Maps latitude-longitude object
  var loc = new google.maps.LatLng(center[0], center[1]);

  // Create the Google Map
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    center: loc,
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create a draggable circle centered on the map
  var circle = new google.maps.Circle({
    strokeColor: "#6D3099",
    strokeOpacity: 0.7,
    strokeWeight: 1,
    fillColor: "#B650FF",
    fillOpacity: 0.35,
    map: map,
    center: loc,
    radius: ((radiusInKm) * 1000),
    draggable: true
  });

  //Update the query's criteria every time the circle is dragged
  var updateCriteria = _.debounce(function() {
    var latLng = circle.getCenter();
    geoQuery.updateCriteria({
      center: [latLng.lat(), latLng.lng()],
      radius: radiusInKm
    });
  }, 10);
  google.maps.event.addListener(circle, "drag", updateCriteria);
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/
/* Adds a marker for the site to the map */
function createSiteMarker(site, siteColor) {
  var marker = new google.maps.Marker({
    icon: "https://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=caution|edge_bc|" + site.name + "|" + siteColor + "|eee",
    position: new google.maps.LatLng(site.lat, site.lon),
    optimized: true,
    map: map
  });

  return marker;
}

/* Returns a blue color code for outbound sites or a red color code for inbound sites */
function getSiteColor(site) {
  return ((site.dirTag && site.dirTag.indexOf("OB") > -1) ? "50B1FF" : "FF6450");
}

/* Returns true if the two given coordinates are approximately equivalent */
function coordinatesAreEquivalent(coord1, coord2) {
  return (Math.abs(coord1 - coord2) < 0.000001);
}

/* Animates the Marker class (based on https://stackoverflow.com/a/10906464) */
google.maps.Marker.prototype.animatedMoveTo = function(newLocation) {
  var toLat = newLocation[0];
  var toLng = newLocation[1];

  var fromLat = this.getPosition().lat();
  var fromLng = this.getPosition().lng();

  if (!coordinatesAreEquivalent(fromLat, toLat) || !coordinatesAreEquivalent(fromLng, toLng)) {
    var percent = 0;
    var latDistance = toLat - fromLat;
    var lngDistance = toLng - fromLng;
    var interval = window.setInterval(function () {
      percent += 0.01;
      var curLat = fromLat + (percent * latDistance);
      var curLng = fromLng + (percent * lngDistance);
      var pos = new google.maps.LatLng(curLat, curLng);
      this.setPosition(pos);
      if (percent >= 1) {
        window.clearInterval(interval);
      }
    }.bind(this), 50);
  }
};

// Query param parsing
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();
