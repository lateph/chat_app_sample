package com.lateph;

import android.app.Application;
import android.util.Log;

public class MyApplication extends Application {
    @Override
    public void onCreate() {
        Log.d("MyApplication", "onCreate");
        super.onCreate();
    }
}