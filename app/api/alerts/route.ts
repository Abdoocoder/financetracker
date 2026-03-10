import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push-send'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── مساعد: فحص وجود تنبيه مشابه اليوم ──────────────
async function alreadyExists(userId: string, title: string, withinHours = 20): Promise<boolean> {
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('title', title)
    .gte('created_at', since)
  return (count ?? 0) > 0
}

// ── مساعد: إضافة تنبيه بعد التحقق ──────────────────
async function pushAlert(
  list: Record<string, unknown>[],
  userId: string,
  type: string,
  title: string,
  message: string,
  withinHours = 20
) {
  const exists = await alreadyExists(userId, title, withinHours)
  if (!exists) {
    list.push({ user_id: userId, type, title, message, frequency: 'daily', is_read: false, is_active: true })
  }
}

// ── التوليد الرئيسي ──────────────────────────────────
async function generateAlerts(userId?: string) {
  const now        = new Date()
  const dayOfWeek  = now.getDay()   // 0=أحد
  const dayOfMonth = now.getDate()
  const month      = now.getMonth() + 1
  const todayStr   = now.toISOString().split('T')[0]

  const query = supabase.from('profiles').select('id, monthly_income, full_name')
  const { data: profiles } = userId
    ? await query.eq('id', userId)
    : await query

  if (!profiles?.length) return 0

  const toInsert: Record<string, unknown>[] = []

  for (const profile of profiles) {
    const uid    = profile.id
    const income = profile.monthly_income ?? 0
    const name   = profile.full_name?.split(' ')[0] ?? 'أخي'

    // ── 1. جلب بيانات المستخدم كاملة ──────────────
    const firstOfMonth = `${now.getFullYear()}-${String(month).padStart(2,'0')}-01`

    const [txRes, debtRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('type,amount,transaction_date')
        .eq('user_id', uid)
        .gte('transaction_date', firstOfMonth),
      supabase.from('debts').select('name,remaining_amount,original_amount,monthly_payment')
        .eq('user_id', uid).eq('is_paid', false),
      supabase.from('investments').select('symbol,shares,current_price,avg_buy_price')
        .eq('user_id', uid),
      supabase.from('savings_goals').select('name,current_amount,target_amount')
        .eq('user_id', uid),
    ])

    const txns    = txRes.data   ?? []
    const debts   = debtRes.data ?? []
    const invs    = invRes.data  ?? []
    const goals   = goalRes.data ?? []

    const monthIncome   = txns.filter(t => t.type === 'income').reduce((a,t) => a + Number(t.amount), 0)
    const monthExpenses = txns.filter(t => t.type === 'expense').reduce((a,t) => a + Number(t.amount), 0)
    const totalDebt     = debts.reduce((a,d) => a + Number(d.remaining_amount), 0)
    const totalMonthly  = debts.reduce((a,d) => a + Number(d.monthly_payment), 0)
    const invValue      = invs.reduce((a,i) => a + Number(i.shares) * Number(i.current_price), 0)
    const invCost       = invs.reduce((a,i) => a + Number(i.shares) * Number(i.avg_buy_price), 0)
    const invPnl        = invValue - invCost
    const effectiveIncome = monthIncome || income

    // ── 2. تنبيهات الإنفاق ──────────────────────────
    if (effectiveIncome > 0) {
      const ratio = monthExpenses / effectiveIncome

      if (ratio > 0.9) {
        await pushAlert(toInsert, uid, 'warning',
          '🚨 تجاوزت 90% من دخلك!',
          `مصاريفك هذا الشهر ${monthExpenses.toFixed(0)} JOD = ${(ratio*100).toFixed(0)}% من دخلك. توقف عن الإنفاق غير الضروري فوراً.`)
      } else if (ratio > 0.75) {
        await pushAlert(toInsert, uid, 'warning',
          '⚠️ مصاريفك تجاوزت 75% من دخلك',
          `أنفقت ${monthExpenses.toFixed(0)} JOD من أصل ${effectiveIncome.toFixed(0)} JOD. راجع المصاريف قبل نهاية الشهر.`)
      } else if (ratio < 0.5 && monthExpenses > 0) {
        await pushAlert(toInsert, uid, 'achievement',
          '🏆 إنجاز! ادخرت أكثر من 50% من دخلك',
          `رائع يا ${name}! مصاريفك فقط ${(ratio*100).toFixed(0)}% من دخلك هذا الشهر. استثمر الفائض!`)
      }
    }

    // ── 3. تنبيهات الديون ───────────────────────────
    if (debts.length > 0) {
      // تذكير نهاية الشهر
      if (dayOfMonth >= 23 && dayOfMonth <= 25) {
        await pushAlert(toInsert, uid, 'reminder',
          '📅 تذكير: أقساط الشهر القادم',
          `إجمالي أقساطك ${totalMonthly.toFixed(0)} JOD. تأكد من توفر المبلغ في حسابك.`,
          48)
      }

      // دين بنسبة سداد عالية
      const nearlyPaid = debts.find(d => {
        const pct = (Number(d.original_amount) - Number(d.remaining_amount)) / Number(d.original_amount)
        return pct >= 0.8 && pct < 1
      })
      if (nearlyPaid) {
        await pushAlert(toInsert, uid, 'achievement',
          `🎯 اقتربت من سداد "${nearlyPaid.name}"!`,
          `تبقى فقط ${Number(nearlyPaid.remaining_amount).toFixed(0)} JOD — أنت على بُعد خطوات من التحرر من هذا الدين!`,
          168) // مرة أسبوعياً
      }

      // تنبيه إجمالي الديون مرتفع
      if (effectiveIncome > 0 && totalDebt > effectiveIncome * 6) {
        await pushAlert(toInsert, uid, 'warning',
          '💳 ديونك تجاوزت 6 أضعاف دخلك الشهري',
          `إجمالي ديونك ${totalDebt.toFixed(0)} JOD. ركّز على السداد المبكر للديون ذات الأولوية القصوى.`,
          168)
      }
    }

    // ── 4. تنبيهات الاستثمار ────────────────────────
    if (invs.length > 0) {
      if (invPnl > 0) {
        const pnlPct = (invPnl / invCost * 100).toFixed(1)
        await pushAlert(toInsert, uid, 'achievement',
          `📈 محفظتك في المنطقة الخضراء +${pnlPct}%`,
          `قيمة محفظتك الحالية $${invValue.toFixed(0)} مقارنة بتكلفة $${invCost.toFixed(0)}. الاستثمار المنتظم يبني الثروة.`,
          168)
      } else if (invPnl < -invCost * 0.1) {
        await pushAlert(toInsert, uid, 'reminder',
          '📉 انخفاض مؤقت في محفظتك',
          `لا تتسرع في البيع — الاستثمار طويل الأمد في مؤشرات مثل SPUS مصمم لتحمل التذبذبات.`,
          168)
      }

      // ربعي: تذكير بالشراء
      if (dayOfMonth <= 3 && [1,4,7,10].includes(month)) {
        await pushAlert(toInsert, uid, 'reminder',
          '🗓️ وقت الشراء الربعي لـ SPUS',
          `بدأ شهر ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][month-1]} — أضف دفعتك الاستثمارية الربعية للاستفادة من متوسط التكلفة.`,
          168)
      }
    }

    // ── 5. تنبيهات الأهداف ──────────────────────────
    if (goals.length > 0) {
      const almostGoal = goals.find(g => {
        const pct = Number(g.current_amount) / Number(g.target_amount)
        return pct >= 0.9 && pct < 1
      })
      if (almostGoal) {
        const rem = Number(almostGoal.target_amount) - Number(almostGoal.current_amount)
        await pushAlert(toInsert, uid, 'achievement',
          `🎯 كدت تحقق هدف "${almostGoal.name}"!`,
          `تبقى ${rem.toFixed(0)} JOD فقط لتحقيق هدفك. دفعة واحدة أخيرة!`,
          168)
      }

      // هدف بدون ادخار
      const stagnant = goals.find(g => Number(g.current_amount) === 0)
      if (stagnant) {
        await pushAlert(toInsert, uid, 'reminder',
          `⏰ هدف "${stagnant.name}" ينتظرك`,
          `لم تبدأ بعد بالادخار لهذا الهدف. حتى ${(Number(stagnant.target_amount)*0.01).toFixed(0)} JOD شهرياً يصنع فارقاً.`,
          168)
      }
    }

    // ── 6. تنبيهات المعاملات ────────────────────────
    // أسبوعي: الأحد — لا معاملات
    if (dayOfWeek === 0) {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const { count } = await supabase
        .from('transactions').select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('transaction_date', weekAgo.toISOString().split('T')[0])

      if ((count ?? 0) === 0) {
        await pushAlert(toInsert, uid, 'reminder',
          '⏰ لم تسجل أي معاملات هذا الأسبوع',
          'سجّل مصاريفك بانتظام — التتبع اليومي هو أقوى أداة للوعي المالي.',
          168)
      }
    }

    // ── 7. تحفيز ذكي (مرة يومياً فقط) ─────────────
    const motivations = [
      { title: '💪 خطوة صغيرة تصنع فارقاً كبيراً', message: `يا ${name}، كل دينار تدخره اليوم هو استثمار في حريتك المالية غداً.` },
      { title: '🌟 الانضباط المالي عادة لا موهبة', message: 'الأثرياء لم يولدوا بمال أكثر — بنوا عادات يومية صغيرة جعلتهم يختلفون.' },
      { title: '📊 راجع ميزانيتك الأسبوع القادم', message: 'خصص 10 دقائق أسبوعياً لمراجعة المصاريف — ستدهشك التحسينات خلال شهر.' },
      { title: '🏦 الادخار أولاً قبل الإنفاق', message: 'قاعدة الـ 20%: ادخر أول 20% من راتبك قبل أي إنفاق. ما تبقى هو ميزانيتك.' },
      { title: '⚡ الطريق إلى الحرية المالية واضح', message: `سداد الديون → بناء صندوق طوارئ → استثمار منتظم. أنت تسير على الطريق الصحيح يا ${name}.` },
      { title: '🎯 هدف واحد كل شهر يغير حياتك', message: 'ركّز على هدف مالي واحد هذا الشهر بدلاً من عشرة أهداف. التركيز هو السر.' },
      { title: '💡 المعرفة المالية هي أفضل استثمار', message: 'كل دقيقة تقضيها في تتبع مالك تساوي أضعافها على المدى البعيد.' },
    ]

    // اختر رسالة تحفيز غير مكررة
    for (const mot of motivations) {
      const exists = await alreadyExists(uid, mot.title, 20)
      if (!exists) {
        toInsert.push({ user_id: uid, type: 'motivation', title: mot.title, message: mot.message, frequency: 'daily', is_read: false, is_active: true })
        break
      }
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('alerts').insert(toInsert)

    // Push Notification لكل مستخدم
    const byUser = new Map<string, typeof toInsert>()
    for (const a of toInsert) {
      const uid = a.user_id as string
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push(a)
    }
    for (const [uid, list] of byUser) {
      const title = list.length === 1 ? String(list[0].title) : `🔔 ${list.length} تنبيهات جديدة`
      const message = list.length === 1 ? String(list[0].message).slice(0, 100) : list.map(a => String(a.title)).join(' • ').slice(0, 100)
      await sendPushToUser(uid, title, message, '/dashboard/alerts', 'finance-daily')
    }
  }

  return toInsert.length
}

// ===== GET: Vercel Cron =====
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await generateAlerts()
  return NextResponse.json({ ok: true, generated: count })
}

// ===== POST: يدوي من الصفحة =====
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const count = await generateAlerts(user.id)
    return NextResponse.json({
      ok: true,
      generated: count,
      message: count > 0 ? `✅ تم توليد ${count} تنبيه جديد` : 'ℹ️ لا تنبيهات جديدة — كل شيء محدّث'
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
