package com.fajrak.app

import android.os.Bundle
import androidx.core.view.WindowCompat
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Opt into edge-to-edge without calling the deprecated
        // Window.setStatusBarColor / setNavigationBarColor APIs.
        // The remaining Play Console warnings (io.flutter.plugin.platform.*)
        // originate from the Flutter engine itself and are fixed by upgrading Flutter.
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }
}
