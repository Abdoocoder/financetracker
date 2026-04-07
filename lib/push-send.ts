import { createAdminClient } from '@/lib/supabase/admin'

let _supabase: ReturnType<typeof createAdminClient> | null = null
function getSupabase() {
  if (!_supabase) _supabase = createAdminClient()
  return _supabase
}

const TAG_TO_CATEGORY: Record<string, string> = {
  morning:           'SystemUpdate',
  evening:           'SystemUpdate',
  weekly:            'SystemUpdate',
  nudge:             'SystemUpdate',
  lesson:            'SystemUpdate',
  wealth:            'SystemUpdate',
  warning:           'BudgetAlert',
  budget:            'BudgetAlert',
  debt:              'DebtReminder',
  'debt-reminder':   'DebtReminder',
  'debt-auto':       'DebtReminder',
  'debt-paid':       'DebtReminder',
  'receivable-debt': 'DebtReminder',
  goal:              'SavingGoal',
  achievement:       'SavingGoal',
  'finance-daily':   'SystemUpdate',
  security:          'SecurityAlert',
}

function toCategory(tag: string): string {
  return TAG_TO_CATEGORY[tag] ?? 'SystemUpdate'
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
  url = '/dashboard/alerts',
  tag = 'finance-alert',
  supabaseClient?: any,
  customFingerprint?: string
) {
  const supabase = supabaseClient || getSupabase()

  // fingerprint يومي افتراضي — أو مخصص لمطابقة DB Trigger
  const fingerprint = customFingerprint
    ?? `${userId}:${tag}:${new Date().toISOString().slice(0, 10)}`

  const { error } = await supabase.from('notification_history').insert({
    user_id:     userId,
    category:    toCategory(tag),
    title,
    body:        message,
    data:        { url, tag },
    fingerprint,
  })

  if (error) {
    if (error.code === '23505') return 0 // مكرر — تجاهل بصمت
    console.error('[push-send] notification_history insert error:', error.message)
    return 0
  }

  return 1
}
