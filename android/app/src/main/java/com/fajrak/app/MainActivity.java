package com.fajrak.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FajrakPlugin.class);
        super.onCreate(savedInstanceState);
        requestNotificationPermission();
        registerFCMToken();
    }

    private static final String SUPABASE_URL = "https://ujwcvtpwsaidljecqbaa.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqd2N2dHB3c2FpZGxqZWNxYmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTUxNTQsImV4cCI6MjA4ODU3MTE1NH0.AgwLNG0i3srUCixr_b47of6ur7RlCZuUio7DivPzlCw";



    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
            }
        }
    }

    private void registerFCMToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) return;
            String fcmToken = task.getResult();
            android.util.Log.d("FCM", "Token: " + fcmToken);

            // احفظ الـ token في SharedPreferences
            getSharedPreferences("fajrak", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", fcmToken)
                .apply();

            // أرسل الـ token لـ Supabase Edge Function
            new Thread(() -> sendTokenToServer(fcmToken)).start();
        });
    }

    private void sendTokenToServer(String fcmToken) {
        try {
            // احصل على الـ session من SharedPreferences
            String session = getSharedPreferences("fajrak", MODE_PRIVATE)
                .getString("supabase_session", null);
            if (session == null) return;

            URL url = new URL(SUPABASE_URL + "/rest/v1/push_subscriptions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", SUPABASE_ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + session);
            conn.setRequestProperty("Prefer", "resolution=merge-duplicates");
            conn.setDoOutput(true);

            String body = "{\"endpoint\":\"fcm:" + fcmToken + "\",\"p256dh\":\"fcm\",\"auth\":\"fcm\"}";
            OutputStream os = conn.getOutputStream();
            os.write(body.getBytes(StandardCharsets.UTF_8));
            os.close();

            int responseCode = conn.getResponseCode();
            android.util.Log.d("FCM", "Token sent, response: " + responseCode);
            conn.disconnect();
        } catch (Exception e) {
            android.util.Log.e("FCM", "Error sending token: " + e.getMessage());
        }
    }
}
