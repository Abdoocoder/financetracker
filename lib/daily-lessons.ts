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
  // كل 7 أيام — درس إسلامي مرتبط بالمرحلة
  if (dayOfMonth % 7 === 0) {
    // درس إسلامي خاص بالمرحلة
    if (stage === 'debt') {
      const idx = (Math.floor(dayOfMonth / 7) - 1) % ISLAMIC_DEBT_LESSONS.length
      return lang === 'ar' ? ISLAMIC_DEBT_LESSONS[idx].ar : ISLAMIC_DEBT_LESSONS[idx].en
    }
    if (stage === 'investing' || stage === 'wealth') {
      const idx = (Math.floor(dayOfMonth / 7) - 1) % ISLAMIC_HARAM_MONEY_LESSONS.length
      return lang === 'ar' ? ISLAMIC_HARAM_MONEY_LESSONS[idx].ar : ISLAMIC_HARAM_MONEY_LESSONS[idx].en
    }
    const allIslamic = [...ISLAMIC_LESSONS, ...ISLAMIC_LESSONS_EXTENDED]
    const idx = (Math.floor(dayOfMonth / 7) - 1) % allIslamic.length
    return allIslamic[idx][lang]
  }
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

// ── الدروس الإسلامية ─────────────────────────────────
export const ISLAMIC_LESSONS = [
  {
    ar: {
      title: '💚 الصلاة على النبي ﷺ تكفي الهم',
      body: 'عن أُبَيِّ بن كعب رضي الله عنه قال: قلت يا رسول الله أجعل لك صلاتي كلها؟ قال: "إذًا تُكْفَى هَمَّكَ وَيُغْفَرُ لَكَ ذَنْبُكَ". رواه الترمذي وأحمد. أكثر من الصلاة على النبي ﷺ — فهي تكفي همك المالي وغيره.',
      url: '/dashboard',
    },
    en: {
      title: '💚 Salawat upon the Prophet ﷺ relieves worries',
      body: "Ubayy ibn Ka'b said: I said: O Messenger of Allah, shall I devote all my prayers to you? He said: Then your worries will be relieved and your sins forgiven. (Tirmidhi & Ahmad)",
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🌧️ الاستغفار يفتح أبواب الرزق',
      body: '"فَقُلْتُ اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا • يُرْسِلِ السَّمَاءَ عَلَيْكُم مِّدْرَارًا • وَيُمْدِدْكُم بِأَمْوَالٍ وَبَنِينَ وَيَجْعَل لَّكُمْ جَنَّاتٍ وَيَجْعَل لَّكُمْ أَنْهَارًا" (نوح: 10-12). الاستغفار سبب مباشر للرزق.',
      url: '/dashboard',
    },
    en: {
      title: '🌧️ Istighfar opens the gates of provision',
      body: '"Ask forgiveness of your Lord. He will send rain upon you in continuing showers. And give you increase in wealth and children." (Nuh: 10-12). Seeking forgiveness is a direct cause of provision.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '💰 "مَا نَقَصَ مَالٌ مِن صَدَقَةٍ"',
      body: 'قال ﷺ: "ما نقص مال من صدقة، وما زاد الله عبداً بعفو إلا عزاً". الصدقة تبارك المال ولا تنقصه. خصص نسبة من دخلك اليوم للصدقة وتوكل على الله.',
      url: '/dashboard',
    },
    en: {
      title: '💰 Wealth is not diminished by charity',
      body: 'The Prophet ﷺ said: "Wealth is not diminished by charity, and Allah only increases a servant in honor by pardoning." Charity blesses wealth rather than diminishing it.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🌅 اليد العليا خير من اليد السفلى',
      body: 'قال ﷺ: "اليد العليا خير من اليد السفلى، واليد العليا هي المنفقة، واليد السفلى هي السائلة". هدفك من بناء ثروتك أن تكون دائماً صاحب اليد العليا.',
      url: '/dashboard',
    },
    en: {
      title: '🌅 The upper hand is better than the lower hand',
      body: 'The Prophet ﷺ said: "The upper hand is better than the lower hand. The upper hand is the one that gives, and the lower hand is the one that takes." Build wealth to always be the giver.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🛡️ حكمة يوسف عليه السلام في الادخار',
      body: '"تَزْرَعُونَ سَبْعَ سِنِينَ دَأَبًا فَمَا حَصَدتُّمْ فَذَرُوهُ فِي سُنبُلِهِ" (يوسف:47). نبي الله يوسف علّمنا الادخار في سنوات الخير استعداداً للعسر.',
      url: '/dashboard/goals',
    },
    en: {
      title: '🛡️ Prophet Yusuf wisdom in saving',
      body: '"You will plant for seven years consecutively; and what you harvest leave in its spikes" (12:47). Prophet Yusuf taught us to save in years of plenty for years of hardship.',
      url: '/dashboard/goals',
    },
  },
  {
    ar: {
      title: '🤲 دعاء الكفاية — احفظه',
      body: '"اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك". رددها صباحاً ومساءً — جامعة لطلب الغنى الحلال والاستغناء عن الخلق.',
      url: '/dashboard',
    },
    en: {
      title: '🤲 The prayer of sufficiency',
      body: '"O Allah, suffice me with Your lawful against Your unlawful, and enrich me with Your grace over all others." Repeat morning and evening.',
      url: '/dashboard',
    },
  },
]



// ── الدروس الإسلامية — التحذير من المال الحرام ──────────
export const ISLAMIC_HARAM_MONEY_LESSONS = [
  {
    ar: {
      title: '🚫 إن الله طيب لا يقبل إلا طيباً',
      body: 'قال ﷺ: "إن الله طيب لا يقبل إلا طيباً". المال الحرام لا تُقبل معه صدقة ولا دعاء. احرص أن يكون مصدر دخلك حلالاً طيباً — فالبركة في الحلال لا في الكثرة.',
      url: '/dashboard/investments',
    },
    en: {
      title: '🚫 Allah is pure and accepts only what is pure',
      body: 'The Prophet ﷺ said: "Allah is pure and accepts only what is pure." Charity and supplications from haram wealth are not accepted. Ensure your income is halal — blessing comes from lawfulness, not quantity.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '⚠️ لا يبالي المرء بما أخذ المال',
      body: 'قال ﷺ: "ليأتيَنَّ على الناس زمان لا يبالي المرء بما أخذ المال أمن حلال أم من حرام". نحن نعيش هذا الزمان — فكن ممن يُميّز ويختار الحلال.',
      url: '/dashboard',
    },
    en: {
      title: '⚠️ A time will come when people care not how they earn',
      body: 'The Prophet ﷺ said: "A time will come when people will not care whether what they earn is halal or haram." We live in that time — be among those who choose halal.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🍽️ مطعمه حرام فأنّى يُستجاب له',
      body: 'قال ﷺ عن رجل يمد يديه للسماء: "مطعمه حرام ومشربه حرام وملبسه حرام وغُذِّي بالحرام فأنّى يُستجاب لذلك؟" (مسلم). المال الحرام يحجب إجابة الدعاء.',
      url: '/dashboard',
    },
    en: {
      title: '🍽️ His food is haram — how can his prayer be answered?',
      body: 'The Prophet ﷺ said about a man raising his hands in prayer: "His food is haram, his drink is haram, his clothing is haram — how can his prayer be answered?" (Muslim). Haram wealth blocks answered prayers.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🌱 كلوا مما في الأرض حلالاً طيباً',
      body: '﴿يَا أَيُّهَا النَّاسُ كُلُوا مِمَّا فِي الْأَرْضِ حَلَالًا طَيِّبًا وَلَا تَتَّبِعُوا خُطُوَاتِ الشَّيْطَانِ﴾ (البقرة:168). الحلال الطيب هو المكتسب بغير غصب ولا ربا ولا غش ولا رشوة.',
      url: '/dashboard/investments',
    },
    en: {
      title: '🌱 Eat what is lawful and good from the earth',
      body: '"O mankind, eat from whatever is on earth that is lawful and good and do not follow the footsteps of Satan." (2:168). Halal means earned without usurpation, usury, deception, or bribery.',
      url: '/dashboard/investments',
    },
  },
  {
    ar: {
      title: '💸 من غشنا فليس منا',
      body: 'مرّ النبي ﷺ على صاحب طعام فأدخل يده فيها فوجد بللاً فقال: "من غشنا فليس منا" (مسلم). الغش في المعاملات من كبائر الذنوب — تحقق أن تعاملاتك شفافة وأمينة.',
      url: '/dashboard/transactions',
    },
    en: {
      title: '💸 Whoever deceives us is not one of us',
      body: 'The Prophet ﷺ found wet food hidden beneath dry food and said: "Whoever deceives us is not one of us." (Muslim). Deception in transactions is a major sin — ensure your dealings are transparent and honest.',
      url: '/dashboard/transactions',
    },
  },
  {
    ar: {
      title: '🔥 لا يدخل الجنة لحم نبت من سحت',
      body: 'قال ﷺ: "لا يدخل الجنة لحم نبت من سحت، النار أولى به". المال الحرام لا بركة فيه ولو كثر. اسعَ للحلال وإن قلّ — فالقليل الحلال خير من الكثير الحرام.',
      url: '/dashboard',
    },
    en: {
      title: '🔥 No flesh nourished by haram will enter Paradise',
      body: 'The Prophet ﷺ said: "No flesh nourished by what is unlawful will enter Paradise — the Fire is more worthy of it." Haram wealth has no blessing even if abundant. Seek the halal even if little — little halal is better than much haram.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '📊 إن لكل أمة فتنة وفتنة أمتي المال',
      body: 'قال ﷺ: "إن لكل أمة فتنة وإن فتنة أمتي المال" (الترمذي). المال اختبار — كيف تكسبه؟ وكيف تنفقه؟ فجرك يساعدك تجتاز هذا الاختبار بتتبع الحلال وتجنب الحرام.',
      url: '/dashboard',
    },
    en: {
      title: '📊 Every nation has a trial — this nation\'s trial is wealth',
      body: 'The Prophet ﷺ said: "Every nation has a trial, and the trial of my nation is wealth." (Tirmidhi). Wealth is a test — how do you earn it? How do you spend it? Fajrak helps you pass this test by tracking halal and avoiding haram.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🤲 كنا ندع تسعة أعشار الحلال مخافة الحرام',
      body: 'قال عمر بن الخطاب رضي الله عنه: "كنا ندع تسعة أعشار الحلال مخافة الوقوع في الحرام". هذا هو الورع الحقيقي — احرص على طهارة مصادر دخلك.',
      url: '/dashboard',
    },
    en: {
      title: '🤲 We used to leave 9/10 of the halal fearing the haram',
      body: 'Umar ibn al-Khattab said: "We used to leave nine-tenths of the halal for fear of falling into the haram." This is true piety — be mindful of the purity of your income sources.',
      url: '/dashboard',
    },
  },
]

// ── الدروس الإسلامية لمرحلة الديون ────────────────────
export const ISLAMIC_DEBT_LESSONS = [
  {
    ar: {
      title: '🤲 دعاء قضاء الدين — احفظه',
      body: '"اللهم اكفني بحلالك عن حرامك، وأغنني بفضلك عمن سواك". رواه الترمذي. رددها صباحاً ومساءً — جامعة لطلب الغنى الحلال وقضاء الدين.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🤲 Prayer for paying off debt',
      body: '"O Allah, suffice me with Your lawful against Your unlawful, and enrich me with Your grace over all others." (Tirmidhi). Repeat morning and evening.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '⚖️ نفس المؤمن معلقة بدينه',
      body: 'قال ﷺ: "نفس المؤمن معلقة بدينه حتى يُقضى عنه". هذا الحديث يُبين خطورة الدين — لكنه أيضاً بشارة: من يسعى لسداد دينه بنية صادقة يُعينه الله.',
      url: '/dashboard/debts',
    },
    en: {
      title: '⚖️ The believer\'s soul is held by his debt',
      body: 'The Prophet ﷺ said: "The believer\'s soul is held by his debt until it is paid." This shows the seriousness of debt — but also a glad tiding: whoever sincerely seeks to repay will be aided by Allah.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '💚 من أراد الأداء أدى الله عنه',
      body: 'قال ﷺ: "من أخذ أموال الناس يريد أداءها أدى الله عنه، ومن أخذها يريد إتلافها أتلفه الله". النية الصادقة في السداد تستجلب عون الله.',
      url: '/dashboard/debts',
    },
    en: {
      title: '💚 Allah repays on behalf of those who intend to repay',
      body: 'The Prophet ﷺ said: "Whoever takes people\'s wealth intending to repay it, Allah will repay it on his behalf." Sincere intention to repay brings Allah\'s help.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '🛡️ دعاء الهم والدين — من السنة',
      body: '"اللهم إني أعوذ بك من الهم والحَزَن، والعجز والكسل، والجبن والبخل، وغلبة الدين وقهر الرجال". رواه البخاري. اجعله ورداً يومياً حتى تُقضى ديونك.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🛡️ Protection from debt and anxiety — from the Sunnah',
      body: '"O Allah, I seek refuge in You from worry and grief, from helplessness and laziness, from cowardice and miserliness, and from the burden of debt and the oppression of men." (Bukhari). Make it a daily supplication.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '✍️ كتابة الديون فريضة قرآنية',
      body: '"يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ" (البقرة:282). القرآن يأمر بتوثيق الديون — فجرك يساعدك على ذلك.',
      url: '/dashboard/debts',
    },
    en: {
      title: '✍️ Writing debts is a Quranic obligation',
      body: '"O you who believe! When you contract a debt for a specified term, write it down." (2:282). The Quran commands documenting debts — Fajrak helps you do that.',
      url: '/dashboard/debts',
    },
  },
  {
    ar: {
      title: '🌟 مطل الغني ظلم',
      body: 'قال ﷺ: "مطل الغني ظلم". التأخير في سداد الدين مع القدرة ظلم. اجعل سداد ديونك أولوية — وابدأ بأصغر دين اليوم.',
      url: '/dashboard/debts',
    },
    en: {
      title: '🌟 Delay in repayment by the wealthy is injustice',
      body: 'The Prophet ﷺ said: "Delay in repayment by the wealthy is injustice." Prioritize paying your debts — start with the smallest one today.',
      url: '/dashboard/debts',
    },
  },
]

// ── الدروس الإسلامية الموسّعة ────────────────────────
// مصادر: القرآن الكريم + السنة النبوية الصحيحة
// المحور: العمل، التجارة، التقوى، الاستغفار، الصدقة، الدعاء، الاستغناء

export const ISLAMIC_LESSONS_EXTENDED = [
  // ── العمل والسعي ──
  {
    ar: {
      title: '🌍 انتشروا في الأرض وابتغوا من فضل الله',
      body: '"فَإِذَا قُضِيَتِ الصَّلَاةُ فَانتَشِرُوا فِي الْأَرْضِ وَابْتَغُوا مِن فَضْلِ اللَّهِ" (الجمعة:10). العمل بعد الصلاة أمر إلهي — ابتغاء الرزق عبادة.',
      url: '/dashboard',
    },
    en: {
      title: '🌍 Disperse through the land and seek the bounty of Allah',
      body: '"When the prayer has been concluded, disperse within the land and seek from the bounty of Allah" (62:10). Working after prayer is a divine command — seeking provision is worship.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🚶 امشوا في مناكبها وكلوا من رزقه',
      body: '"هُوَ الَّذِي جَعَلَ لَكُمُ الْأَرْضَ ذَلُولًا فَامْشُوا فِي مَنَاكِبِهَا وَكُلُوا مِن رِّزْقِهِ" (الملك:15). الأرض مسخّرة لك — السعي فيها شكر لله.',
      url: '/dashboard',
    },
    en: {
      title: '🚶 Walk in its paths and eat of His provision',
      body: '"It is He who made the earth tame for you — so walk among its slopes and eat of His provision" (67:15). The earth is made easy for you — striving in it is gratitude to Allah.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🪵 العمل بيدك خير من سؤال الناس',
      body: 'قال ﷺ: "لأن يأخذ أحدكم حبله فيأتي بحزمة حطب على ظهره فيبيعها خير له من أن يسأل الناس". رواه البخاري. الاعتماد على النفس كرامة — ابدأ بما تملك.',
      url: '/dashboard',
    },
    en: {
      title: '🪵 Working with your hands is better than asking people',
      body: 'The Prophet ﷺ said: "For one of you to take his rope, bring a bundle of wood on his back and sell it, is better than asking people." (Bukhari). Self-reliance is dignity.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🍞 خير الطعام ما كان من عمل يدك',
      body: 'قال ﷺ: "ما أكل أحد طعاماً قط خيراً من أن يأكل من عمل يده". رواه البخاري. مالك الذي تكسبه بعملك هو أطيب مال — تابعه وبارك فيه.',
      url: '/dashboard/transactions',
    },
    en: {
      title: '🍞 The best food is what comes from your own work',
      body: 'The Prophet ﷺ said: "No one has ever eaten food better than what he earned with his own hands." (Bukhari). The money you earn through your work is the purest.',
      url: '/dashboard/transactions',
    },
  },
  // ── التجارة الحلال ──
  {
    ar: {
      title: '🤝 التاجر الصدوق مع النبيين والشهداء',
      body: 'قال ﷺ: "التاجر الصدوق الأمين مع النبيين والصديقين والشهداء". رواه الترمذي. تجارتك الحلال تضعك في أعلى درجات الآخرة — الصدق في المال عبادة.',
      url: '/dashboard',
    },
    en: {
      title: '🤝 The honest merchant is with the prophets and martyrs',
      body: 'The Prophet ﷺ said: "The honest, trustworthy merchant is with the prophets, the truthful, and the martyrs." (Tirmidhi). Your lawful trade places you among the highest ranks.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '📈 وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا',
      body: '"وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا" (البقرة:275). التجارة الحلال مباركة — ابتعد عن الربا وتبارك في مالك. تتبع مصادر دخلك وتأكد من حلّها.',
      url: '/dashboard/transactions',
    },
    en: {
      title: '📈 Allah has permitted trade and forbidden usury',
      body: '"Allah has permitted trade and forbidden usury" (2:275). Lawful trade is blessed — avoid usury and your wealth will be pure. Track your income sources and ensure their lawfulness.',
      url: '/dashboard/transactions',
    },
  },
  // ── التقوى ──
  {
    ar: {
      title: '🌟 وَمَن يَتَّقِ اللَّهَ يَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
      body: '"وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ" (الطلاق:2-3). التقوى تفتح أبواباً لا تخطر على البال — كن مستقيماً وتوكل.',
      url: '/dashboard',
    },
    en: {
      title: '🌟 Whoever fears Allah — He will provide from where he does not expect',
      body: '"Whoever fears Allah — He will make for him a way out and will provide for him from where he does not expect" (65:2-3). Taqwa opens doors beyond imagination.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '🌧️ لو آمنوا واتقوا لفُتحت بركات السماء والأرض',
      body: '"وَلَوْ أَنَّ أَهْلَ الْقُرَى آمَنُوا وَاتَّقَوْا لَفَتَحْنَا عَلَيْهِم بَرَكَاتٍ مِّنَ السَّمَاءِ وَالْأَرْضِ" (الأعراف:96). الاستقامة مفتاح البركة في الرزق.',
      url: '/dashboard',
    },
    en: {
      title: '🌧️ If they had believed and feared Allah, blessings would have opened',
      body: '"If the people of the towns had believed and feared Allah, We would have opened upon them blessings from the heaven and the earth" (7:96). Righteousness is the key to blessed provision.',
      url: '/dashboard',
    },
  },
  // ── الصدقة ──
  {
    ar: {
      title: '🌾 حبة أنبتت سبع سنابل — مثل الصدقة',
      body: '"مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ" (البقرة:261). كل دينار تتصدق به يعود إليك بسبعمائة — خصص نسبة للصدقة اليوم.',
      url: '/dashboard',
    },
    en: {
      title: '🌾 One grain that grows seven spikes — the parable of charity',
      body: '"The example of those who spend their wealth in the way of Allah is like a seed of grain which grows seven spikes" (2:261). Every dinar you give returns seven hundred — allocate a portion for charity today.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '💫 وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ',
      body: '"وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ وَهُوَ خَيْرُ الرَّازِقِينَ" (سبأ:39). الله يخلف ما أنفقت — أنفق بيقين وتوكل على الرازق.',
      url: '/dashboard',
    },
    en: {
      title: '💫 Whatever you spend — He will replace it',
      body: '"Whatever you spend of good — He will compensate it; and He is the best of providers" (34:39). Allah replaces what you spend — give with certainty and trust the Provider.',
      url: '/dashboard',
    },
  },
  // ── الدعاء والاستغناء ──
  {
    ar: {
      title: '🤲 النبي ﷺ كان يسأل الله الغنى',
      body: 'قال ﷺ: "اللهم إني أسألك الهدى والتقى والعفاف والغنى". رواه مسلم. طلب الغنى من الله عبادة — ادعُ بهذا الدعاء اليوم.',
      url: '/dashboard',
    },
    en: {
      title: '🤲 The Prophet ﷺ used to ask Allah for wealth',
      body: 'The Prophet ﷺ said: "O Allah, I ask You for guidance, piety, chastity, and wealth." (Muslim). Asking Allah for wealth is worship — make this supplication today.',
      url: '/dashboard',
    },
  },
  {
    ar: {
      title: '💎 ومن يستغن يغنه الله',
      body: 'قال ﷺ: "ومن يستعفف يعفه الله، ومن يستغن يغنه الله". رواه البخاري ومسلم. الاستغناء عن الناس بداية الغنى الحقيقي — اعتمد على الله ثم على عملك.',
      url: '/dashboard',
    },
    en: {
      title: '💎 Whoever seeks self-sufficiency, Allah will enrich him',
      body: 'The Prophet ﷺ said: "Whoever seeks chastity, Allah will make him chaste. Whoever seeks self-sufficiency, Allah will enrich him." (Bukhari & Muslim). Self-reliance is the beginning of true wealth.',
      url: '/dashboard',
    },
  },
]
