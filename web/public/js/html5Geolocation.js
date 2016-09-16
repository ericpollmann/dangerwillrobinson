var myLocation = null;
var fakeLocation = null;

/* Uses the HTML5 geolocation API to get the current user's location */
var getLocation = function(fake) {
  fakeLocation = fake;
  if (typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined") {
    console.log("Asking user to get their location");
    navigator.geolocation.getCurrentPosition(geolocationCallback, errorHandler);
  } else {
    console.log("Your browser does not support the HTML5 Geolocation API, so this demo will not work.")
  }
};

/* Callback method from the geolocation API which receives the current user's location */
var geolocationCallback = function(location) {
  var latitude, longitude;
  if (fakeLocation) {
    latitude = locations[fakeLocation][0];
    longitude = locations[fakeLocation][1];
  } else {
    latitude = location.coords.latitude;
    longitude = location.coords.longitude;
  }
  myLocation = [latitude, longitude];
  console.log("Retrieved user's location: [" + latitude + ", " + longitude + "]");
  zoomToMe();
}

var zoomToMe = function() {
  if (!myLocation) {
    console.log("ERROR: user location not set!");
    return;
  }
  var latitude = myLocation[0];
  var longitude = myLocation[1];
  updateMapCenter([latitude, longitude]);
  me.marker.setPosition(new google.maps.LatLng(latitude, longitude));
  updatePersonPosition(me.uid, {lat: latitude, lng: longitude});
}

/* Handles any errors from trying to get the user's current location */
var errorHandler = function(error) {
  if (error.code == 1) {
    console.log("Error: PERMISSION_DENIED: User denied access to their location");
  } else if (error.code === 2) {
    console.log("Error: POSITION_UNAVAILABLE: Network is down or positioning satellites cannot be reached");
  } else if (error.code === 3) {
    console.log("Error: TIMEOUT: Calculating the user's location took too long");
  } else {
    console.log("Unexpected error code")
  }
};
