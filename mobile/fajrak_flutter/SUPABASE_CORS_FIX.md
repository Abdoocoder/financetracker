# Supabase CORS Configuration Fix

## The Issue
When running the Flutter web app locally (`http://localhost:33963`), requests to Supabase are blocked by CORS policy:

```
Access to fetch at 'https://ujwcvtpwsaidljecqbaa.supabase.co/auth/v1/token?grant_type=password' 
from origin 'http://localhost:33963' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
Supabase's Auth API rejects requests from origins not in its allowed CORS list. By default, only the production domain is allowed.

## Solution: Configure Supabase Dashboard

### Option 1: Add Localhost to Redirect URLs (Recommended for Auth)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ujwcvtpwsaidljecqbaa/auth/url-configuration)
2. In **Additional Redirect URLs**, add:
   ```
   http://localhost:33963/**
   http://127.0.0.1:33963/**
   http://localhost:33964/**
   http://127.0.0.1:33964/**
   ```
3. Click **Save**

### Option 2: Configure CORS for Storage/Database APIs

If you also get CORS errors for Storage or Database REST API:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ujwcvtpwsaidljecqbaa/storage/settings)
2. In **CORS Configuration**, add:
   ```json
   [
     {
       "origin": "http://localhost:33963",
       "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
       "headers": ["Content-Type", "Authorization", "apikey", "x-client-info"],
       "maxAgeSeconds": 3600
     },
     {
       "origin": "http://127.0.0.1:33963",
       "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
       "headers": ["Content-Type", "Authorization", "apikey", "x-client-info"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
3. Click **Save**

## Verification

After configuring, restart your Flutter web app:
```bash
flutter run -d chrome --web-port=33963
```

The authentication should now work without CORS errors.

## Production Deployment

For production, add your actual domain(s):
- `https://yourdomain.com/**`
- `https://www.yourdomain.com/**`

## Alternative: Development Proxy

If you cannot modify Supabase settings, use the development proxy:

```bash
# Terminal 1: Start proxy
dart run dev_proxy.dart

# Terminal 2: Run Flutter with proxy
flutter run -d chrome \
  --web-port=33963 \
  --dart-define=SUPABASE_URL=http://localhost:33964 \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

The proxy (`dev_proxy.dart`) adds CORS headers to all responses from Supabase.

## Common Issues

| Issue | Solution |
|-------|----------|
| Still getting CORS after config | Wait 1-2 minutes for Supabase to propagate changes |
| Auth works but Storage fails | Configure Storage CORS separately (Option 2) |
| WebSocket errors | Add `ws://localhost:33963` to Realtime settings |
| Cookies not working | Ensure `http://localhost:33963` is in redirect URLs (not just CORS) |

## References
- [Supabase CORS Docs](https://supabase.com/docs/guides/platform/cors)
- [Supabase Auth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Flutter Web CORS](https://docs.flutter.dev/platform-integration/web/cors)