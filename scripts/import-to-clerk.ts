#!/usr/bin/env node
/**
 * import-to-clerk.ts
 *
 * Reads scripts/users-to-migrate.csv, creates users in Clerk via Backend API,
 * and writes scripts/identity-map.csv (old_uuid, clerk_sub).
 *
 * Usage:
 *   CLERK_SECRET_KEY=sk_test_... npx tsx scripts/import-to-clerk.ts
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY (Backend API key from Clerk Dashboard → Developers → API Keys)
 *   - scripts/users-to-migrate.csv exists (run export-supabase-users.ts first)
 *
 * Notes:
 *   - Uses empty password_digest + skip_password_requirement: true
 *     Users will set password on first Clerk sign-in (Clerk handles this).
 *   - Maps Supabase UUID -> Clerk external_id for trivial identity mapping.
 *   - Handles existing users (OAuth signups) by fetching by email.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
      password_digest: '',
      skip_password_requirement: true,
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

main().catch((err) => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})