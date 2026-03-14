/**
 * بنك الدروس اليومية الذكية
 * مبنية على أبحاث علم السلوك المالي
 * ثنائية اللغة — عربي وإنجليزي
 */

export interface DailyLesson {
  title: string
  body: string
  url: string
}

export type FinancialStage =
  | 'awareness'
  | 'debt'
  | 'emergency'
  | 'investing'
  | 'wealth'

type BilingualLesson = { ar: DailyLesson; en: DailyLesson }

// ── مرحلة الوعي المالي ──────────────────────────────
const AWARENESS: BilingualLesson[] = [
  {
    ar: {
      title: '🌱 رحلة الثروة تبدأ بتسجيل أول معاملة',
      body: 'تشير أبحاث السلوك المالي إلى أن تتبع المصاريف يقلل الإنفاق غير الواعي بنسبة تصل لـ 20%. سجّل مصاريف اليوم الآن.',
      url: '/dashboard/transactions',
    },
    en: {
      title: '🌱 Your wealth journey starts with one transaction',
      body: 'Financial behavior research shows that expense tracking reduces unconscious spending by up to 20%. Log today\'s expenses now.',
      url: '/dashboard/transactions',
    },
  },
  {
    ar: {
      title: '💡 ما لا يُقاس لا يُحسَّن',
      body: 'الوعي المالي هو أول خطوات الثروة — قبل أن تبني، تعرّف على وضعك الحقيقي. أضف دخلك ومصاريفك هذا الشهر.',
      url: '/dashboard/transactions',
    },
    en: {
      title: '💡 What gets measured gets managed',
      body: 'Financial awareness is the first step to wealth. Before you build, understand your real situation. Add this month\'s income and expenses.',
      url: '/dashboard/transactions',
    },
  },
  {
    ar: {
      title: '🎯 هدف مكتوب يرفع احتمال التحقق 42%',
      body: 'دراسات جامعة دومينيكان تُثبت أن كتابة الأهداف المالية ترفع احتمال تحقيقها. ما هدفك المالي لهذا العام؟',
      url: '/dashboard/goals',
    },
    en: {
      title: '🎯 Written goals are 42% more likely to be achieved',
      body: 'Dominican University studies prove that writing financial goals significantly increases achievement. What\'s your financial goal this year?',
      url: '/dashboard/goals',
    },
  },
  {
    ar: {
      title: '🧠 الادخار التلقائي أقوى من الإرادة',
      body: 'يُثبت اقتصاديو السلوك — بمن فيهم ريتشارد ثالر (نوبل 2017) — أن الادخار التلقائي أفعل بكثير من الادخار الإرادي.',
      url: '/dashboard/settings',
    },
    en: {
      title: '🧠 Automatic saving beats willpower every time',
      body: 'Behavioral economists — including Nobel laureate Richard Thaler — prove that automatic saving is far more effective than manual saving.',
      url: '/dashboard/settings',
    },
  },
  {
    ar: {
      title: '📊 راتبك قصة — كيف تكتبها؟',
      body: 'الفرق بين من يبني ثروة ومن لا يبنيها ليس في المبلغ — بل في الوعي بأين يذهب كل دينار. ابدأ وعيك اليوم.',
      url: '/dashboard',
    },
    en: {
      title: '📊 Your salary tells a story — how do you write it?',
      body: 'The difference between wealth builders and others isn\'t the amount — it\'s awareness of where every dollar goes. Start your awareness today.',
      url: '/dashboard',
    },
  },
]

// ── مرحلة سداد الديون ───────────────────────────────
const DEBT: BilingualLesson[] = [
  {
    ar: {
      title: '⚔️ كل دين تسدده يحرر جزءاً من مستقبلك',
      body: 'تُظهر أبحاث علم النفس المالي أن سداد أصغر دين أولاً يبني الزخم النفسي اللازم لسداد الباقي — ما يُعرف بـ "تأثير كرة الثلج".',
      url: '/dashboard/debts',
    },
    en: {
      title: '⚔️ Every debt you pay frees part of your future',
      body: 'Financial psychology research shows that paying the smallest debt first builds the psychological momentum needed for the rest — known as the "snowball effect".',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '🔑 الأقساط المسددة = استثمارات مستقبلية',
      body: 'كل قسط تسدده اليوم سيتحول لاستثمار عندما تتحرر من الدين. أنت لا تسدد ديوناً — أنت تشتري حريتك المالية.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🔑 Paid installments = future investments',
      body: 'Every payment you make today will become an investment when you\'re debt-free. You\'re not paying off debt — you\'re buying your financial freedom.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '💪 نسبة الدين من الدخل — المقياس الحقيقي',
      body: 'تنصح المعايير المالية المعتمدة بألا تتجاوز نسبة الأقساط 35% من الدخل. كلما خفضت هذه النسبة، زادت مرونتك المالية.',
      url: '/dashboard/debts',
    },
    en: {
      title: '💪 Debt-to-income ratio — the real measure',
      body: 'Established financial standards recommend keeping debt payments below 35% of income. The lower this ratio, the greater your financial flexibility.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '🧮 دفعة إضافية صغيرة = أشهر أقل',
      body: 'إضافة 10% فقط على قسطك الشهري يمكن أن تختصر سنوات من الدين. حساب بسيط يغير معادلة حريتك.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🧮 A small extra payment = fewer months',
      body: 'Adding just 10% to your monthly payment can cut years off your debt. A simple calculation that changes your freedom equation.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '🚀 التحرر من الدين ليس حلماً — له جدول زمني',
      body: 'مع كل دفعة منتظمة، تاريخ تحررك يقترب. تتبع تقدمك في التطبيق يُثبت علمياً أنه يعزز الالتزام بالخطة.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🚀 Debt freedom isn\'t a dream — it has a timeline',
      body: 'With every regular payment, your freedom date gets closer. Research proves that tracking your progress significantly improves plan adherence.',
      url: '/dashboard/debts',
    },
  },
]

// ── مرحلة صندوق الطوارئ ─────────────────────────────
const EMERGENCY: BilingualLesson[] = [
  {
    ar: {
      title: '🛡️ صندوق الطوارئ = قرارات أهدأ في الأزمات',
      body: 'تُثبت أبحاث الاحتياطي الفيدرالي أن من لديهم صندوق طوارئ يتخذون قرارات مالية أفضل في الأزمات لأنهم لا يتصرفون من خوف.',
      url: '/dashboard/goals',
    },
    en: {
      title: '🛡️ Emergency fund = calmer decisions in crises',
      body: 'Federal Reserve research proves that people with emergency funds make better financial decisions during crises because they don\'t act out of fear.',
      url: '/dashboard/goals',
    },
  },
  {
    ar: {
      title: '🏗️ الأساس قبل البناء',
      body: 'المعايير المالية المعتمدة توصي بتأسيس 3 أشهر من المصاريف قبل الاستثمار. هذا ليس تحفظاً — هذا هو الترتيب الصحيح لبناء الثروة.',
      url: '/dashboard/goals',
    },
    en: {
      title: '🏗️ Foundation before construction',
      body: 'Established financial standards recommend building 3 months of expenses before investing. This isn\'t conservative — it\'s the correct order for wealth building.',
      url: '/dashboard/goals',
    },
  },
  {
    ar: {
      title: '💰 الانتظام أقوى من المبلغ',
      body: 'دراسات الادخار السلوكي تُظهر أن الانتظام في مبلغ صغير أفعل بكثير من ادخار مبالغ كبيرة بشكل غير منتظم. ابدأ بما تستطيع اليوم.',
      url: '/dashboard/goals',
    },
    en: {
      title: '💰 Consistency beats amount',
      body: 'Behavioral savings studies show that consistent small amounts are far more effective than irregular large savings. Start with what you can today.',
      url: '/dashboard/goals',
    },
  },
  {
    ar: {
      title: '🎯 هدف واضح = تقدم حقيقي',
      body: 'صندوق طوارئك المثالي = مصاريفك الشهرية × 3. عندما يكون الهدف محدداً برقم واضح، يزداد الالتزام به وفق أبحاث تحديد الأهداف.',
      url: '/dashboard/goals',
    },
    en: {
      title: '🎯 Clear goal = real progress',
      body: 'Your ideal emergency fund = monthly expenses × 3. When a goal has a specific number, commitment increases according to goal-setting research.',
      url: '/dashboard/goals',
    },
  },
]

// ── مرحلة الاستثمار ─────────────────────────────────
const INVESTING: BilingualLesson[] = [
  {
    ar: {
      title: '📈 الفائدة المركّبة — الرياضيات التي تبني الثروة',
      body: 'هذه ليست نصيحة — هذه رياضيات: 100 JOD شهرياً بعائد 7% = أكثر من 120,000 JOD بعد 30 سنة. الوقت هو المتغير الأهم.',
      url: '/dashboard/investments',
    },
    en: {
      title: '📈 Compound interest — the math that builds wealth',
      body: 'This isn\'t advice — it\'s mathematics: 100 JOD monthly at 7% return = over 120,000 JOD after 30 years. Time is the most important variable.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '⏰ البدء المبكر يتفوق على المبلغ الكبير',
      body: 'الدراسات الرياضية تُثبت: من يبدأ بـ 50 JOD شهرياً في عمر 25 يتفوق على من يبدأ بـ 200 JOD في عمر 35. ابدأ اليوم.',
      url: '/dashboard/investments',
    },
    en: {
      title: '⏰ Starting early beats investing more',
      body: 'Mathematical studies prove: someone who starts with 50 JOD/month at age 25 outperforms someone who starts with 200 JOD/month at age 35. Start today.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '🌍 التنويع — الوقاية من مخاطر السوق',
      body: 'نظرية المحفظة الحديثة (ماركويتز، نوبل 1990) تُثبت أن التنويع يقلل المخاطر دون التضحية بالعائد. صناديق المؤشرات تُطبق هذا تلقائياً.',
      url: '/dashboard/investments',
    },
    en: {
      title: '🌍 Diversification — protection from market risk',
      body: 'Modern Portfolio Theory (Markowitz, Nobel 1990) proves diversification reduces risk without sacrificing returns. Index funds apply this automatically.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '📊 الانتظام يتفوق على توقيت السوق',
      body: 'أبحاث Vanguard تُظهر أن المستثمرين المنتظمين يتفوقون على من يحاولون توقيت السوق في 90% من الحالات على المدى البعيد.',
      url: '/dashboard/investments',
    },
    en: {
      title: '📊 Consistency beats market timing',
      body: 'Vanguard research shows that consistent investors outperform market-timers in 90% of cases over the long term.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '💎 مصدر دخل ثانٍ يحمي من الصدمات',
      body: 'تشير الدراسات الاقتصادية إلى أن تنويع مصادر الدخل يقلل التأثر بالصدمات الاقتصادية. استثماراتك هي مصدرك الثاني.',
      url: '/dashboard/investments',
    },
    en: {
      title: '💎 A second income source protects from shocks',
      body: 'Economic studies indicate that diversifying income sources reduces vulnerability to economic shocks. Your investments are your second source.',
      url: '/dashboard/investments',
    },
  },
]

// ── مرحلة تعظيم الثروة ──────────────────────────────
const WEALTH: BilingualLesson[] = [
  {
    ar: {
      title: '👑 أنت في مرحلة يصلها أقل من 10% من الناس',
      body: 'الاستمرارية هي السر الأكبر. أبحاث الثروة طويلة المدى تُثبت أن زيادة نسبة الاستثمار 1% سنوياً تُحدث فرقاً هائلاً بعد 20 عاماً.',
      url: '/dashboard/investments',
    },
    en: {
      title: '👑 You\'ve reached a stage fewer than 10% achieve',
      body: 'Consistency is the biggest secret. Long-term wealth research proves that increasing your investment rate by 1% annually makes a massive difference after 20 years.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '🚀 الثروة الحقيقية = الأصول التي تعمل نيابةً عنك',
      body: 'نظرية رأس المال تُعرّف الثروة الحقيقية بأنها الأصول المنتجة. كل استثمار تضيفه يعمل 24 ساعة يومياً بدون أن تطلب منه.',
      url: '/dashboard/investments',
    },
    en: {
      title: '🚀 Real wealth = assets working for you',
      body: 'Capital theory defines real wealth as productive assets. Every investment you add works 24 hours a day without you asking it to.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '📚 الاستثمار في المعرفة — العائد الأعلى',
      body: 'دراسات رأس المال البشري تُثبت أن الاستثمار في المهارات والمعرفة يُعطي من أعلى العوائد على المدى البعيد. ما الكتاب المالي الذي ستقرؤه هذا الشهر؟',
      url: '/dashboard',
    },
    en: {
      title: '📚 Investing in knowledge — the highest return',
      body: 'Human capital studies prove that investing in skills and knowledge yields among the highest long-term returns. What financial book will you read this month?',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🌱 الثبات في السوق يتفوق على التحرك المتكرر',
      body: 'أبحاث سلوك المستثمرين تُظهر أن المستثمرين الذين يتدخلون أقل في محافظهم يحققون عوائد أفضل على المدى البعيد.',
      url: '/dashboard/investments',
    },
    en: {
      title: '🌱 Staying invested beats frequent trading',
      body: 'Investor behavior research shows that those who intervene less in their portfolios achieve better long-term returns.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '🎯 الحرية المالية رقم — احسبها الآن',
      body: 'الحرية المالية = مصاريفك السنوية × 25 (قاعدة الـ 4%). هذا الرقم هو هدفك النهائي. كم تبقى لك؟',
      url: '/dashboard',
    },
    en: {
      title: '🎯 Financial freedom is a number — calculate it now',
      body: 'Financial freedom = annual expenses × 25 (the 4% rule). This number is your ultimate goal. How much remains?',
      url: '/dashboard',
    },
  },
]

/**
 * يختار الدرس حسب المرحلة واللغة ورقم اليوم
 */
export function getLessonForStage(
  stage: FinancialStage,
  dayOfMonth: number,
  lang: 'ar' | 'en' = 'ar'
): DailyLesson {
  const map: Record<FinancialStage, BilingualLesson[]> = {
    awareness: AWARENESS,
    debt:      DEBT,
    emergency: EMERGENCY,
    investing: INVESTING,
    wealth:    WEALTH,
  }
  const lessons = map[stage]
  const lesson = lessons[(dayOfMonth - 1) % lessons.length]
  return lesson[lang]
}

/**
 * تحديد المرحلة المالية للمستخدم
 */
export function determineStage(params: {
  txCount: number
  debtRatio: number
  totalSavings: number
  emergencyTarget: number
  isInvesting: boolean
}): FinancialStage {
  const { txCount, debtRatio, totalSavings, emergencyTarget, isInvesting } = params
  if (txCount < 5) return 'awareness'
  if (debtRatio >= 35) return 'debt'
  if (totalSavings < emergencyTarget) return 'emergency'
  if (!isInvesting) return 'investing'
  return 'wealth'
}
