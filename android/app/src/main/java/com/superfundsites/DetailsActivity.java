package com.superfundsites;

import android.location.Location;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.webkit.WebView;

import pl.charmas.android.reactivelocation.ReactiveLocationProvider;
import rx.Subscription;
import rx.functions.Action1;

public class DetailsActivity extends AppCompatActivity {

    private static final String TAG = "Superfund";
    private static final String BASE_URL = "https://superfund-8d935.firebaseapp.com/";
    private ReactiveLocationProvider reactiveLocationProvider;
    private Subscription lastKnownLocationSubscription;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_details);
        reactiveLocationProvider = new ReactiveLocationProvider(this);
    }

    @Override
    protected void onStart() {
        super.onStart();
        lastKnownLocationSubscription = reactiveLocationProvider
                .getLastKnownLocation()
                .subscribe(new Action1<Location>() {
                    @Override
                    public void call(Location location) {
                        String url = String.format("%s?latitude=%s&longitude=%s", BASE_URL,
                                location.getLatitude(), location.getLongitude());
                        Log.d(TAG, "Displaying: " + url);
                        WebView myWebView = (WebView) findViewById(R.id.webview);
                        myWebView.getSettings().setJavaScriptEnabled(true);
                        myWebView.loadUrl(url);
                    }
                });
    }

    @Override
    protected void onStop() {
        super.onStop();
        lastKnownLocationSubscription.unsubscribe();
    }
}
