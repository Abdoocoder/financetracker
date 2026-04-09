'use client'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { PageHeader } from '@/components/ui/page-header'
import Link from 'next/link'

const faqs = [
  {
    section: { ar: '🏠 لوحة التحكم', en: '🏠 Dashboard' },
    items: [
      {
        ar: { q: 'ما هي لوحة التحكم؟', a: 'لوحة التحكم هي صفحتك الرئيسية — تعرض ملخصاً كاملاً لوضعك المالي هذا الشهر، بما في ذلك الدخل والمصاريف والصافي.' },
        en: { q: 'What is the Dashboard?', a: 'The Dashboard is your home page — it shows a complete summary of your financial situation this month, including income, expenses, and net.' },
      },
      {
        ar: { q: 'كيف أضيف معاملة بسرعة؟', a: 'استخدم قسم "الإضافة السريعة" في أعلى الصفحة. اختر الفئة، أدخل المبلغ، واضغط إضافة. ما يأخذ أكثر من 5 ثواني!' },
        en: { q: 'How do I quickly add a transaction?', a: 'Use the "Quick Add" section at the top of the page. Choose the category, enter the amount, and tap add. Takes less than 5 seconds!' },
      },
      {
        ar: { q: 'ما هي نقاط الصحة المالية؟', a: 'رقم من 0-100 يقيس صحتك المالية بناءً على 5 عوامل: الادخار، الديون، صندوق الطوارئ، الاستثمار، وانتظام التتبع. كلما ارتفع كلما كنت أقرب للحرية المالية.' },
        en: { q: 'What is the Financial Health Score?', a: 'A number from 0-100 measuring your financial health based on 5 factors: savings, debt, emergency fund, investing, and tracking consistency. The higher it is, the closer you are to financial freedom.' },
      },
    ],
  },
  {
    section: { ar: '💸 المعاملات', en: '💸 Transactions' },
    items: [
      {
        ar: { q: 'كيف أضيف دخلاً أو مصروفاً؟', a: 'اذهب لصفحة المعاملات واضغط زر + في أعلى الصفحة. اختر النوع (دخل/مصروف)، أدخل المبلغ والفئة والتاريخ، ثم اضغط حفظ.' },
        en: { q: 'How do I add income or expense?', a: 'Go to the Transactions page and tap the + button at the top. Choose the type (income/expense), enter the amount, category, and date, then tap save.' },
      },
      {
        ar: { q: 'كيف أحذف أو أعدل معاملة؟', a: 'اضغط على المعاملة لتعديلها، أو اسحبها يساراً على الهاتف لحذفها.' },
        en: { q: 'How do I delete or edit a transaction?', a: 'Tap on a transaction to edit it, or swipe left on mobile to delete it.' },
      },
      {
        ar: { q: 'هل يمكنني تصدير معاملاتي؟', a: 'نعم! اضغط على زر "تصدير CSV" في صفحة المعاملات وستحصل على ملف Excel بكل معاملاتك.' },
        en: { q: 'Can I export my transactions?', a: 'Yes! Tap the "Export CSV" button on the Transactions page and you\'ll get an Excel file with all your transactions.' },
      },
      {
        ar: { q: 'لماذا سُجِّلت معاملتي المتكررة في تاريخ خاطئ؟', a: 'عند إنشاء قاعدة متكررة جديدة، يكون "التاريخ القادم" محدداً بتاريخ اليوم تلقائياً. تأكد من تغييره يدوياً للتاريخ الصحيح (مثلاً: 25) قبل الحفظ. لتصحيح قاعدة موجودة: افتح تبويب "متكررة" في صفحة المعاملات، اضغط تعديل، وغيّر "التاريخ القادم" للشهر القادم.' },
        en: { q: 'Why was my recurring transaction recorded on the wrong date?', a: 'When creating a new recurring rule, "Next Date" defaults to today. Make sure to manually change it to the correct date (e.g., the 25th) before saving. To fix an existing rule: open the "Recurring" tab in Transactions, tap Edit, and update "Next Date" to the correct future date.' },
      },
    ],
  },
  {
    section: { ar: '🏦 الحسابات', en: '🏦 Accounts' },
    items: [
      {
        ar: { q: 'كيف أضيف حساباً بنكياً؟', a: 'اذهب لصفحة الحسابات واضغط + في الأعلى. حدد نوع الحساب (بنك / نقدي / توفير / بطاقة ائتمان)، أدخل الاسم والرصيد الافتتاحي، ثم احفظ.' },
        en: { q: 'How do I add a bank account?', a: 'Go to the Accounts page and tap + at the top. Choose the account type (Bank / Cash / Savings / Credit Card), enter the name and opening balance, then save.' },
      },
      {
        ar: { q: 'ما هو الرصيد الافتتاحي؟', a: 'هو رصيدك الفعلي في اللحظة التي أضفت فيها الحساب للتطبيق. يُضاف مرة واحدة فقط ولا يظهر كمعاملة — يُشكّل الأساس الذي تُحتسب عليه جميع أرصدتك لاحقاً.' },
        en: { q: 'What is the opening balance?', a: 'It is your actual balance at the moment you added the account to the app. It is added only once and does not appear as a transaction — it forms the baseline for all future balance calculations.' },
      },
      {
        ar: { q: 'كيف أحوّل مالاً بين الحسابات؟', a: 'في صفحة الحسابات اضغط زر "تحويل"، حدد الحساب المصدر والوجهة، أدخل المبلغ وأكد. يُسجَّل التحويل داخلياً ولا يؤثر على صافي رصيدك الكلي.' },
        en: { q: 'How do I transfer money between accounts?', a: 'On the Accounts page tap "Transfer", select the source and destination accounts, enter the amount and confirm. It is recorded as an internal transfer and does not affect your overall net balance.' },
      },
    ],
  },
  {
    section: { ar: '💳 الديون', en: '💳 Debts' },
    items: [
      {
        ar: { q: 'كيف أضيف ديناً جديداً؟', a: 'اذهب لصفحة الديون واضغط "إضافة دين". أدخل اسم الدين، المبلغ الأصلي، المبلغ المتبقي، والقسط الشهري.' },
        en: { q: 'How do I add a new debt?', a: 'Go to the Debts page and tap "Add Debt". Enter the debt name, original amount, remaining amount, and monthly payment.' },
      },
      {
        ar: { q: 'ما هو الخصم التلقائي؟', a: 'يمكنك تحديد يوم من الشهر لكل دين، وسيخصم التطبيق القسط تلقائياً من رصيدك كل شهر دون تدخل منك.' },
        en: { q: 'What is auto deduction?', a: 'You can set a day of the month for each debt, and the app will automatically deduct the installment from your balance every month without your intervention.' },
      },
      {
        ar: { q: 'ماذا يحدث عند سداد الدين كاملاً؟', a: '🎉 احتفال! ستظهر ألعاب نارية وتهنئة. الدين ينتقل لقائمة "الديون المسددة" كإنجاز دائم.' },
        en: { q: 'What happens when I fully pay off a debt?', a: '🎉 Celebration! Confetti and congratulations appear. The debt moves to "Paid Debts" list as a permanent achievement.' },
      },
      {
        ar: { q: 'ما الفرق بين الخصم التلقائي والخصم اليدوي؟', a: 'الخصم التلقائي: التطبيق يخصم القسط تلقائياً كل شهر ويسجل معاملة مصروف بدون تدخل منك. الخصم اليدوي: يرسل لك تذكير فقط في يوم القسط لتسجيله بنفسك.' },
        en: { q: 'What is the difference between auto and manual deduction?', a: 'Auto deduction: the app deducts the installment automatically every month and logs an expense without your intervention. Manual: sends you a reminder on payment day to log it yourself.' },
      },
      {
        ar: { q: 'كيف أفعّل الخصم التلقائي لدين؟', a: 'عند إضافة أو تعديل الدين، فعّل خيار "خصم تلقائي" وحدد يوم الخصم من الشهر. سيتم الخصم تلقائياً كل شهر مع إشعار فوري.' },
        en: { q: 'How do I enable auto deduction for a debt?', a: 'When adding or editing a debt, enable the "Auto Deduct" option and set the deduction day. It will automatically deduct every month with an instant notification.' },
      },
      {
        ar: { q: 'متى يتم خصم الأقساط التلقائية؟', a: 'يتم الخصم في يوم الدفع المحدد لكل دين تحديداً. إذا حددت يوم 25، سيُخصم القسط في اليوم 25 من كل شهر. إذا أضفت الدين بعد اليوم 25 في الشهر الحالي، سيبدأ الخصم من الشهر القادم تلقائياً.' },
        en: { q: 'When are automatic installments deducted?', a: 'Deductions happen only on the specific payment day set for each debt. If you set day 25, the installment is deducted on the 25th of every month. If you added the debt after the 25th of the current month, deductions will start next month.' },
      },
    ],
  },
  {
    section: { ar: '📊 الميزانية', en: '📊 Budget' },
    items: [
      {
        ar: { q: 'كيف تعمل الميزانية الذكية؟', a: 'الميزانية تحسب تلقائياً من بياناتك — دخلك مطروحاً منه الأقساط والأهداف. المستشار المالي الذكي يحللها ويعطيك توصيات فورية.' },
        en: { q: 'How does the smart budget work?', a: 'The budget is automatically calculated from your data — your income minus installments and goals. The smart financial advisor analyzes it and gives you instant recommendations.' },
      },
      {
        ar: { q: 'ما هي قاعدة 50/30/20؟', a: '50% من دخلك للضروريات (إيجار، طعام)، 30% للرغبات (ترفيه، تسوق)، 20% للادخار والاستثمار. التطبيق يوزع ميزانيتك تلقائياً بهذه النسب.' },
        en: { q: 'What is the 50/30/20 rule?', a: '50% of your income for needs (rent, food), 30% for wants (entertainment, shopping), 20% for savings and investing. The app automatically distributes your budget using these ratios.' },
      },
    ],
  },
  {
    section: { ar: '🎯 الأهداف', en: '🎯 Goals' },
    items: [
      {
        ar: { q: 'كيف أنشئ هدفاً للادخار؟', a: 'اذهب لصفحة الأهداف واضغط "هدف جديد". حدد اسم الهدف، المبلغ المستهدف، والتاريخ المطلوب.' },
        en: { q: 'How do I create a savings goal?', a: 'Go to the Goals page and tap "New Goal". Set the goal name, target amount, and desired date.' },
      },
      {
        ar: { q: 'كيف أضيف مبلغاً لهدفي؟', a: 'اضغط على الهدف ثم "إضافة دفعة". أدخل المبلغ وسيُضاف لشريط التقدم فوراً.' },
        en: { q: 'How do I add money to my goal?', a: 'Tap on the goal then "Add Contribution". Enter the amount and it will be added to the progress bar immediately.' },
      },
    ],
  },
  {
    section: { ar: '📈 الاستثمار', en: '📈 Investments' },
    items: [
      {
        ar: { q: 'ما الأصول التي يدعمها التطبيق؟', a: 'يدعم الأسهم الأمريكية (مثل SPUS، VOO) والعملات الرقمية (BTC، ETH، وأكثر من 15 عملة) مع أسعار حية.' },
        en: { q: 'What assets does the app support?', a: 'Supports US stocks (like SPUS, VOO) and cryptocurrencies (BTC, ETH, and 15+ coins) with live prices.' },
      },
      {
        ar: { q: 'كيف يحسب التطبيق الربح والخسارة؟', a: 'يحسب الفرق بين سعر الشراء الذي أدخلته وبين السعر الحالي الحي. تظهر النتيجة بالدولار وبالنسبة المئوية.' },
        en: { q: 'How does the app calculate profit and loss?', a: 'It calculates the difference between the purchase price you entered and the current live price. The result shows in dollars and percentage.' },
      },
      {
        ar: { q: 'ما هو تاريخ الشراء وما علاقته بالزكاة؟', a: 'تاريخ شراء الأصل يُستخدم لحساب الحول في صفحة الزكاة (354 يوماً هجرياً). أدخله عند تعديل الاستثمار للحصول على تنبيهات دقيقة بموعد وجوب الزكاة.' },
        en: { q: 'What is the purchase date and how does it relate to Zakat?', a: 'The asset purchase date is used to calculate the haul (354 lunar days) in the Zakat page. Enter it when editing an investment to get accurate alerts about when Zakat is due.' },
      },
    ],
  },
  {
    section: { ar: '🕌 حاسبة الزكاة', en: '🕌 Zakat Calculator' },
    items: [
      {
        ar: { q: 'ما هي حاسبة الزكاة؟', a: 'أداة تحسب تلقائياً زكاة مالك وفق النصاب الشرعي. تجلب قيم استثماراتك وأهداف ادخارك وديونك مباشرةً من بياناتك، وتحتسب زكاة الذهب والفضة والنقد.' },
        en: { q: 'What is the Zakat Calculator?', a: 'A tool that automatically calculates your Zakat based on the Islamic nisab threshold. It fetches your investments, savings goals, and debts directly from your data.' },
      },
      {
        ar: { q: 'كيف يُحسب الحول؟', a: 'الحول يُحسب من تاريخ شراء الاستثمار إن وُجد، وإلا من تاريخ إدخاله في التطبيق (354 يوماً هجرياً). ستظهر تنبيهات ملونة قرب موعد الاستحقاق.' },
        en: { q: 'How is the haul calculated?', a: 'The haul is calculated from the investment purchase date if available, otherwise from the date it was added to the app (354 lunar days). Color-coded alerts appear as the due date approaches.' },
      },
      {
        ar: { q: 'هل أسعار الذهب والفضة حية؟', a: 'نعم، اضغط "أسعار حية" في الحاسبة وسيحضر التطبيق سعر الذهب والفضة الآني من السوق العالمي ويحوّله تلقائياً إلى عملتك.' },
        en: { q: 'Are gold and silver prices live?', a: "Yes — tap 'Live Prices' in the calculator and the app will retrieve the current global gold and silver prices and automatically convert them to your currency." },
      },
    ],
  },
  {
    section: { ar: '🔥 حاسبة FIRE', en: '🔥 FIRE Calculator' },
    items: [
      {
        ar: { q: 'ما هي حاسبة FIRE؟', a: 'FIRE اختصار (الاستقلال المالي والتقاعد المبكر). الحاسبة تحسب مقدار الثروة اللازمة للتقاعد بناءً على نفقاتك الشهرية ومعدل العائد السنوي المتوقع.' },
        en: { q: 'What is the FIRE Calculator?', a: 'FIRE stands for Financial Independence, Retire Early. The calculator determines how much wealth you need to retire based on your monthly expenses and expected annual return.' },
      },
      {
        ar: { q: 'ما هو معدل السحب؟', a: 'هو النسبة السنوية التي تسحبها من ثروتك بعد التقاعد. القاعدة الذهبية 4% تعني أن ثروتك تكفي 25 سنة على الأقل إحصائياً دون نفاد.' },
        en: { q: 'What is the withdrawal rate?', a: "The annual percentage you withdraw from your wealth after retirement. The 4% rule means your wealth will last at least 25 years statistically without running out." },
      },
      {
        ar: { q: 'ما الفرق بين أوضاع Lean وFat وNormal؟', a: 'Lean يعني تقاعد بنمط حياة اقتصادي (70% من نفقاتك)، Normal بنفس نمط حياتك الحالي، وFat بنمط حياة مريح (150% من نفقاتك).' },
        en: { q: 'What is the difference between Lean, Normal, and Fat modes?', a: 'Lean means retiring with a frugal lifestyle (70% of expenses), Normal means the same lifestyle as today, and Fat means a comfortable lifestyle (150% of expenses).' },
      },
    ],
  },
  {
    section: { ar: '📚 تعلّم', en: '📚 Learn' },
    items: [
      {
        ar: { q: 'كيف تُختار الدروس اليومية؟', a: 'الدروس تُختار بناءً على مرحلتك المالية الحالية (وعي، ديون، طوارئ، استثمار، ثروة). كل 7 أيام يأتيك درس إسلامي مرتبط بالرزق.' },
        en: { q: 'How are daily lessons chosen?', a: 'Lessons are chosen based on your current financial stage (awareness, debt, emergency, investing, wealth). Every 7 days you get an Islamic lesson related to provision.' },
      },
      {
        ar: { q: 'ما هي السلسلة اليومية؟', a: 'كل يوم تُكمل فيه درساً تكسب نقطة في سلسلتك. حافظ على السلسلة للحصول على أقصى استفادة من التعلم.' },
        en: { q: 'What is the daily streak?', a: 'Every day you complete a lesson you earn a point in your streak. Maintain the streak to get maximum benefit from learning.' },
      },
    ],
  },
  {
    section: { ar: '🔔 التنبيهات', en: '🔔 Alerts' },
    items: [
      {
        ar: { q: 'من أين تأتي التنبيهات؟', a: 'الذكاء الاصطناعي يحلل بياناتك يومياً ويولد تنبيهات مخصصة — تحذيرات عند تجاوز 75% من دخلك، إنجازات عند الادخار، وتذكيرات للأقساط.' },
        en: { q: 'Where do alerts come from?', a: 'AI analyzes your data daily and generates personalized alerts — warnings when you exceed 75% of income, achievements when saving, and installment reminders.' },
      },
      {
        ar: { q: 'كيف أفعّل الإشعارات؟', a: 'اذهب للإعدادات وفعّل "إشعارات الهاتف". اسمح للتطبيق بإرسال إشعارات وستصلك تنبيهاتك يومياً.' },
        en: { q: 'How do I enable notifications?', a: 'Go to Settings and enable "Phone Notifications". Allow the app to send notifications and you\'ll receive your daily alerts.' },
      },
    ],
  },
  {
    section: { ar: '📄 تقارير PDF', en: '📄 PDF Reports' },
    items: [
      {
        ar: { q: 'كيف أصدر تقريراً PDF؟', a: 'اذهب لصفحة "تقارير PDF"، حدد الفترة الزمنية والحسابات المراد تضمينها، ثم اضغط "تصدير PDF". سيتحمّل ملف جاهز للطباعة أو المشاركة.' },
        en: { q: 'How do I export a PDF report?', a: 'Go to the "PDF Reports" page, select the time period and accounts to include, then tap "Export PDF". A print-ready file will download.' },
      },
      {
        ar: { q: 'ماذا يتضمن التقرير؟', a: 'ملخص المعاملات، الميزانية، الأهداف، الديون، وبيانات الاستثمار خلال الفترة المحددة — كل شيء في ملف واحد منظّم.' },
        en: { q: 'What does the report include?', a: 'A summary of transactions, budget, goals, debts, and investment data for the selected period — everything in one organized file.' },
      },
    ],
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '14px 16px', background: open ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', flex: 1 }}>{q}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px 14px', background: 'var(--bg-primary)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const { lang, currentLang } = useI18n()
  const [search, setSearch] = useState('')

  const filtered = faqs.map(section => ({
    ...section,
    items: section.items.filter(item => {
      const { q, a } = item[currentLang]
      return q.includes(search) || a.includes(search)
    })
  })).filter(s => s.items.length > 0)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title={currentLang === 'ar' ? '💬 مركز المساعدة' : '💬 Help Center'}
        subtitle={currentLang === 'ar' ? 'كل ما تحتاج معرفته عن فجرك' : 'Everything you need to know about Fajrak'}
      />

      {/* بحث */}
      <input
        type="text"
        placeholder={currentLang === 'ar' ? '🔍 ابحث عن سؤال...' : '🔍 Search a question...'}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
          textAlign: currentLang === 'ar' ? 'right' : 'left', boxSizing: 'border-box',
        }}
      />

      {/* الأسئلة */}
      {filtered.map((section, i) => (
        <div key={i}>
          <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-secondary)', marginBottom: 10, letterSpacing: '0.05em' }}>
            {section.section[currentLang]}
          </div>
          {section.items.map((item, j) => {
            const { q, a } = item[currentLang]
            return <FAQItem key={j} q={q} a={a} />
          })}
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {currentLang === 'ar' ? 'لا نتائج — جرب كلمة أخرى' : 'No results — try another word'}
          </div>
        </div>
      )}

      {/* تواصل */}
      <div style={{ padding: '20px', borderRadius: 16, background: 'rgba(59,126,246,0.06)', border: '1px solid rgba(59,126,246,0.15)', textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>🤝</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          {currentLang === 'ar' ? 'لم تجد إجابتك؟' : "Didn't find your answer?"}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          {currentLang === 'ar' ? 'تواصل معنا مباشرة وسنساعدك' : 'Contact us directly and we\'ll help you'}
        </div>
        <a href="mailto:support@fajrak.com" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: 12,
          background: 'var(--accent-blue)', color: 'white',
          fontSize: 13, fontWeight: 800, textDecoration: 'none',
        }}>
          📧 {currentLang === 'ar' ? 'راسلنا' : 'Contact Us'}
        </a>
      </div>
    </div>
  )
}
