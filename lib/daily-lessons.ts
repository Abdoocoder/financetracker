/**
 * بنك الدروس اليومية الذكية — مقسّمة حسب المرحلة المالية
 * كل مستخدم يستلم الدرس المناسب لوضعه الحقيقي
 */

export interface DailyLesson {
  title: string    // عنوان الإشعار
  body: string     // نص الإشعار
  url: string      // الصفحة التي يفتحها
}

export type FinancialStage =
  | 'awareness'    // مبتدئ — أقل من 5 معاملات
  | 'debt'         // مرحلة الديون — نسبة دين > 35%
  | 'emergency'    // بناء صندوق الطوارئ
  | 'investing'    // مرحلة الاستثمار
  | 'wealth'       // تعظيم الثروة

// ── دروس مرحلة الوعي المالي ─────────────────────────
const AWARENESS_LESSONS: DailyLesson[] = [
  {
    title: '🌱 رحلة الثروة تبدأ بخطوة واحدة',
    body: 'الأثرياء لم يولدوا أثرياء — بدأوا بتسجيل أول معاملة. سجّل مصاريف اليوم الآن.',
    url: '/dashboard/transactions',
  },
  {
    title: '💡 ما لا يُقاس لا يُحسَّن',
    body: 'المستخدمون الذين يسجلون مصاريفهم يوفرون 20% أكثر. ابدأ عادتك اليوم.',
    url: '/dashboard/transactions',
  },
  {
    title: '🧠 الوعي المالي هو أول درجات الثروة',
    body: 'قبل أن تبني ثروة، تعرّف على وضعك الحقيقي. أضف دخلك ومصاريفك الشهر الماضي.',
    url: '/dashboard/transactions',
  },
  {
    title: '📊 راتبك قصة — كيف تكتبها؟',
    body: '"لا تدخر ما تبقى بعد الإنفاق، بل أنفق ما تبقى بعد الادخار" — وارن بافيت',
    url: '/dashboard',
  },
  {
    title: '🎯 هدف واحد يغير كل شيء',
    body: 'الأثرياء لديهم أهداف مالية مكتوبة. ما هدفك المالي لهذا العام؟ أضفه الآن.',
    url: '/dashboard/goals',
  },
]

// ── دروس مرحلة سداد الديون ─────────────────────────
const DEBT_LESSONS: DailyLesson[] = [
  {
    title: '⚔️ الديون تسرق حريتك المستقبلية',
    body: 'كل دين تسدده يحرر جزءاً من حياتك. ركّز على أصغر دين أولاً — الانتصار السريع يبني الزخم.',
    url: '/dashboard/debts',
  },
  {
    title: '🔑 سرّ طريقة كرة الثلج',
    body: 'سدّد أصغر دين أولاً، ثم وجّه قسطه لأكبر دين. هذا ما يجعل الأثرياء يتحررون من الديون بسرعة.',
    url: '/dashboard/debts',
  },
  {
    title: '💪 كل دفعة إضافية تختصر أشهراً',
    body: '"المقترض عبد للمُقرض" — كل دينار إضافي على الدين اليوم يشتري حريتك غداً.',
    url: '/dashboard/debts',
  },
  {
    title: '🧮 احسب ثمن حريتك',
    body: 'مجموع أقساطك الشهرية = المبلغ الذي سيتحرر لك عند سداد كل ديونك. كم هو؟',
    url: '/dashboard/debts',
  },
  {
    title: '🚀 الأقساط المسددة = استثمارات مستقبلية',
    body: 'تخيّل: كل قسط تسدده اليوم سيتحول لاستثمار عندما تتحرر. أنت تبني مستقبلك الآن.',
    url: '/dashboard/debts',
  },
  {
    title: '📉 نسبة دينك من دخلك — المفتاح الخفي',
    body: 'الأثرياء يحافظون على نسبة ديون أقل من 15% من دخلهم. أنت في الطريق الصحيح.',
    url: '/dashboard/debts',
  },
]

// ── دروس مرحلة صندوق الطوارئ ────────────────────────
const EMERGENCY_LESSONS: DailyLesson[] = [
  {
    title: '🛡️ صندوق الطوارئ = نوم هادئ',
    body: '78% من الناس يعيشون راتباً لراتب. صندوق الطوارئ يجعلك من الـ 22% الآمنين.',
    url: '/dashboard/goals',
  },
  {
    title: '🏗️ الأساس قبل البناء',
    body: 'لا تبدأ الاستثمار قبل أن يكون عندك 3 أشهر من المصاريف محفوظة. هذا هو ترتيب الأثرياء.',
    url: '/dashboard/goals',
  },
  {
    title: '⚡ الطوارئ لا تستأذن',
    body: '"الإعداد للأسوأ يجعلك تعيش الأفضل" — ادخر اليوم حتى لو مبلغ صغير.',
    url: '/dashboard/goals',
  },
  {
    title: '💰 10 JOD يومياً = 300 JOD شهرياً',
    body: 'الأمن المالي لا يحتاج مبالغ كبيرة — يحتاج انتظاماً. ابدأ بما تستطيع الآن.',
    url: '/dashboard/goals',
  },
  {
    title: '🎯 هدف واضح = تقدم حقيقي',
    body: 'صندوق طوارئك يجب أن يساوي مصاريفك × 3. ما المبلغ المتبقي للوصول؟',
    url: '/dashboard/goals',
  },
]

// ── دروس مرحلة الاستثمار ────────────────────────────
const INVESTING_LESSONS: DailyLesson[] = [
  {
    title: '📈 فلوسك تنتظر أن تعمل',
    body: '"الفائدة المركّبة هي العجب الثامن في الدنيا" — أينشتاين. كل شهر تؤخر فيه تكلفك آلاف.',
    url: '/dashboard/investments',
  },
  {
    title: '⏰ الوقت أهم من المبلغ',
    body: '100 JOD شهرياً بعائد 7% = 121,997 JOD بعد 30 سنة. ابدأ اليوم لا غداً.',
    url: '/dashboard/investments',
  },
  {
    title: '🌍 SPUS — الاستثمار الحلال المتنوع',
    body: 'تملك بسهم واحد أسهماً في أكبر 500 شركة حلال في العالم. هذا ما يفعله الأذكياء.',
    url: '/dashboard/investments',
  },
  {
    title: '📊 لا تراقب الأسعار يومياً',
    body: '"السوق ينقل الثروة من غير الصبورين إلى الصبورين" — وارن بافيت. استثمر وانسَ.',
    url: '/dashboard/investments',
  },
  {
    title: '🔄 الانتظام أقوى من التوقيت',
    body: 'لا أحد يستطيع توقيت السوق. لكن الجميع يستطيع الاستثمار المنتظم كل شهر.',
    url: '/dashboard/investments',
  },
  {
    title: '💎 نوّع مصادر دخلك',
    body: 'الأثرياء لديهم 7 مصادر دخل في المتوسط. استثماراتك هي مصدرك الثاني.',
    url: '/dashboard/investments',
  },
]

// ── دروس مرحلة تعظيم الثروة ─────────────────────────
const WEALTH_LESSONS: DailyLesson[] = [
  {
    title: '👑 أنت في مرحلة بناء الثروة الحقيقية',
    body: 'أقل من 10% من الناس يصلون لهذه المرحلة. استمر وزد نسبة استثمارك 1% كل سنة.',
    url: '/dashboard/investments',
  },
  {
    title: '🚀 زيادة 5% في الاستثمار تُغير المعادلة',
    body: 'زيادة استثمارك بـ 5% من دخلك الآن = مئات الآلاف فرقاً بعد 20 سنة.',
    url: '/dashboard/investments',
  },
  {
    title: '🏠 الأصول الحقيقية تنمو وأنت نائم',
    body: '"لا تعمل من أجل المال، اجعل المال يعمل من أجلك" — روبرت كيوساكي',
    url: '/dashboard/investments',
  },
  {
    title: '📚 الاستثمار في نفسك أعلى عائد',
    body: '88% من الأثرياء يقرؤون 30 دقيقة يومياً. ما الكتاب المالي الذي ستقرؤه هذا الشهر؟',
    url: '/dashboard',
  },
  {
    title: '🌱 الثروة تُبنى في الهدوء لا في الإثارة',
    body: 'تجنب قرارات الاستثمار العاطفية. الثبات والانتظام هما سر الأثرياء الحقيقيين.',
    url: '/dashboard/investments',
  },
  {
    title: '🎯 الحرية المالية قريبة — استمر',
    body: 'الحرية المالية = دخل سلبي يغطي مصاريفك. أنت تبني هذا كل يوم.',
    url: '/dashboard',
  },
]

/**
 * يختار الدرس المناسب حسب المرحلة المالية ورقم اليوم
 */
export function getLessonForStage(stage: FinancialStage, dayOfMonth: number): DailyLesson {
  const map: Record<FinancialStage, DailyLesson[]> = {
    awareness:  AWARENESS_LESSONS,
    debt:       DEBT_LESSONS,
    emergency:  EMERGENCY_LESSONS,
    investing:  INVESTING_LESSONS,
    wealth:     WEALTH_LESSONS,
  }
  const lessons = map[stage]
  return lessons[(dayOfMonth - 1) % lessons.length]
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
