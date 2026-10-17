/**
 * @jest-environment node
 *
 * Task 2.3 — "% of income" and "multiple of income" headlines must never be
 * bundled in the same push (e.g. "90% من دخلك" + "6 أضعاف دخلك").
 */
import {
  classifyInsightMetric,
  groupAlertsByCompatibility,
} from '@/lib/insight-alerts'

describe('classifyInsightMetric', () => {
  it('detects ratio-of-income headlines (en + ar)', () => {
    expect(classifyInsightMetric('🚨 You exceeded 90% of income!')).toBe('income-ratio')
    expect(classifyInsightMetric('🏆 ادخرت أكثر من 50% من دخلك!')).toBe('income-ratio')
  })

  it('detects multiple-of-income headlines (en + ar)', () => {
    expect(classifyInsightMetric('💳 Debts exceed 6x your income')).toBe('income-multiple')
    expect(classifyInsightMetric('💳 ديونك تجاوزت 6 أضعاف دخلك')).toBe('income-multiple')
  })

  it('classifies unrelated headlines as other', () => {
    expect(classifyInsightMetric('💪 خطوة صغيرة تصنع فارقاً كبيراً')).toBe('other')
    expect(classifyInsightMetric('📅 تذكير: أقساط الشهر القادم')).toBe('other')
  })
})

describe('groupAlertsByCompatibility', () => {
  it('never groups a ratio headline with a multiple headline', () => {
    const groups = groupAlertsByCompatibility([
      { title: '🚨 تجاوزت 90% من دخلك!' },
      { title: '💳 ديونك تجاوزت 6 أضعاف دخلك' },
    ])
    expect(groups).toHaveLength(2)
    for (const group of groups) {
      const metrics = group.map(a => classifyInsightMetric(a.title))
      expect(metrics.includes('income-ratio') && metrics.includes('income-multiple')).toBe(false)
    }
  })

  it('keeps unrelated alerts bundled together', () => {
    const groups = groupAlertsByCompatibility([
      { title: '🚨 تجاوزت 90% من دخلك!' },
      { title: '💪 خطوة صغيرة تصنع فارقاً كبيراً' },
      { title: '📊 راجع ميزانيتك الأسبوع القادم' },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(3)
  })

  it('keeps the multiple headline with the following unrelated alerts', () => {
    const groups = groupAlertsByCompatibility([
      { title: '🚨 تجاوزت 90% من دخلك!' },
      { title: '💳 ديونك تجاوزت 6 أضعاف دخلك' },
      { title: '💪 خطوة صغيرة تصنع فارقاً كبيراً' },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].map(a => a.title)).toEqual(['🚨 تجاوزت 90% من دخلك!'])
    expect(groups[1].map(a => a.title)).toEqual([
      '💳 ديونك تجاوزت 6 أضعاف دخلك',
      '💪 خطوة صغيرة تصنع فارقاً كبيراً',
    ])
  })

  it('returns a single group when there is no conflict', () => {
    const groups = groupAlertsByCompatibility([
      { title: '💳 ديونك تجاوزت 6 أضعاف دخلك' },
      { title: '💪 خطوة صغيرة تصنع فارقاً كبيراً' },
    ])
    expect(groups).toHaveLength(1)
  })

  it('handles an empty list', () => {
    expect(groupAlertsByCompatibility([])).toEqual([])
  })
})
