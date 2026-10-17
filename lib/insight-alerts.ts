/**
 * Task 2.3 — classify insight alert metrics and group by compatibility.
 *
 * Separate "% of income" (ratio) headlines from "x/×/أضعاف income" (multiple)
 * headlines so contradictory metrics are never bundled into a single push.
 */

export type InsightMetric = 'income-ratio' | 'income-multiple' | 'other'

export function classifyInsightMetric(title: string): InsightMetric {
  if (!title) return 'other'
  const t = title

  // Multiple-of-income is checked first so "6x 50% income" style strings
  // resolve to the stronger (multiple) signal.
  if (/\d+\s*(x|×|أضعاف)/i.test(t)) {
    return 'income-multiple'
  }

  // Ratio / percentage of income.
  if (/\d+\s*%/.test(t)) {
    return 'income-ratio'
  }

  return 'other'
}

function conflicts(a: InsightMetric, b: InsightMetric): boolean {
  return (
    (a === 'income-ratio' && b === 'income-multiple') ||
    (a === 'income-multiple' && b === 'income-ratio')
  )
}

export function groupAlertsByCompatibility<T extends { title?: unknown }>(
  alerts: T[]
): T[][] {
  if (!alerts || alerts.length === 0) return []

  const groups: T[][] = []
  let currentGroup: T[] = []
  let currentMetrics = new Set<InsightMetric>()

  for (const alert of alerts) {
    const metric = classifyInsightMetric(String(alert?.title ?? ''))
    const groupHasConflict = [...currentMetrics].some((m) => conflicts(m, metric))

    if (currentGroup.length > 0 && groupHasConflict) {
      groups.push(currentGroup)
      currentGroup = []
      currentMetrics = new Set<InsightMetric>()
    }

    currentGroup.push(alert)
    currentMetrics.add(metric)
  }

  if (currentGroup.length > 0) groups.push(currentGroup)
  return groups
}
