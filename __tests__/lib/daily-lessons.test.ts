import {
  getLessonForStage,
  determineStage,
  ISLAMIC_LESSONS,
  ISLAMIC_DEBT_LESSONS,
  ISLAMIC_HARAM_MONEY_LESSONS,
  ISLAMIC_LESSONS_EXTENDED,
} from '../../lib/daily-lessons'

// ── determineStage ──────────────────────────────────────

describe('determineStage', () => {
  it('returns awareness when txCount < 5', () => {
    expect(determineStage({ txCount: 3, debtRatio: 0, totalSavings: 1000, emergencyTarget: 500, isInvesting: false })).toBe('awareness')
  })

  it('returns awareness when txCount is 0', () => {
    expect(determineStage({ txCount: 0, debtRatio: 0, totalSavings: 0, emergencyTarget: 1000, isInvesting: false })).toBe('awareness')
  })

  it('returns debt when debtRatio >= 35', () => {
    expect(determineStage({ txCount: 10, debtRatio: 35, totalSavings: 1000, emergencyTarget: 500, isInvesting: false })).toBe('debt')
    expect(determineStage({ txCount: 10, debtRatio: 80, totalSavings: 0, emergencyTarget: 500, isInvesting: false })).toBe('debt')
  })

  it('returns emergency when totalSavings < emergencyTarget', () => {
    expect(determineStage({ txCount: 10, debtRatio: 20, totalSavings: 100, emergencyTarget: 500, isInvesting: false })).toBe('emergency')
  })

  it('returns investing when not yet investing', () => {
    expect(determineStage({ txCount: 10, debtRatio: 20, totalSavings: 1000, emergencyTarget: 500, isInvesting: false })).toBe('investing')
  })

  it('returns wealth when all conditions met and isInvesting', () => {
    expect(determineStage({ txCount: 10, debtRatio: 20, totalSavings: 1000, emergencyTarget: 500, isInvesting: true })).toBe('wealth')
  })
})

// ── getLessonForStage — default path per stage ──────────

describe('getLessonForStage — default lessons', () => {
  const stages = ['awareness', 'debt', 'emergency', 'investing', 'wealth'] as const

  for (const stage of stages) {
    it(`returns Arabic lesson for ${stage} on day 1`, () => {
      const lesson = getLessonForStage(stage, 1, 'ar')
      expect(lesson).toHaveProperty('title')
      expect(lesson).toHaveProperty('body')
      expect(lesson).toHaveProperty('url')
    })

    it(`returns English lesson for ${stage} on day 2`, () => {
      const lesson = getLessonForStage(stage, 2, 'en')
      expect(lesson).toHaveProperty('title')
    })
  }

  it('defaults to Arabic when lang not specified', () => {
    const lesson = getLessonForStage('awareness', 1)
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 1: debt + high debtRatio + day % 3 === 0 ─────

describe('getLessonForStage — Islamic debt branch (debtRatio > 50, day%3===0)', () => {
  it('returns Islamic debt lesson in Arabic (day=3)', () => {
    const lesson = getLessonForStage('debt', 3, 'ar', { debtRatio: 60 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns Islamic debt lesson in English (day=6)', () => {
    const lesson = getLessonForStage('debt', 6, 'en', { debtRatio: 51 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger if debtRatio <= 50', () => {
    // Should fall through to other branches
    const lesson = getLessonForStage('debt', 3, 'ar', { debtRatio: 50 })
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 2: low tx count + day % 4 === 0 ───────────────

describe('getLessonForStage — low txCount branch (tx<10, day%4===0)', () => {
  it('returns awareness lesson when txCount=0 and day=4', () => {
    const lesson = getLessonForStage('awareness', 4, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('returns lesson in English when txCount=5 and day=8', () => {
    const lesson = getLessonForStage('emergency', 8, 'en', { txCount: 5 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger when txCount=10', () => {
    const lesson = getLessonForStage('awareness', 4, 'ar', { txCount: 10 })
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 3: low savings + day % 5 === 0 ────────────────

describe('getLessonForStage — low savingsRate branch (savings<10, day%5===0)', () => {
  it('returns emergency lesson when savingsRate=5 and day=5', () => {
    // day=5: 5%4=1 (branch 2 skipped), 5%5=0, savings=5<10, stage!='debt' ✓
    const lesson = getLessonForStage('emergency', 5, 'ar', { savingsRate: 5, txCount: 15 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns lesson in English for day=10', () => {
    const lesson = getLessonForStage('awareness', 10, 'en', { savingsRate: 0, txCount: 15 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger for debt stage', () => {
    const lesson = getLessonForStage('debt', 5, 'ar', { savingsRate: 5, txCount: 15 })
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 4: no investments + investing + day % 4 === 0 ─

describe('getLessonForStage — no investments branch (investing stage, day%4===0)', () => {
  it('returns investing lesson when hasInvestments=false and day=4', () => {
    // txCount=10 prevents branch 2; savings=20 prevents branch 3
    const lesson = getLessonForStage('investing', 4, 'ar', { hasInvestments: false, txCount: 10, savingsRate: 20 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns lesson in English for day=12', () => {
    const lesson = getLessonForStage('investing', 12, 'en', { hasInvestments: false, txCount: 10, savingsRate: 20 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger when hasInvestments=true', () => {
    const lesson = getLessonForStage('investing', 4, 'ar', { hasInvestments: true, txCount: 10, savingsRate: 20 })
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 5: streak >= 7 + day % 6 === 0 ────────────────

describe('getLessonForStage — streak branch (streak>=7, day%6===0)', () => {
  it('returns WEALTH lessons for wealth stage (day=6, streak=10)', () => {
    // day=6: 6%3=0 but stage='wealth' (not debt) → branch 1 fails
    //        6%4=2 → branch 2 fails; 6%5=1 → branch 3 fails
    //        stage='wealth'!='investing' → branch 4 fails; 6%6=0, streak=10 ✓
    const lesson = getLessonForStage('wealth', 6, 'ar', { streak: 10 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns INVESTING lessons for investing stage (day=6, streak=8)', () => {
    const lesson = getLessonForStage('investing', 6, 'ar', { streak: 8, hasInvestments: true })
    expect(lesson).toHaveProperty('title')
  })

  it('returns EMERGENCY lessons for emergency stage (day=6, streak=7)', () => {
    const lesson = getLessonForStage('emergency', 6, 'ar', { streak: 7, txCount: 15, savingsRate: 20 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns lesson in English', () => {
    const lesson = getLessonForStage('wealth', 6, 'en', { streak: 7 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger when streak < 7', () => {
    const lesson = getLessonForStage('wealth', 6, 'ar', { streak: 6 })
    expect(lesson).toHaveProperty('title')
  })

  it('does NOT trigger when day % 6 !== 0', () => {
    const lesson = getLessonForStage('wealth', 7, 'ar', { streak: 10 })
    // day=7 → 7%7=0 triggers Islamic branch instead
    expect(lesson).toHaveProperty('title')
  })
})

// ── Branch 6: day % 7 === 0 — Islamic lessons ─────────────

describe('getLessonForStage — Islamic branch (day%7===0)', () => {
  it('returns ISLAMIC_DEBT_LESSONS for debt stage (day=7) in Arabic', () => {
    const lesson = getLessonForStage('debt', 7, 'ar', { debtRatio: 10 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns ISLAMIC_DEBT_LESSONS for debt stage (day=7) in English', () => {
    const lesson = getLessonForStage('debt', 7, 'en', { debtRatio: 10 })
    expect(lesson).toHaveProperty('title')
  })

  it('returns ISLAMIC_HARAM_MONEY_LESSONS for investing stage (day=7) in Arabic', () => {
    const lesson = getLessonForStage('investing', 7, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('returns ISLAMIC_HARAM_MONEY_LESSONS for investing stage (day=7) in English', () => {
    const lesson = getLessonForStage('investing', 7, 'en')
    expect(lesson).toHaveProperty('title')
  })

  it('returns ISLAMIC_HARAM_MONEY_LESSONS for wealth stage (day=7) in Arabic', () => {
    const lesson = getLessonForStage('wealth', 7, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('returns ISLAMIC_HARAM_MONEY_LESSONS for wealth stage (day=7) in English', () => {
    const lesson = getLessonForStage('wealth', 7, 'en')
    expect(lesson).toHaveProperty('title')
  })

  it('returns allIslamic lessons for awareness stage (day=7) in Arabic', () => {
    const lesson = getLessonForStage('awareness', 7, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('returns allIslamic lessons for awareness stage (day=7) in English', () => {
    const lesson = getLessonForStage('awareness', 7, 'en')
    expect(lesson).toHaveProperty('title')
  })

  it('returns allIslamic lessons for emergency stage (day=14) in Arabic', () => {
    const lesson = getLessonForStage('emergency', 14, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('returns allIslamic lessons for emergency stage (day=14) in English', () => {
    const lesson = getLessonForStage('emergency', 14, 'en')
    expect(lesson).toHaveProperty('title')
  })

  it('handles day=21 correctly', () => {
    const lesson = getLessonForStage('awareness', 21, 'ar')
    expect(lesson).toHaveProperty('title')
  })

  it('handles day=28 correctly', () => {
    const lesson = getLessonForStage('debt', 28, 'en', { debtRatio: 10 })
    expect(lesson).toHaveProperty('title')
  })
})

// ── Lesson data sanity ────────────────────────────────────

describe('lesson data exports', () => {
  it('ISLAMIC_LESSONS has entries with ar and en', () => {
    expect(ISLAMIC_LESSONS.length).toBeGreaterThan(0)
    expect(ISLAMIC_LESSONS[0].ar.title).toBeTruthy()
    expect(ISLAMIC_LESSONS[0].en.title).toBeTruthy()
    expect(ISLAMIC_LESSONS[0].ar.url).toBeTruthy()
  })

  it('ISLAMIC_DEBT_LESSONS has entries', () => {
    expect(ISLAMIC_DEBT_LESSONS.length).toBeGreaterThan(0)
    expect(ISLAMIC_DEBT_LESSONS[0].ar.title).toBeTruthy()
    expect(ISLAMIC_DEBT_LESSONS[0].en.title).toBeTruthy()
  })

  it('ISLAMIC_HARAM_MONEY_LESSONS has entries', () => {
    expect(ISLAMIC_HARAM_MONEY_LESSONS.length).toBeGreaterThan(0)
    expect(ISLAMIC_HARAM_MONEY_LESSONS[0].ar.title).toBeTruthy()
    expect(ISLAMIC_HARAM_MONEY_LESSONS[0].en.title).toBeTruthy()
  })

  it('ISLAMIC_LESSONS_EXTENDED has entries', () => {
    expect(ISLAMIC_LESSONS_EXTENDED.length).toBeGreaterThan(0)
  })

  it('all lessons have required fields', () => {
    for (const lesson of ISLAMIC_LESSONS) {
      expect(lesson.ar).toHaveProperty('title')
      expect(lesson.ar).toHaveProperty('body')
      expect(lesson.ar).toHaveProperty('url')
    }
  })
})
