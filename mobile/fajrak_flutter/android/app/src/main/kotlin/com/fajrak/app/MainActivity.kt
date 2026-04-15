package com.fajrak.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // enableEdgeToEdge() must be called before super.onCreate() so Flutter
        // inherits the correct window configuration. It replaces the deprecated
        // Window.setStatusBarColor / setNavigationBarColor / setDecorFitsSystemWindows
        // APIs that Google Play flags in Android 15 (API 35+).
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }
}
