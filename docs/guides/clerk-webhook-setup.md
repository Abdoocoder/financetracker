# Clerk Webhook Setup for Profile Auto-Creation

This guide covers configuring the Clerk webhook that automatically creates a `profiles` row in Supabase when a new user signs up via Clerk.

---

## 1. Overview

Since we dropped the `handle_new_user()` trigger (Clerk doesn't use GoTrue `auth.users`), new users who sign up via Clerk would have **no `profiles` row** — breaking the app.

The solution: a webhook endpoint at `/api/webhooks/clerk` that listens for Clerk's `user.created` event and inserts the profile row using the Supabase admin client.

---

## 2. Prerequisites

- Clerk application created (Dashboard → **Applications** → your app)
- Supabase project with `profiles` table (text `id` column, `email`, `full_name`, `currency`, `lang`, `onboarding_done`)
- `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel (already required for other admin routes)

---

## 3. Create the Webhook in Clerk Dashboard

1. Go to **Clerk Dashboard** → **Developers** → **Webhooks**
2. Click **Add Endpoint**
3. **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/clerk`
   - For local dev with ngrok: `https://<your-ngrok-subdomain>.ngrok-free.app/api/webhooks/clerk`
4. **Events to send**: Select **`user.created`** only
   - (We only handle `user.created`; other events are acknowledged silently)
5. Click **Create**
6. Copy the **Signing Secret** (starts with `whsec_...`)

---

## 4. Configure Environment Variables

### Local Development (`.env.local`)

```bash
# .env.local (never commit this)
CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

### Vercel Production (Dashboard → Settings → Environment Variables)

| Name | Value | Environment |
|------|-------|-------------|
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | Production, Preview |

> **Note**: The variable is read in `app/api/webhooks/clerk/route.ts` via `process.env.CLERK_WEBHOOK_SECRET`.

---

## 5. Local Testing with ngrok

Since Clerk needs a public HTTPS URL to send webhooks, use ngrok for local testing:

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start ngrok tunnel to port 3000
ngrok http 3000
# → Forwarding https://abc123.ngrok-free.app -> http://localhost:3000
```

1. Copy the HTTPS ngrok URL (e.g., `https://abc123.ngrok-free.app`)
2. In Clerk Dashboard → Webhooks → Edit your endpoint → Update URL to:
   `https://abc123.ngrok-free.app/api/webhooks/clerk`
3. Trigger a test signup in your local app
4. Check the terminal running `npm run dev` for logs:
   ```
   [webhook/clerk] Profile created for user: user_2abc...
   ```

---

## 6. Verifying the Webhook Works

### In Clerk Dashboard

1. Go to **Webhooks** → your endpoint → **Delivery Attempts**
2. You should see a `200 OK` for `user.created`
3. Click an attempt to see request/response details

### In Supabase Dashboard

1. Go to **Table Editor** → `profiles`
2. After a test signup, you should see a new row:
   - `id`: `user_2abc...` (Clerk sub)
   - `email`: the user's email
   - `full_name`: "First Last" (from Clerk)
   - `currency`: `KWD`
   - `lang`: `ar`
   - `onboarding_done`: `false`

---

## 6. Webhook Payload Reference

The endpoint expects the standard Clerk `user.created` payload:

```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123def456",
    "email_addresses": [
      {
        "id": "email_123",
        "email_address": "user@example.com",
        "verification": { "status": "verified", "strategy": "email_code" }
      }
    ],
    "first_name": "Ahmed",
    "last_name": "Al-Rashid",
    "username": "ahmed_rashid",
    "image_url": "https://img.clerk.com/...",
    "created_at": 1704067200000,
    "updated_at": 1704067200000
  }
}
```

### Field Mapping

| Clerk Field | Profiles Column | Notes |
|-------------|-----------------|-------|
| `data.id` | `id` (PK) | Clerk sub (`user_...`) becomes profile PK |
| `data.email_addresses[0].email_address` | `email` | First verified email preferred |
| `data.first_name + data.last_name` | `full_name` | Concatenated, null if both missing |
| — | `currency` | Defaults to `KWD` |
| — | `lang` | Defaults to `ar` |
| — | `onboarding_done` | Defaults to `false` |

---

## 7. Idempotency & Retries

Clerk retries webhooks on non-2xx responses. The endpoint uses:

```typescript
.upsert(profileData, { onConflict: 'id', ignoreDuplicates: true })
```

- **Duplicate `user.created`** (retry): Ignored silently, returns `200 OK`
- **Race condition**: `ignoreDuplicates: true` prevents errors if profile already exists

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `400 Invalid signature` | Wrong `CLERK_WEBHOOK_SECRET` | Verify secret matches Clerk Dashboard exactly |
| `500 Webhook secret not configured` | Env var missing | Add `CLERK_WEBHOOK_SECRET` to Vercel / `.env.local` |
| `400 User has no email` | Clerk user without email | Clerk requires email; check user in Dashboard |
| `500 Failed to create profile` | DB error (RLS, missing table, etc.) | Check Supabase logs; verify `profiles` table schema |
| No delivery in Clerk Dashboard | Wrong URL or ngrok not running | Verify URL matches ngrok HTTPS URL exactly |
| Profile not created | `user.created` not selected | Check Clerk Webhook → Events: must include `user.created` |

---

## 9. Security Notes

- **Svix verification**: Every request is verified using `svix` library with the signing secret. Invalid signatures return `400`.
- **Admin client**: Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) — only imported in this route handler.
- **No PII in logs**: Only `user_...` ID is logged; email/name are not written to console.
- **HTTPS required**: Clerk only sends to HTTPS endpoints (ngrok provides this locally).

---

## 10. Future Extensions

When needed, extend the endpoint to handle:

| Event | Use Case |
|-------|----------|
| `user.updated` | Sync email/name changes to `profiles` |
| `user.deleted` | Soft-delete or cleanup profile data |
| `session.created` | Track active sessions (analytics) |

Add cases inside the `POST` handler after the `user.created` block.

---

## 11. Related Files

- **Route**: `app/api/webhooks/clerk/route.ts`
- **Tests**: `__tests__/api/webhooks-clerk.test.ts`
- **Admin Client**: `lib/supabase/admin.ts`
- **Env Example**: `.env.example` (search for `CLERK_WEBHOOK_SECRET`)