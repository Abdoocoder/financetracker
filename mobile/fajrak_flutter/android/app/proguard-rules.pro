# Flutter handles its own obfuscation via --obfuscate flag
# This file exists to satisfy R8 full mode and avoid warnings

# Keep Flutter engine entry points
-keep class io.flutter.embedding.android.FlutterActivity { *; }
-keep class io.flutter.embedding.android.FlutterFragmentActivity { *; }
-keep class io.flutter.embedding.engine.FlutterEngine { *; }

# Keep MainActivity
-keep class com.fajrak.app.MainActivity { *; }

# Keep Firebase Messaging service
-keep class com.google.firebase.messaging.FirebaseMessagingService { *; }

# Keep Supabase Realtime (if using native)
-keep class io.supabase.flutter.** { *; }

# Keep Drift/SQLCipher native libraries
-keep class net.sqlcipher.** { *; }

# Prevent R8 from stripping unused resources referenced dynamically
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# Optimize resource shrinking - allow R8 to remove unused resources
# (enabled by default in AGP 9.0+ when isMinifyEnabled = true)