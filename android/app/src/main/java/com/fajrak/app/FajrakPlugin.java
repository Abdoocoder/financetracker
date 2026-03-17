package com.fajrak.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Fajrak")
public class FajrakPlugin extends Plugin {

    @PluginMethod
    public void saveSession(PluginCall call) {
        String token = call.getString("token");
        String userId = call.getString("userId");
        if (token == null || userId == null) {
            call.reject("Missing token or userId");
            return;
        }
        getContext().getSharedPreferences("fajrak", android.content.Context.MODE_PRIVATE)
            .edit()
            .putString("supabase_session", token)
            .putString("user_id", userId)
            .apply();
        call.resolve();
    }

    @PluginMethod
    public void getFCMToken(PluginCall call) {
        String token = getContext().getSharedPreferences("fajrak", android.content.Context.MODE_PRIVATE)
            .getString("fcm_token", null);
        if (token != null) {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("token", token);
            call.resolve(ret);
        } else {
            call.reject("No FCM token");
        }
    }
}
