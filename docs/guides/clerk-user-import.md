# Importing Supabase Users to Clerk

This guide walks through importing users from Supabase (exported via `scripts/export-supabase-users.ts`) into Clerk, and generating the identity map (`scripts/identity-map.csv`) needed for the Neon backfill.

---

## 1. Prerequisites

- **Clerk Backend API key** — Create one at Clerk Dashboard → **Developers** → **API Keys** → **New Secret Key**. Store as `CLERK_SECRET_KEY` in your environment.
- **Node.js 20+** — The import script uses native `fetch` and `crypto`.
- **Exported CSV** — Run `scripts/export-supabase-users.ts` first to produce `scripts/users-to-migrate.csv`.

```bash
# Terminal 1: export users
DATABASE_URL=postgresql://... npx tsx scripts/export-supabase-users.ts
# → scripts/users-to-migrate.csv (id,email)
```

---

## 2. Import Strategy

Clerk does **not** support bulk user import via a single API call. Each user must be created individually via the **Backend API** (`POST /v1/users`).

Key constraints:
- **Passwords**: Supabase stores bcrypt hashes (`password_digest`). Clerk accepts `password_digest` (bcrypt, Argon2, PBKDF2, etc.) directly — no plaintext needed.
- **External IDs**: We map each Supabase `id` (UUID) to the Clerk `external_id` field. This makes the identity map trivial: `Clerk user.external_id = old UUID`.
- **Emails**: Must be unique in Clerk. If a user already exists (e.g., signed up via OAuth), the create will fail with `422`. The script handles this by fetching the existing user.

---

## 3. Import Script

Save as `scripts/import-to-clerk.ts` and run it:

```bash
CLERK_SECRET_KEY=sk_test_... npx tsx scripts/import-to-clerk.ts
```

```typescript
// scripts/import-to-clerk.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')
const REPO_ROOT = resolve(__dirname, '..')
const INPUT_CSV = resolve(REPO_ROOT, 'scripts', 'users-to-migrate.csv')
const OUTPUT_CSV = resolve(REPO_ROOT, 'scripts', 'identity-map.csv')
const CLERK_API = 'https://api.clerk.com/v1'

interface UserRow {
  id: string
  email: string
}

interface ClerkUser {
  id: string
  external_id: string | null
  email_addresses: { email_address: string }[]
}

const SECRET = process.env.CLERK_SECRET_KEY
if (!SECRET) {
  console.error('❌ CLERK_SECRET_KEY not set')
  process.exit(1)
}

function parseCSV(path: string): UserRow[] {
  const text = readFileSync(path, 'utf-8').trim()
  const lines = text.split('\n')
  if (lines[0] !== 'id,email') throw new Error('Unexpected CSV header')
  return lines.slice(1).map((line) => {
    const [id, email] = line.split(',')
    return { id, email }
  })
}

async function clerkFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${CLERK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function createOrGetUser(user: UserRow): Promise<ClerkUser> {
  // Try create first
  const createRes = await clerkFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      external_id: user.id, // Supabase UUID → Clerk external_id
      email_address: [user.email],
      password_digest: '', // Leave empty: users will reset password on first Clerk sign-in
      // Alternatively, if you exported password_digest from Supabase:
      // password_digest: user.password_digest,
      skip_password_requirement: true, // Allow empty password_digest
    }),
  })

  if (createRes.ok) {
    return createRes.json()
  }

  const err = await createRes.json()
  // If email already exists, fetch by email
  if (createRes.status === 422 && err.errors?.[0]?.code === 'form_param_email_exists') {
    const listRes = await clerkFetch(`/users?email_address=${encodeURIComponent(user.email)}`)
    const list = await listRes.json()
    if (list.length > 0) return list[0]
  }
  throw new Error(`Failed to create/get user ${user.email}: ${JSON.stringify(err)}`)
}

async function main() {
  console.log('📖 Reading users-to-migrate.csv...')
  const users = parseCSV(INPUT_CSV)
  console.log(`   Found ${users.length} users`)

  const mapRows: string[] = ['old_uuid,clerk_sub']

  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    process.stdout.write(`\r🔄 [${i + 1}/${users.length}] ${user.email}...`)
    try {
      const clerkUser = await createOrGetUser(user)
      const clerkSub = clerkUser.id // e.g., "user_2abc..."
      mapRows.push(`${user.id},${clerkSub}`)
    } catch (e) {
      console.error(`\n❌ Failed for ${user.email}: ${e}`)
      process.exit(1)
    }
  }

  console.log('\n✅ Writing identity-map.csv...')
  writeFileSync(OUTPUT_CSV, mapRows.join('\n') + '\n', 'utf-8')
  console.log(`   Done: ${OUTPUT_CSV}`)
}

main()
```

---

## 4. Password Handling (Important)

**Option A — Empty passwords (recommended for migration):**

- Set `password_digest: ''` + `skip_password_requirement: true`
- Users receive a "Set up your password" email on first Clerk sign-in (Clerk handles this automatically if you enable **Password** in Authentication settings).
- **Pro**: No credential exposure, simplest migration.
- **Con**: Users must complete a password reset flow.

**Option B — Migrate bcrypt hashes:**

- Export `password_digest` from Supabase (`auth.users.encrypted_password`).
- Pass it directly to Clerk: `password_digest: '$2a$10$...'` (bcrypt).
- **Pro**: Seamless — users keep their password.
- **Con**: Requires `SUPABASE_SERVICE_ROLE_KEY` to read `encrypted_password` (not in `auth.users` view by default).

> **Recommendation**: Use **Option A**. It avoids handling sensitive hashes and Clerk's password reset flow is battle-tested.

---

## 5. Verifying the Identity Map

After the script completes, inspect `scripts/identity-map.csv`:

```csv
old_uuid,clerk_sub
11111111-1111-1111-1111-111111111111,user_2abc123def456
22222222-2222-2222-2222-222222222222,user_3def456ghi789
...
```

- Every row must have a `clerk_sub` (Clerk user ID starting with `user_`).
- Count must match `users-to-migrate.csv` lines - 1 (header).

---

## 6. Loading the Map into Neon

Before running the backfill, load the CSV into a temp table in Neon:

```sql
-- Run in Neon SQL Editor
create schema if not exists _clerk_migration;
create table if not exists _clerk_migration.identity_map (
  old_uuid uuid not null primary key,
  clerk_sub text not null unique
);

-- Use \copy (psql) or COPY FROM PROGRAM (if superuser) to load:
-- \copy _clerk_migration.identity_map from 'scripts/identity-map.csv' with csv header
```

If using the Neon SQL Editor (web), you can't use `\copy`. Instead, create a temporary `INSERT` script:

```bash
# Generate INSERT statements
node -e "
const fs = require('fs');
const lines = fs.readFileSync('scripts/identity-map.csv', 'utf-8').trim().split('\n').slice(1);
const stmt = lines.map(l => {
  const [uuid, sub] = l.split(',');
  return \`('\${uuid}', '\${sub}')\`;
}).join(',\n');
console.log(\`INSERT INTO _clerk_migration.identity_map (old_uuid, clerk_sub) VALUES\n\${stmt};\`);
" > scripts/load-identity-map.sql
```

Then paste the generated `scripts/load-identity-map.sql` into the Neon SQL Editor and run it.

---

## 7. Next Step: Run Backfill

With the identity map loaded, proceed to:

```bash
# Run the backfill (after neon-clerk-schema.sql has converted columns to text)
# psql \$DATABASE_URL -f scripts/neon-clerk-backfill.sql
```

---

## 8. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Invalid `CLERK_SECRET_KEY` | Regenerate key in Clerk Dashboard |
| `422 email_exists` | User already in Clerk (OAuth) | Script auto-fetches existing user |
| `429 Too Many Requests` | Rate limit | Add `await new Promise(r => setTimeout(r, 100))` between calls |
| `CLERK_SECRET_KEY not set` | Env var missing | `export CLERK_SECRET_KEY=sk_...` |

---

## 9. Security Notes

- `CLERK_SECRET_KEY` is a **backend secret** — never commit it, never expose to frontend.
- The import script runs locally (your machine or CI), not in the deployed app.
- `identity-map.csv` contains PII (email → Clerk ID mapping). Delete it after backfill completes, or store encrypted.