package com.fajrak.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // enableEdgeToEdge() uses WindowInsetsController (non-deprecated) to make
        // system bars transparent — replaces the deprecated setStatusBarColor /
        // setNavigationBarColor / setNavigationBarDividerColor APIs.
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // Let Flutter draw behind system bars.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        // Light icons on dark background (matches the app's dark theme).
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
    }
}
