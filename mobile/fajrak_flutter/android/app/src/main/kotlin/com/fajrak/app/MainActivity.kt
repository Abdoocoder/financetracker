package com.fajrak.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import io.flutter.embedding.android.FlutterFragmentActivity

// FlutterFragmentActivity extends FragmentActivity → ComponentActivity,
// which is required for enableEdgeToEdge() (a ComponentActivity extension).
// FlutterActivity extends Activity directly in some Flutter versions and
// would cause a "receiver type mismatch" compile error with enableEdgeToEdge().
class MainActivity : FlutterFragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called before super.onCreate so Flutter inherits the
        // correct inset configuration. Replaces the deprecated
        // Window.setStatusBarColor / setNavigationBarColor /
        // setNavigationBarDividerColor APIs flagged by Google Play Console
        // for Android 15 (API 35) compliance.
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
    }
}
