var defaults = {
  radiusInKm: 10,  // Query radius for danger sites
  zoomLevel: 14,
  center: [37.3842209, -122.1142677]
}
var map;
var urlParams;

// Public danger database
var dangerFirebaseRef = new Firebase("https://superfund-8d935.firebaseio.com/")
var geoFire = new GeoFire(dangerFirebaseRef.child("_geofire"));

/*************/
/*  GEOQUERY */
/*************/
var sitesInQuery = {};  // All sites currently onscreen

var geoQuery = null;
var startQuery = function(e) {
  var lat = parseFloat(urlParams.latitude);
  var lon = parseFloat(urlParams.longitude);
  if (isNaN(lat)) {
    lat = defaults.center[0];
  }
  if (isNaN(lon)) {
    lon = defaults.center[1];
  }
  center = [lat, lon];
  initializeMap(center);

  // Create a new GeoQuery instance
  geoQuery = geoFire.query({
    center: center,
    radius: defaults.radiusInKm
  });

  // Add new site markers to the map when they enter the query
  geoQuery.on("key_entered", function(siteId, siteLocation) {
    sitesInQuery[siteId] = true;

    // Look up the site's data
    dangerFirebaseRef.child("sites").child(siteId).once("value", function(dataSnapshot) {
      site = dataSnapshot.val();

      // If the site has not already exited this query in the time it took to look up its data, add it to the map
      if (site !== null && sitesInQuery[siteId] === true) {
        sitesInQuery[siteId] = site;
        site.marker = createSiteMarker(site, getSiteColor(site));
      }
    });
  });

  // Move sites markers on the map when their location within the query changes
  geoQuery.on("key_moved", function(siteId, siteLocation) {
    var site = sitesInQuery[siteId];
    if (typeof site !== "undefined" && typeof site.marker !== "undefined") {
      site.marker.animatedMoveTo(siteLocation);
    }
  });

  // Remove site markers from the map when they exit the query */
  geoQuery.on("key_exited", function(siteId, siteLocation) {
    var site = sitesInQuery[siteId];

    // If the site's data has already been loaded from the database, remove its marker from the map
    if (site !== true) {
      site.marker.setMap(null);
    }

    delete sitesInQuery[siteId];
  });
}

/*****************/
/*  GOOGLE MAPS  */
/*****************/

function initializeMap(center) {
  // Get the location as a Google Maps latitude-longitude object
  var loc = new google.maps.LatLng(center[0], center[1]);

  // Create the map
  map = new google.maps.Map(document.getElementById("map-canvas"), {
    center: loc,
    zoom: defaults.zoomLevel,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Update the query's criteria every time the map is dragged
  var updateCriteria = _.debounce(function() {
    var center = map.getCenter();
    var mapBoundNorthEast = map.getBounds().getNorthEast();
    var radiusKm = google.maps.geometry.spherical.computeDistanceBetween(mapBoundNorthEast, center)/1000;
    geoQuery.updateCriteria({
      center: [center.lat(), center.lng()],
      radius: radiusKm
    });
  }, 10);
  map.addListener("bounds_changed", updateCriteria);
}

/**********************/
/*  HELPER FUNCTIONS  */
/**********************/

// Add a marker for the site to the map */
function createSiteMarker(site, siteColor) {
  var marker = new google.maps.Marker({
    icon: "https://chart.googleapis.com/chart?chst=d_bubble_icon_text_small&chld=caution|edge_bc|" + site.name + "|" + siteColor + "|eee",
    position: new google.maps.LatLng(site.lat, site.lon),
    optimized: true,
    map: map
  });

  return marker;
}

// Return appropriate color based on site
function getSiteColor(site) {
  return 'FF6450';
}

// Return true if the two given coordinates are approximately equivalent
function coordinatesAreEquivalent(coord1, coord2) {
  return (Math.abs(coord1 - coord2) < 0.000001);
}

// Animate the Marker class (based on https://stackoverflow.com/a/10906464)
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
    }.bind(this), 15);
  }
};

// Parse query params into urlParams global
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
