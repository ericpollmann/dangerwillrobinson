package com.superfundsites;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.ActionBarActivity;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.common.api.Status;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingRequest;

import pl.charmas.android.reactivelocation.ReactiveLocationProvider;
import rx.Observable;
import rx.Subscription;
import rx.functions.Action1;
import rx.functions.Func1;

public class GeofenceActivity extends ActionBarActivity {
    private static final String TAG = "GeofenceActivity";
    public static final int MY_PERMISSIONS_REQUEST_READ_CONTACTS = 1;
    private ReactiveLocationProvider reactiveLocationProvider;
    private EditText latitudeInput;
    private EditText longitudeInput;
    private EditText radiusInput;
    private TextView lastKnownLocationView;
    private Subscription lastKnownLocationSubscription;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        reactiveLocationProvider = new ReactiveLocationProvider(this);
        setContentView(R.layout.activity_geofence);
        initViews();

        // Here, thisActivity is the current activity
        if (ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {

            // Should we show an explanation?
            if (ActivityCompat.shouldShowRequestPermissionRationale(this,
                    Manifest.permission.ACCESS_FINE_LOCATION)) {

                // Show an expanation to the user *asynchronously* -- don't block
                // this thread waiting for the user's response! After the user
                // sees the explanation, try again to request the permission.

            } else {

                // No explanation needed, we can request the permission.

                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                        MY_PERMISSIONS_REQUEST_READ_CONTACTS);

                // MY_PERMISSIONS_REQUEST_READ_CONTACTS is an
                // app-defined int constant. The callback method gets the
                // result of the request.
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           String permissions[], int[] grantResults) {
        switch (requestCode) {
            case MY_PERMISSIONS_REQUEST_READ_CONTACTS: {
                // If request is cancelled, the result arrays are empty.
                if (grantResults.length > 0
                        && grantResults[0] == PackageManager.PERMISSION_GRANTED) {

                    // permission was granted, yay! Do the
                    // contacts-related task you need to do.

                } else {

                    // permission denied, boo! Disable the
                    // functionality that depends on this permission.
                }
                return;
            }

            // other 'case' lines to check for other
            // permissions this app might request
        }
    }

    private void initViews() {
        lastKnownLocationView = (TextView) findViewById(R.id.last_known_location_view);
        latitudeInput = (EditText) findViewById(R.id.latitude_input);
        longitudeInput = (EditText) findViewById(R.id.longitude_input);
        radiusInput = (EditText) findViewById(R.id.radius_input);
        findViewById(R.id.add_button).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addGeofence();
            }
        });
        findViewById(R.id.clear_button).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clearGeofence();
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        lastKnownLocationSubscription = reactiveLocationProvider
                .getLastKnownLocation()
                .map(new LocationToStringFunc())
                .subscribe(new DisplayTextOnViewAction(lastKnownLocationView));
    }

    @Override
    protected void onStop() {
        super.onStop();
        lastKnownLocationSubscription.unsubscribe();
    }

    private void clearGeofence() {
        reactiveLocationProvider.removeGeofences(createNotificationBroadcastPendingIntent()).subscribe(new Action1<Status>() {
            @Override
            public void call(Status status) {
                toast("Geofences removed");
            }
        }, new Action1<Throwable>() {
            @Override
            public void call(Throwable throwable) {
                toast("Error removing geofences");
                Log.d(TAG, "Error removing geofences", throwable);
            }
        });
    }

    private void toast(String text) {
        Toast.makeText(GeofenceActivity.this, text, Toast.LENGTH_SHORT).show();
    }

    private PendingIntent createNotificationBroadcastPendingIntent() {
        return PendingIntent.getBroadcast(this, 0, new Intent(this, GeofenceBroadcastReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT);
    }

    public void addGeofence() {
        final GeofencingRequest geofencingRequest = createGeofencingRequest();
        if (geofencingRequest == null) return;

        final PendingIntent pendingIntent = createNotificationBroadcastPendingIntent();
        reactiveLocationProvider
                .removeGeofences(pendingIntent)
                .flatMap(new Func1<Status, Observable<Status>>() {
                    @Override
                    public Observable<Status> call(Status pendingIntentRemoveGeofenceResult) {
                        return reactiveLocationProvider.addGeofences(pendingIntent, geofencingRequest);
                    }
                })
                .subscribe(new Action1<Status>() {
                    @Override
                    public void call(Status addGeofenceResult) {
                        toast("Geofence added, success: " + addGeofenceResult.isSuccess());
                    }
                }, new Action1<Throwable>() {
                    @Override
                    public void call(Throwable throwable) {
                        toast("Error adding geofence.");
                        Log.d(TAG, "Error adding geofence.", throwable);
                    }
                });
    }

    private GeofencingRequest createGeofencingRequest() {
        try {
            double longitude = Double.parseDouble(longitudeInput.getText().toString());
            double latitude = Double.parseDouble(latitudeInput.getText().toString());
            float radius = Float.parseFloat(radiusInput.getText().toString());
            Geofence geofence = new Geofence.Builder()
                    .setRequestId("GEOFENCE")
                    .setNotificationResponsiveness(1)
                    .setCircularRegion(latitude, longitude, radius)
                    .setExpirationDuration(Geofence.NEVER_EXPIRE)
                    .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER | Geofence.GEOFENCE_TRANSITION_EXIT)
                    .build();
            return new GeofencingRequest.Builder()
                    .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                    .addGeofence(geofence).build();
        } catch (NumberFormatException ex) {
            toast("Error parsing input.");
            return null;
        }
    }
}