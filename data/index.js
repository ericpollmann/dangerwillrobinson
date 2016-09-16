var Csv = require('csv');
var Fs = require('fs');
var Firebase = require('firebase');
var Geofire = require('geofire');
var Rsvp = require('rsvp');

function main() {
  Firebase.initializeApp({
    apiKey: "AIzaSyAYmxiA-EsOX6-_mCX8LDbj9gZAaDvU-II",
    authDomain: "superfund-8d935.firebaseapp.com",
    databaseURL: "https://superfund-8d935.firebaseio.com",
    storageBucket: "superfund-8d935.appspot.com",
    messagingSenderId: "902480587850"
  });
  var geo = new Geofire(Firebase.database().ref('_geofire'));
  var sites = Firebase.database().ref('sites');
  var fbPromises = [];

  var numSites = 0;
  var noPoint = 0;
  var headers;
  var stream = Fs.createReadStream('100000030.csv');
  stream.on('end', () => {
    console.log("Sites with point: " + (numSites-noPoint));
    console.log("Sites with no point: " + noPoint);
    console.log("Total sites: " + numSites);
    console.log("Waiting on firebase to finish writing...");
    Rsvp.allSettled(fbPromises).then(function() {
      console.log("Done.");
    });
  });
  stream.pipe(Csv.parse())
    .pipe(Csv.transform(function(record){
      if (headers == undefined) {
        headers = {};
        record.map(function(col, idx){
          headers[col] = idx;
          console.log('HEADERS:');
          console.log(headers);
        });
        return undefined;
      }
      numSites++;
// RG,SITE ID,EPA ID,SITE NAME,STREET ADDRESS,STREET ADDRESS 2,CITY,STATE,ZIP,
// CONG DISTRICT,COUNTY,FIPS CODE,LATITUDE,LONGITUDE,NPL,FF,NON NPL STATUS,,,,
      var id = record[headers['SITE ID']];
      var lat = parseFloat(record[headers['LATITUDE']]);
      var lon = parseFloat(record[headers['LONGITUDE']]);
      if (!isNaN(lat) && !isNaN(lon)) {
        console.log("ll (" + id + ") -> (" + lat + ", " + lon + ")"); // debug
        fbPromises.push(geo.set(id, [lat, lon]));

        // Only store site info if it has a lat/long
        fbPromises.push(sites.child(id).set({
          'region': record[headers['RG']],
          'name': record[headers['SITE NAME']],
          'lat': lat,
          'lon': lon,
        }));
        return record.map(function(value){return value.toUpperCase()});
      } else {
        noPoint++;
      }
      var region = record[headers['RG']];
    }))
    .pipe(Csv.stringify())
    .pipe(process.stdout);
}

main();
