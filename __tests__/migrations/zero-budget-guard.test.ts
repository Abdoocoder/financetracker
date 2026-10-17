/**
 * @jest-environment node
 *
 * Task 2.1 — Zero-budget tripwire.
 *
 * Root cause of the "budget exceeded" alert at 3:20 AM with an unset budget:
 * the legacy `check_budget_limits` trigger (supabase/migrations/legacy/023)
 * evaluates `v_total_spent >= v_budget.monthly_limit`, which is TRUE whenever
 * `monthly_limit = 0`.
 *
 * This test is a static tripwire over the root migrations folder. It asserts a
 * root migration redefines the function WITH a zero/NULL guard placed before the
 * threshold comparison. It never touches a live database.
 */
import fs from 'fs'
import path from 'path'

const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations')

function rootMigrationSql(): string[] {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8'))
}

/** Only migrations that actually (re)define the trigger function. */
function definitions(): string {
  return rootMigrationSql()
    .filter((sql) => /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.check_budget_limits\s*\(/.test(sql))
    .join('\n')
}

const GUARD = /monthly_limit\s+IS\s+NULL\s+OR\s+(?:v_budget\.)?monthly_limit\s*<=\s*0/i
const THRESHOLD = /v_total_spent\s*>=\s*v_budget\.monthly_limit/i

describe('zero-budget guard migration (check_budget_limits)', () => {
  it('ships a root migration that redefines public.check_budget_limits', () => {
    expect(definitions()).not.toBe('')
  })

  it('returns early when the budget limit is NULL or <= 0', () => {
    expect(definitions()).toMatch(GUARD)
  })

  it('places the zero guard BEFORE the 100% threshold comparison', () => {
    const sql = definitions()
    const guardIndex = sql.search(GUARD)
    const thresholdIndex = sql.search(THRESHOLD)
    expect(guardIndex).toBeGreaterThan(-1)
    expect(thresholdIndex).toBeGreaterThan(-1)
    expect(guardIndex).toBeLessThan(thresholdIndex)
  })

  it('keeps the .tr() relevant behaviour: no regression of the expense-only early return', () => {
    expect(definitions()).toMatch(/NEW\.type\s*!=\s*'expense'/)
  })
})
