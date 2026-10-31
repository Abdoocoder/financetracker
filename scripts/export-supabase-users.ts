#!/usr/bin/env node
/**
 * export-supabase-users.ts
 *
 * Exports Supabase auth.users (id + email) from the Neon standby database
 * to scripts/users-to-migrate.csv for Clerk import.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/export-supabase-users.ts
 *
 * Prerequisites:
 *   - DATABASE_URL must be set to the Neon *pooled* connection string
 *   - Run from repo root (uses lib/db/neon.ts connection helper)
 *
 * Output: scripts/users-to-migrate.csv with columns: id,email
 */

import { getSql } from '../lib/db/neon'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')
const OUTPUT_PATH = resolve(REPO_ROOT, 'scripts', 'users-to-migrate.csv')

async function main() {
  console.log('🔌 Connecting to Neon...')
  const sql = getSql()

  console.log('📥 Querying auth.users...')
  const rows = await sql`
    select id, email
    from auth.users
    order by id
  `

  if (rows.length === 0) {
    console.log('⚠️  No users found in auth.users. Is this the right database?')
    process.exit(1)
  }

  // Filter out null emails (shouldn't happen, but defensive)
  const validRows = rows.filter((r) => r.email != null && r.email !== '')

  if (validRows.length !== rows.length) {
    console.log(`⚠️  Skipped ${rows.length - validRows.length} row(s) with null/empty email`)
  }

  // CSV header + rows
  const csv = ['id,email', ...validRows.map((r) => `${r.id},${r.email}`)].join('\n')

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, csv, 'utf-8')

  console.log(`✅ Exported ${validRows.length} users to ${OUTPUT_PATH}`)
  console.log(`   First 3: ${validRows.slice(0, 3).map((r) => r.id).join(', ')}`)
}

main().catch((err) => {
  console.error('❌ Export failed:', err)
  process.exit(1)
})