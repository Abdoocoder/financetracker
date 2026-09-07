import { createAdminClient } from '@/lib/supabase/admin'

let _supabase: ReturnType<typeof createAdminClient> | null = null
function getSupabase() {
  if (!_supabase) _supabase = createAdminClient()
  return _supabase
}

/**
 * خريطة الـ tags إلى تصنيفات قاعدة البيانات.
 * يستخدمها كل من:
 *   - notification_history (للإرسال)
 *   - Edge Function (لتحديد قواعد الإرسال والفلترة)
 */
const TAG_TO_CATEGORY: Record<string, string> = {
  // ── تذكيرات يومية عامة ─────────────────────────────
  morning:             'SystemUpdate',
  evening:             'SystemUpdate',
  weekly:              'SystemUpdate',
  nudge:               'SystemUpdate',
  lesson:              'SystemUpdate',
  wealth:              'SystemUpdate',
  'finance-daily':     'SystemUpdate',
  'daily-reminder':    'SystemUpdate',
  'evening-reminder':  'SystemUpdate',
  'new-user-nudge':    'SystemUpdate',
  'finance-alert':     'SystemUpdate',
  'streak-alert':      'SystemUpdate',

  // ── تنبيهات الميزانية ──────────────────────────────
  warning:             'BudgetAlert',
  budget:              'BudgetAlert',
  'budget-warning':    'BudgetAlert',

  // ── الديون والأقساط ────────────────────────────────
  debt:                'DebtReminder',
  'debt-reminder':     'DebtReminder',
  'debt-auto':         'DebtReminder',
  'debt-paid':         'DebtReminder',
  'receivable-debt':   'DebtReminder',

  // ── الزكاة ─────────────────────────────────────────
  'zakat-due':         'ZakatAlert',
  'zakat-reminder':    'ZakatAlert',

  // ── أهداف الادخار ──────────────────────────────────
  goal:                'SavingGoal',
  achievement:         'SavingGoal',
  'goal-reached':      'SavingGoal',
  'goal-progress':     'SavingGoal',

  // ── الأمان ─────────────────────────────────────────
  security:            'SecurityAlert',
}

/**
 * الروابط الافتراضية لكل تصنيف — تستخدم عند عدم تحديد URL صريح.
 */
const CATEGORY_DEFAULT_URL: Record<string, string> = {
  BudgetAlert:   '/dashboard/budgets',
  DebtReminder:  '/dashboard/debts',
  ZakatAlert:    '/dashboard/zakat',
  SavingGoal:    '/dashboard/goals',
  SecurityAlert: '/dashboard/settings',
  SystemUpdate:  '/dashboard/alerts',
}

function toCategory(tag: string): string {
  return TAG_TO_CATEGORY[tag] ?? 'SystemUpdate'
}

/**
 * Returns the current minutes-of-day (0–1439) for `date` in an IANA `timeZone`.
 * Dependency-free: uses Intl.DateTimeFormat. Falls back to 0 on parse failure.
 */
export function getHHMMInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour   = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

/**
 * Quiet-hours check. `quietStart`/`quietEnd` are "HH:MM" local wall-clock times
 * stored as `time without time zone`. Overnight windows (start > end) wrap.
 * The window is end-exclusive (`now === quietEnd` is NOT quiet).
 */
export function isInQuietHours(quietStart: string, quietEnd: string, nowHHMM: number): boolean {
  const [sh, sm] = quietStart.split(':').map(Number)
  const [eh, em] = quietEnd.split(':').map(Number)
  const start = sh * 60 + sm
  const end   = eh * 60 + em
  return start <= end
    ? nowHHMM >= start && nowHHMM < end
    : nowHHMM >= start || nowHHMM < end
}

/**
 * المدخل الوحيد لإرسال الإشعارات.
 * يكتب في notification_history فقط — Edge Function تتولى الإرسال الفعلي
 * (FCM + Web Push) والكتابة في alerts.
 * الـ UNIQUE index على fingerprint يمنع التكرار تلقائياً.
 *
 * customFingerprint: اختياري — يُستخدم لمطابقة fingerprint DB Trigger
 * (مثل تنبيهات الميزانية) لمنع إرسال مكرر بين CRON والـ trigger.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url?: string,
  tag = 'finance-alert',
  supabaseClient?: any,
  customFingerprint?: string
) {
  const supabase = supabaseClient || getSupabase()
  const category = toCategory(tag)

  // fingerprint يومي افتراضي — أو مخصص لمطابقة DB Trigger
  const fingerprint = customFingerprint
    ?? `${userId}:${tag}:${new Date().toISOString().slice(0, 10)}`

  const finalUrl = url || CATEGORY_DEFAULT_URL[category] || '/dashboard/alerts'

  // فحص مسبق للـ fingerprint قبل insert — يمنع رحلة insert فاشلة
  // (23505) عندما يكون الإشعار قد أُرسل اليوم بالفعل. الـ UNIQUE index
  // يبقى الحارس النهائي ضد حالات السباق.
  const { count, error: dedupeError } = await supabase
    .from('notification_history')
    .select('id', { count: 'exact', head: true })
    .eq('fingerprint', fingerprint)

  if (!dedupeError && count) return 0 // مكرر — أُرسل اليوم بالفعل

  const { error } = await supabase.from('notification_history').insert({
    user_id:     userId,
    category,
    title,
    body:        message,
    data:        { url: finalUrl, tag },
    fingerprint,
  })

  if (error) {
    if (error.code === '23505') return 0 // مكرر — تجاهل بصمت
    console.error('[push-send] notification_history insert error:', error.message)
    return 0
  }

  return 1
}
