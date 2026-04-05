# الوثيقة التقنية: نظام الاشعارات والتنبيهات
## التصميم التحويلي الشامل - Version 1.0

---

## 1. نظرة عامة على التصميم

### 1.1 المبادئ التوجيهية

| المبدأ | الوصف |
|--------|-------|
| **التمييز** | فصل صارم بين الإشعارات والتنبيهات |
| **التخصيص** | تحكم كامل للمستخدم في كل نوع |
| **الأداء** | minimal background processing |
| **قابلية التوسع** | إضافة types جديدة بدون refactoring |
| **الأمان** | respect privacy + rate limiting |

### 1.2 المكونات الأساسية

```
┌─────────────────────────────────────────────────────────────────┐
│                     Architecture Overview                      │
├─────────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   Triggers   │───▶│ Notification │───▶│   Channels   │   │
│  │   Engine    │    │    Service   │    │   Manager    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │  Rules DB    │    │  Settings   │    │  Providers  │   │
│  │ (Triggers)  │    │   Store     │    │ (FCM/APNs)  │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. إعدادات تخصيص الإشعارات

### 2.1 تعريف أنواع الإشعارات

```typescript
// types/notification.ts

export enum NotificationType {
  BUDGET = 'budget',           // تجاوز الميزانية
  DEBT = 'debt',               // ديون ومosporمولات
  GOAL = 'goal',               // أهداف ادخار
  TRANSACTION = 'transaction', // معاملات
  REMINDER = 'reminder',       // تذكيرات
  ACHIEVEMENT = 'achievement',   // إنجازات
  REPORT = 'report',           // تقارير دورية
  NEWS = 'news',              // أخبار
  SYSTEM = 'system'           // نظام
}

export enum NotificationPriority {
  LOW = 0,    // غير عاجل
  NORMAL = 1, // افتراضي
  HIGH = 2,   // مهم
  URGENT = 3,  // عاجل
}

export enum NotificationChannel {
  BUDGET_ALERTS = 'budget_alerts',
  DEBT_ALERTS = 'debt_alerts',
  GOAL_ALERTS = 'goal_alerts',
  REMINDERS = 'reminders',
  ACHIEVEMENTS = 'achievements',
  REPORTS = 'reports',
  NEWS = 'news',
  SYSTEM_ALERTS = 'system_alerts',
}

export interface NotificationSettings {
  userId: string;
  
  // الإعدادات الأساسية
  enabled: boolean;
  types: Partial<Record<NotificationType, TypeSettings>>;
  
  // أوقات الصمت
  quietHours: QuietHoursSettings | null;
  quietDays: number[]; // 0=Sunday
  
  // قيود المعدل
  rateLimit: RateLimitSettings;
  
  // التوارث العائلي
  familySettings: FamilySettings | null;
  
  updatedAt: Date;
  version: number;
}

export interface TypeSettings {
  enabled: boolean;
  priority: NotificationPriority;
  frequency: FrequencyType;
  
  // حدود مخصصة
  thresholds?: {
    budget?: number;      // 50-100% default 80
    debtDays?: number;   // أيام قبل الاستحقاق
    goalPercent?: number; // 0-100 default 100
  };
  
  // زمن التأخير
  delayMinutes: number;
  
  // قنات محددة (للتعيين اليدوي)
  channel?: NotificationChannel;
  
  // تفعيل AI
  aiGenerated: boolean;
}

export interface QuietHoursSettings {
  enabled: boolean;
  start: string; // "HH:mm" 24-hour format
  end: string;
  timezone: string;
}

export interface RateLimitSettings {
  maxPerHour: number;
  maxPerDay: number;
  maxPerTypePerDay: number;
  cooldownMinutes: number;
}

export interface FamilySettings {
  mode: 'inherit' | 'split' | 'custom';
  parentUserId?: string;
  childSettings?: Record<string, TypeSettings>;
}
```

### 2.2 Structure قاعدة البيانات

```sql
-- migrations/notification_settings.sql

-- جدول إعدادات الإشعارات للمستخدمين
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- الإعدادات الأساسية
  enabled BOOLEAN DEFAULT true,
  
  -- أوقات الصمت (JSONB للمرونة)
  quiet_hours JSONB DEFAULT NULL,
  quiet_days INTEGER[] DEFAULT '{}',
  
  -- قيود المعدل
  rate_limit JSONB DEFAULT '{"maxPerHour": 10, "maxPerDay": 50, "maxPerTypePerDay": 5, "cooldownMinutes": 15}',
  
  -- التوارث العائلي
  family_settings JSONB DEFAULT NULL,
  
  -- أنواع الإشعارات (JSONB للـ schemas مختلفة لكل نوع)
  types JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- تفعيل RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification settings"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id);
```

### 2.3 واجهة برمجة التطبيقات API

```typescript
// api/notifications/settings.ts

/**
 * GET /api/notifications/settings
 * الاستجابة: إعدادات الإشعارات الحالية للمستخدم
 */
interface GetSettingsResponse {
  success: boolean;
  data: NotificationSettings;
}

/**
 * PATCH /api/notifications/settings
 * الطلب: إعدادات محدثة
 */
interface UpdateSettingsRequest {
  enabled?: boolean;
  types?: Partial<Record<NotificationType, TypeSettings>>;
  quietHours?: QuietHoursSettings | null;
  quietDays?: number[];
  rateLimit?: RateLimitSettings;
  familySettings?: FamilySettings | null;
}

interface UpdateSettingsResponse {
  success: boolean;
  data: NotificationSettings;
  version: number;
}

/**
 * POST /api/notifications/settings/reset
 * إعادة الإعدادات للافتراضي
 */
interface ResetSettingsResponse {
  success: boolean;
}
```

### 2.4 пример الطلب والاستجابة

```json
// GET /api/notifications/settings
// Response:
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "enabled": true,
    "types": {
      "budget": {
        "enabled": true,
        "priority": "NORMAL",
        "frequency": "instant",
        "thresholds": {
          "budget": 80
        },
        "delayMinutes": 0,
        "channel": "BUDGET_ALERTS",
        "aiGenerated": false
      },
      "debt": {
        "enabled": true,
        "priority": "HIGH",
        "frequency": "instant",
        "thresholds": {
          "debtDays": 7
        },
        "delayMinutes": 0,
        "channel": "DEBT_ALERTS",
        "aiGenerated": false
      },
      "goal": {
        "enabled": true,
        "priority": "NORMAL",
        "frequency": "instant",
        "thresholds": {
          "goalPercent": 100
        },
        "delayMinutes": 0,
        "aiGenerated": false
      },
      "reminder": {
        "enabled": true,
        "priority": "NORMAL",
        "frequency": "daily_digest",
        "delayMinutes": 480,
        "aiGenerated": false
      }
    },
    "quietHours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00",
      "timezone": "Asia/Riyadh"
    },
    "quietDays": [5, 6],
    "rateLimit": {
      "maxPerHour": 10,
      "maxPerDay": 50,
      "maxPerTypePerDay": 5,
      "cooldownMinutes": 15
    },
    "familySettings": null,
    "updatedAt": "2026-04-05T10:00:00Z",
    "version": 3
  }
}
```

---

## 3. إشعارات تلقائية (Trigger-based)

### 3.1 تعريف أحداث الاستشعار

```typescript
// types/triggers.ts

export interface Trigger {
  id: string;
  name: string;
  type: NotificationType;
  
  // مصدر الحدث
  source: TriggerSource;
  
  // شروط الاستدعاء
  conditions: TriggerConditions;
  
  // سلوك الإشعار
  action: TriggerAction;
  
  // سياسات التكرار
  repeatPolicy: RepeatPolicy;
  
  // الحالات
  enabled: boolean;
  lastTriggered: Date | null;
  createdAt: Date;
}

export type TriggerSource = 
  | 'budget_exceeded'      // تجاوز الميزانية
  | 'budget_approaching'  // اقتراب الميزانية (80%+)
  | 'debt_due_soon'       // استحقاق قسط قريب
  | 'debt_overdue'       // قسط متأخر
  | 'goal_reached'        // بلوغ هدف
  | 'goal_milestone'     // مرحلة مهمة
  | 'transaction_large'  // معاملة كبيرة
  | 'recurring_due'     // معاملة متكررة مستحقة
  | 'category_limit'     // تجاوز فئة
  | 'balance_low'        // رصيد منخفض
  | 'savings_target'     // هدف ادخار
  | 'zakat_due'          // زكاة مستحقة
  | 'custom';            // مخصص

export interface TriggerConditions {
  // للشروط الرقمية
  threshold?: number;
  thresholdType?: 'absolute' | 'percentage';
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  
  // للشروط الزمنية
  dateField?: string;
  daysBefore?: number;
  daysAfter?: number;
  
  // للشروط النصية
  category?: string;
  tags?: string[];
  
  // شروط مركبة (JSON Logic)
  expression?: string;
}

export interface TriggerAction {
  // نوع الإشعار
  type: NotificationType;
  priority: NotificationPriority;
  
  // محتوى الإشعار
  titleTemplate: string;
  bodyTemplate: string;
  data?: Record<string, any>;
  
  // خيارات الإرسال
  sendMode: 'immediate' | 'scheduled' | 'dashboard_only';
  scheduledTime?: string;
  
  // rich notification
  imageUrl?: string;
  actions?: NotificationAction[];
}

export interface RepeatPolicy {
  // نوع التكرار
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  
  // حدود التكرار
  maxRepeats?: number;
  repeatInterval?: number; // بالدقائق
  
  // أيام الأسبوع (للأسبوعي)
  daysOfWeek?: number[];
  
  // أيام الشهر (للشهري)
  daysOfMonth?: number[];
  
  //silence period
  silenceAfterTrigger: boolean;
  silenceMinutes?: number;
}

export interface NotificationAction {
  id: string;
  title: string;
  type: 'action' | 'input';
  icon?: string;
  draftId?: string;
}
```

### 3.2 محركات الاستشعار

```typescript
// services/trigger_engine.ts

export class TriggerEngine {
  private rules: Trigger[];
  private settings: Map<string, NotificationSettings>;
  
  async initialize(): Promise<void> {
    // تحميل القواعد من قاعدة البيانات
    await this.loadRules();
    
    // بدء مستمع الأحداث
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // مستمع معاملات جديدة
    Supabase.channel('transactions')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions'
      }, (payload) => this.handleTransaction(payload))
      .subscribe();
    
    // مستمع تعديلات الميزانية
    Supabase.channel('budgets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budget_months'
      }, (payload) => this.handleBudgetUpdate(payload))
      .subscribe();
    
    // مستمع الديون
    Supabase.channel('debts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'debts'
      }, (payload) => this.handleDebtUpdate(payload))
      .subscribe();
    
    // مستمع الأهداف
    Supabase.channel('goals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'goals'
      }, (payload) => this.handleGoalUpdate(payload))
      .subscribe();
  }
  
  async handleTransaction(payload: any): Promise<void> {
    const txn = payload.new;
    const userId = txn.user_id;
    const settings = await this.getSettings(userId);
    
    if (!settings?.types[NotificationType.TRANSACTION]?.enabled) return;
    
    // فحص تجاوز الميزانية
    const budgetCheck = await this.checkBudgetThreshold(userId, txn);
    if (budgetCheck.exceeded) {
      await this.trigger('budget_exceeded', userId, {
        ...budgetCheck,
        transaction: txn
      });
    }
    
    // فحص المعاملات الكبيرة
    if (txn.amount > settings.largeTransactionThreshold) {
      await this.trigger('transaction_large', userId, { transaction: txn });
    }
  }
  
  async checkBudgetThreshold(
    userId: string, 
    transaction: Transaction
  ): Promise<BudgetCheckResult> {
    const budget = await Supabase.client
      .from('budget_months')
      .select('*')
      .eq('user_id', userId)
      .eq('month', transaction.month)
      .eq('year', transaction.year)
      .single();
    
    if (!budget) return { exceeded: false, percentage: 0 };
    
    const spent = budget.spent || 0;
    const total = budget.total || 1;
    const percentage = (spent / total) * 100;
    
    const typeSetting = await this.getTypeSettings(userId, 'budget');
    const threshold = typeSetting?.thresholds?.budget ?? 80;
    
    return {
      exceeded: percentage >= 100,
      approaching: percentage >= threshold,
      percentage,
      remaining: total - spent,
      budget
    };
  }
  
  async trigger(
    source: TriggerSource, 
    userId: string, 
    context: Record<string, any>
  ): Promise<void> {
    // فحص_RATE_LIMIT
    if (await this.isRateLimited(userId, source)) return;
    
    // فحص أوقات الصمت
    if (await this.isQuietHours(userId)) return;
    
    // فحص نوع الإشعار مفعل
    const type = this.sourceToType(source);
    const typeSettings = await this.getTypeSettings(userId, type);
    if (!typeSettings?.enabled) return;
    
    // تنفيذ الإشعار
    await this.notificationService.send({
      type,
      priority: typeSettings.priority,
      userId,
      title: this.renderTemplate(typeSettings.titleTemplate, context),
      body: this.renderTemplate(typeSettings.bodyTemplate, context),
      data: context,
      channel: typeSettings.channel
    });
  }
}
```

### 3.3 سياسات التكرار

```typescript
// services/repeat_policy.ts

export class RepeatPolicyEngine {
  async shouldShow(
    userId: string,
    trigger: Trigger,
    context: Record<string, any>
  ): Promise<boolean> {
    if (!trigger.repeatPolicy || trigger.repeatPolicy.type === 'none') {
      return true;
    }
    
    const lastTriggered = trigger.lastTriggered;
    if (!lastTriggered) return true;
    
    const policy = trigger.repeatPolicy;
    const now = new Date();
    const lastTime = new Date(lastTriggered);
    
    // فحص الحد الأقصى
    if (policy.maxRepeats !== undefined) {
      const count = await this.getTriggerCount(trigger.id, userId);
      if (count >= policy.maxRepeats) return false;
    }
    
    // فحص الفاصل
    if (policy.repeatInterval) {
      const diffMinutes = (now.getTime() - lastTime.getTime()) / 60000;
      if (diffMinutes < policy.repeatInterval) return false;
    }
    
    // فحص النوع
    switch (policy.type) {
      case 'daily':
        return lastTime.toDateString() !== now.toDateString();
        
      case 'weekly':
        return this.isDifferentWeek(lastTime, now);
        
      case 'monthly':
        return lastTime.getMonth() !== now.getMonth() ||
               lastTime.getFullYear() !== now.getFullYear();
        
      case 'custom':
        return this.evaluateCustomPolicy(policy, lastTime, now);
    }
    
    return true;
  }
  
  private async isRateLimited(
    userId: string, 
    source: string
  ): Promise<boolean> {
    const settings = await this.getSettings(userId);
    const rateLimit = settings.rateLimit;
    
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);
    
    const hourlyCount = await this.getNotificationCount(
      userId, source, hourAgo
    );
    if (hourlyCount >= rateLimit.maxPerHour) return true;
    
    const dailyCount = await this.getNotificationCount(
      userId, source, dayAgo
    );
    if (dailyCount >= rateLimit.maxPerDay) return true;
    
    return false;
  }
  
  private async isQuietHours(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId);
    if (!settings.quietHours?.enabled) return false;
    
    const now = new Date();
    const tz = settings.quietHours.timezone || 'Asia/Riyadh';
    
    const currentTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    const [startH, startM] = settings.quietHours.start.split(':').map(Number);
    const [endH, endM] = settings.quietHours.end.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    // يتجاوز منتصف الليل
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}
```

---

## 4. تحسين Notification Service

### 4.1 أنواع الإشعارات الغنية

```typescript
// types/rich_notification.ts

export interface RichNotification {
  // المعرفات
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  
  // المستلم
  userId: string;
  deviceTokens?: string[];
  
  // المحتوى
  title: string;
  titleLocalization?: LocalizationMap;
  body: string;
  bodyLocalization?: LocalizationMap;
  
  // Rich content
  imageUrl?: string;
  imageAlignment?: 'top' | 'bottom';
  iconUrl?: string;
  
  // الإجراءات
  actions?: NotificationAction[];
  category: string;
  
  // التنقل
  deepLink?: string;
  webLink?: string;
  
  // البيانات
  data: Record<string, any>;
  payload: string;
  
  // Android
  android: AndroidNotificationConfig;
  
  // iOS
  ios: IOSNotificationConfig;
  
  // التوقيت
  timestamp: Date;
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // dedup
  deduplicationId?: string;
  correlationId?: string;
}

export interface AndroidNotificationConfig {
  channelId: string;
  channelName: string;
  channelDescription?: string;
  
  // العرض
  priority: AndroidPriority;
  visibility: AndroidVisibility;
  ongoing: boolean;
  autoCancel: boolean;
  allowWhileIdle: boolean;
  
  //الصوت والاهتزاز
  sound?: string;
  soundName?: string;
  vibratePattern?: number[];
  
  // الأيقونة
  icon?: string;
  color?: string;
  ledColor?: string;
  
  // الإجراءات
  usesChronometer: boolean;
  showWhen: boolean;
  timeoutAfter?: number;
  
  //_expandable
  style?: AndroidStyle;
  bigText?: string;
  bigPictureUrl?: string;
  
  // progress
  progress?: {
    current: number;
    max: number;
    indeterminate: boolean;
  };
  
  // actions
  shortcutId?: string;
}

export type AndroidPriority = 'min' | 'low' | 'default' | 'high' | 'max';
export type AndroidVisibility = 'private' | 'public' | 'secret';
export type AndroidStyle = 'bigText' | 'bigPicture' | 'inbox' | 'media';

export interface IOSNotificationConfig {
  // الصوت
  sound?: string;
  soundName?: { critical: number; name: string; volume: number };
  
  //العرض
  threadId?: string;
  categoryId?: string;
  
  // التدخل
  interruptionLevel: IOSInterruptionLevel;
  relevanceScore?: number;
  
  //_targets
  targetContentId?: string;
  
  //_launch
  launchImageName?: string;
  launchThreadId?: string;
}

export type IOSInterruptionLevel = 
  | 'passive' 
  | 'active' 
  | 'timeSensitive' 
  | 'critical';
```

### 4.2 Notification Categories

```typescript
// services/notification_categories.ts

export const NOTIFICATION_CATEGORIES: Record<string, CategoryConfig> = {
  // تنبيهات الميزانية
  BUDGET_ALERT: {
    id: 'BUDGET_ALERT',
    name: 'Budget Alerts',
    description: 'Budget threshold warnings',
    actions: [
      { id: 'view_budget', title: 'View Budget', type: 'action' },
      { id: 'dismiss', title: 'Dismiss', type: 'action' }
    ],
    iosThreadId: 'budget',
    androidChannel: 'budget_alerts'
  },
  
  // تنبيهات الديون
  DEBT_ALERT: {
    id: 'DEBT_ALERT',
    name: 'Debt Alerts',
    description: 'Debt payment reminders',
    actions: [
      { id: 'view_debt', title: 'View Debt', type: 'action' },
      { id: 'mark_paid', title: 'Mark Paid', type: 'action' },
      { id: 'snooze', title: 'Snooze', type: 'action' }
    ],
    iosThreadId: 'debt',
    androidChannel: 'debt_alerts'
  },
  
  // إنجازات
  ACHIEVEMENT: {
    id: 'ACHIEVEMENT',
    name: 'Achievements',
    description: 'Goalcompletion celebrations',
    actions: [
      { id: 'share', title: 'Share', type: 'action' },
      { id: 'view_goal', title: 'View Goal', type: 'action' }
    ],
    iosThreadId: 'achievement',
    androidChannel: 'achievements'
  },
  
  // تذكيرات
  REMINDER: {
    id: 'REMINDER',
    name: 'Reminders',
    description: 'Scheduled reminders',
    actions: [
      { id: 'complete', title: 'Mark Complete', type: 'action' },
      { id: 'snooze', title: 'Snooze', type: 'action' }
    ],
    iosThreadId: 'reminder',
    androidChannel: 'reminders'
  },
  
  // تقارير
  REPORT: {
    id: 'REPORT',
    name: 'Reports',
    description: 'Periodic reports',
    actions: [
      { id: 'view_report', title: 'View Report', type: 'action' }
    ],
    iosThreadId: 'report',
    androidChannel: 'reports'
  }
};

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  actions: NotificationAction[];
  iosThreadId: string;
  androidChannel: string;
}
```

### 4.3 خدمة الإشعارات المحسنة

```typescript
// services/notification_service_v2.ts

export class NotificationServiceV2 {
  private fcm: FirebaseMessaging;
  private local: FlutterLocalNotificationsPlugin;
  private categories: Map<string, CategoryConfig>;
  private channels: Map<NotificationChannel, ChannelConfig>;
  
  async initialize(): Promise<void> {
    // تهيئة FCM
    this.fcm = FirebaseMessaging.instance;
    
    // تهيئة الإشعارات المحلية
    await this.initializeLocalNotifications();
    
    // إنشاء القنوات
    await this.createChannels();
    
    // تسجيل categories
    await this.registerCategories();
    
    // تفعيل handling الإجراءات
    this.setupActionHandlers();
    
    // تفعيل handling الـ foreground
    this.setupForegroundHandler();
  }
  
  private async initializeLocalNotifications(): Promise<void> {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      defaultPresent: true,
      defaultSound: true,
      defaultBadge: true
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings
    );
    
    await this.local.initialize(
      initSettings,
      onDidReceiveNotificationResponse: this.handleNotificationResponse,
      onDidReceiveBackgroundNotificationResponse: this.handleBackgroundResponse
    );
  }
  
  private async createChannels(): Promise<void> {
    for (const [id, config] of Object.entries(CHANNEL_CONFIGS)) {
      const androidChannel = new AndroidNotificationChannel(
        config.id,
        config.name,
        description: config.description,
        importance: this.priorityToImportance(config.defaultPriority),
        playSound: config.soundEnabled,
        enableVibration: config.vibrationEnabled,
        group id: config.groupId
      );
      
      await this.local
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);
    }
  }
  
  async send(notification: RichNotification): Promise<SendResult> {
    // 1. التحقق من الإعدادات
    const settings = await this.getUserSettings(notification.userId);
    if (!settings?.enabled) {
      return { success: false, reason: 'disabled' };
    }
    
    const typeSettings = settings.types[notification.type];
    if (!typeSettings?.enabled) {
      return { success: false, reason: 'type_disabled' };
    }
    
    // 2. التحقق من_rate limit
    if (await this.isRateLimited(notification.userId, notification.type)) {
      return { success: false, reason: 'rate_limited' };
    }
    
    // 3. التحقق منquiet hours
    if (await this.isInQuietHours(notification.userId)) {
      // جدولة للإرسال لاحقاً
      await this.scheduleNotification(notification);
      return { success: true, scheduled: true };
    }
    
    // 4. بناء الإشعار
    const fcmPayload = await this.buildFCMPayload(notification, typeSettings);
    const localPayload = await this.buildLocalPayload(notification, typeSettings);
    
    // 5. الإرسال
    const results = await Promise.allSettled([
      // FCM (للتerminated/background)
      this.sendFCM(notification.userId, fcmPayload),
      // Local (للـ foreground)
      this.showLocal(notification, localPayload)
    ]);
    
    // 6. تسجيل الإشعار
    await this.logNotification(notification);
    
    return { 
      success: results.every(r => r.status === 'fulfilled'),
      notificationId: notification.id 
    };
  }
  
  private async buildFCMPayload(
    notification: RichNotification,
    typeSettings: TypeSettings
  ): Promise<Message> {
    return {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl
      },
      android: {
        priority: this.priorityToFCMPriority(typeSettings.priority),
        notification: {
          channel_id: notification.channel,
          notification: {
            title: notification.title,
            body: notification.body,
            image: notification.imageUrl,
            event_timestamp: notification.timestamp.toISOString()
          }
        },
        fcm_options: {
          analytics_label: `notification_${notification.type}`
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            'mutable-content': 1,
            'category': notification.category,
            'thread-id': notification.ios?.threadId,
            'interruption-level': this.interruptionLevel(notification.priority)
          }
        }
      },
      data: notification.data,
      token: await this.getUserTokens(notification.userId)
    };
  }
  
  private async buildLocalPayload(
    notification: RichNotification,
    typeSettings: TypeSettings
  ): Promise<NotificationData> {
    const androidDetails = AndroidNotificationDetails(
      notification.channel,
      CHANNEL_CONFIGS[notification.channel]?.name || 'Notifications',
      channelDescription: CHANNEL_CONFIGS[notification.channel]?.description,
      importance: this.priorityToImportance(typeSettings.priority),
      priority: this.priorityToAndroidPriority(typeSettings.priority),
      icon: '@mipmap/ic_launcher',
      color: typeSettings.color,
      enableVibration: typeSettings.vibrationEnabled,
      sound: typeSettings.soundEnabled ? 'default' : null,
      style: BigTextStyle(notification.body),
      actions: notification.actions?.map(a => AndroidNotificationAction(a.id, a.title))
    );
    
    return {
      id: notification.id.hashCode,
      title: notification.title,
      body: notification.body,
      android: androidDetails,
      payload: JSON.stringify(notification.data)
    };
  }
}
```

### 4.4 Channel Configurations

```typescript
// config/channels.ts

export const CHANNEL_CONFIGS: Record<NotificationChannel, ChannelConfig> = {
  [NotificationChannel.BUDGET_ALERTS]: {
    id: 'budget_alerts',
    name: 'ميزانية',
    description: 'تنبيهات تجاوز الميزانية',
    defaultPriority: NotificationPriority.HIGH,
    soundEnabled: true,
    vibrationEnabled: true,
    groupId: 'budget',
    lightsEnabled: true,
    lightColor: '#F59E0B'
  },
  
  [NotificationChannel.DEBT_ALERTS]: {
    id: 'debt_alerts',
    name: 'الديون',
    description: 'مواعيد استحقاق الديون',
    defaultPriority: NotificationPriority.HIGH,
    soundEnabled: true,
    vibrationEnabled: true,
    groupId: 'debt',
    lightsEnabled: true,
    lightColor: '#EF4444'
  },
  
  [NotificationChannel.GOAL_ALERTS]: {
    id: 'goal_alerts',
    name: 'أهداف الادخار',
    description: 'أهداف الادخار والملاحظات',
    defaultPriority: NotificationPriority.NORMAL,
    soundEnabled: true,
    vibrationEnabled: false,
    groupId: 'goals',
    lightsEnabled: false
  },
  
  [NotificationChannel.REMINDERS]: {
    id: 'reminders',
    name: 'التذكيرات',
    description: 'تذكيرات المعاملات المتكررة',
    defaultPriority: NotificationPriority.NORMAL,
    soundEnabled: true,
    vibrationEnabled: false,
    groupId: 'reminders',
    lightsEnabled: false
  },
  
  [NotificationChannel.ACHIEVEMENTS]: {
    id: 'achievements',
    name: 'الإنجازات',
    description: 'الاحتفال بالإنجازات',
    defaultPriority: NotificationPriority.LOW,
    soundEnabled: true,
    vibrationEnabled: true,
    groupId: 'achievements',
    lightsEnabled: true,
    lightColor: '#10B981'
  },
  
  [NotificationChannel.REPORTS]: {
    id: 'reports',
    name: 'التقارير',
    description: 'التقارير الدورية',
    defaultPriority: NotificationPriority.LOW,
    soundEnabled: false,
    vibrationEnabled: false,
    groupId: 'reports',
    lightsEnabled: false
  },
  
  [NotificationChannel.NEWS]: {
    id: 'news',
    name: 'الأخبار',
    description: 'أخبار وتحديثات التطبيق',
    defaultPriority: NotificationPriority.LOW,
    soundEnabled: false,
    vibrationEnabled: false,
    groupId: 'news',
    lightsEnabled: false
  },
  
  [NotificationChannel.SYSTEM_ALERTS]: {
    id: 'system_alerts',
    name: 'النظام',
    description: 'إشعارات النظام',
    defaultPriority: NotificationPriority.NORMAL,
    soundEnabled: true,
    vibrationEnabled: true,
    groupId: 'system',
    lightsEnabled: true,
    lightColor: '#3B82F6'
  }
};

export interface ChannelConfig {
  id: string;
  name: string;
  description: string;
  defaultPriority: NotificationPriority;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  groupId: string;
  lightsEnabled: boolean;
  lightColor?: string;
}
```

---

## 5. هندسة التكامل والواجهات

### 5.1 مخطط التدفق

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Event Flow Diagram                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                              │
│  TRIGGER EVENT                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Trigger   │───▶│   Rules     │───▶│  Conditions │          │
│  │   Source    │    │   Engine    │    │   Check    │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                │            │
│                                                ▼            │
│                                    ┌─────────────────────┐  │
│                                    │  Rate Limit Check   │  │
│                                    │  Quiet Hours Check │  │
│                                    │  User Settings     │  │
│                                    └─────────────────────┘  │
│                                               │            │
│                                               ▼            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Notification Builder                    │        │
│  │  - Render templates                                │        │
│  │  - Build rich content                              │        │
│  │  - Determine channel                           │        │
│  │  - Check deduplication                          │        │
│  └─────────────────────────────────────────────────────────┘ │
│                                               │            │
│                                               ▼            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Delivery Layer                           │        │
│  │  ┌──────────────┐      ┌──────────────┐           │        │
│  │  │    FCM      │      │   Local     │           │        │
│  │  │  (Backend)  │      │ (Foreground)│           │        │
│  │  └──────────────┘      └──────────────┘           │        │
│  └─────���─���─────────────────────────────────────────────────┘ │
│                                               │            │
│                                               ▼            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Storage & Analytics                       │        │
│  │  - Log notification                                │        │
│  │  - Track delivery                                 │        │
│  │  - Track engagement                              │        │
│  └─────────────────────────────────────────────────────────┘ │
│       │                                                      │
│       ▼                                                      │
│  USER DEVICE                                                │
│                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 واجهات API

```typescript
// api/notifications/index.ts

/**
 * ========================================
 * NOTIFICATION MANAGEMENT API
 * ========================================
 */

/**
 * GET /api/notifications
 * قائمة الإشعارات مع الفلترة والترقيم
 */
interface ListNotificationsRequest {
  type?: NotificationType;
  isRead?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

interface ListNotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    total: number;
    unread: number;
  };
}

/**
 * PATCH /api/notifications/:id/read
 * تحديد إشعار كمقروء
 */
interface MarkReadResponse {
  success: boolean;
}

/**
 * DELETE /api/notifications/:id
 * حذف إشعار
 */
interface DeleteNotificationResponse {
  success: boolean;
}

/**
 * POST /api/notifications/send
 * إرسال إشعار (للاختبار)
 */
interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

interface SendNotificationResponse {
  success: boolean;
  notificationId: string;
}

/**
 * POST /api/notifications/test
 * إرسال إشعار تجريبي للجهاز الحالي
 */
interface TestNotificationResponse {
  success: boolean;
  messageId: string;
}
```

### 5.3 API للتريجرز

```typescript
// api/triggers/index.ts

/**
 * ========================================
 * TRIGGER MANAGEMENT API
 * ========================================
 */

/**
 * GET /api/triggers
 * قائمة القواعد
 */
interface ListTriggersResponse {
  success: boolean;
  data: {
    triggers: Trigger[];
    total: number;
  };
}

/**
 * POST /api/triggers
 * إنشاء قاعدة جديدة
 */
interface CreateTriggerRequest {
  name: string;
  type: NotificationType;
  source: TriggerSource;
  conditions: TriggerConditions;
  action: TriggerAction;
  repeatPolicy: RepeatPolicy;
  enabled?: boolean;
}

/**
 * PATCH /api/triggers/:id
 * تحديث قاعدة
 */
interface UpdateTriggerRequest {
  name?: string;
  conditions?: TriggerConditions;
  action?: TriggerAction;
  repeatPolicy?: RepeatPolicy;
  enabled?: boolean;
}

/**
 * DELETE /api/triggers/:id
 * حذف قاعدة
 */

/**
 * POST /api/triggers/:id/test
 * اختبار قاعدة
 */
interface TestTriggerRequest {
  context: Record<string, any>;
}

interface TestTriggerResponse {
  success: boolean;
  wouldTrigger: boolean;
  notification?: RichNotification;
}
```

### 5.4 API للقنوات

```typescript
// api/channels/index.ts

/**
 * ========================================
 * CHANNEL MANAGEMENT API
 * ========================================
 */

/**
 * GET /api/channels
 * قائمة القنوات المتاحة
 */
interface ListChannelsResponse {
  success: boolean;
  data: {
    channels: ChannelConfig[];
    userChannels: UserChannelSettings[];
  };
}

/**
 * PATCH /api/channels/:id/settings
 * تحديث إعدادات قناة
 */
interface UpdateChannelSettingsRequest {
  enabled?: boolean;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  priority?: NotificationPriority;
  showOnLockScreen?: boolean;
  lightsEnabled?: boolean;
}
```

---

## 6. نماذج التكوين

### 6.1 JSON Schema للإعدادات

```json
// schemas/notification_settings.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["userId", "types"],
  "properties": {
    "userId": {
      "type": "string",
      "pattern": "^usr_[a-zA-Z0-9]+$"
    },
    "enabled": {
      "type": "boolean",
      "default": true
    },
    "types": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/TypeSettings"
      }
    },
    "quietHours": {
      "$ref": "#/definitions/QuietHoursSettings"
    },
    "quietDays": {
      "type": "array",
      "items": {
        "type": "integer",
        "minimum": 0,
        "maximum": 6
      }
    },
    "rateLimit": {
      "$ref": "#/definitions/RateLimitSettings"
    },
    "familySettings": {
      "$ref": "#/definitions/FamilySettings"
    }
  },
  "definitions": {
    "TypeSettings": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean" },
        "priority": { 
          "type": "string",
          "enum": ["LOW", "NORMAL", "HIGH", "URGENT"]
        },
        "frequency": {
          "type": "string",
          "enum": ["instant", "hourly_digest", "daily_digest", "weekly_digest"]
        },
        "thresholds": {
          "type": "object",
          "properties": {
            "budget": { "type": "number", "minimum": 0, "maximum": 200 },
            "debtDays": { "type": "integer", "minimum": 1, "maximum": 90 },
            "goalPercent": { "type": "number", "minimum": 0, "maximum": 100 }
          }
        },
        "delayMinutes": { "type": "integer", "minimum": 0 },
        "channel": { "type": "string" },
        "aiGenerated": { "type": "boolean" }
      }
    },
    "QuietHoursSettings": {
      "type": "object",
      "required": ["start", "end"],
      "properties": {
        "enabled": { "type": "boolean" },
        "start": { "type": "string", "pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
        "end": { "type": "string", "pattern": "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
        "timezone": { "type": "string" }
      }
    },
    "RateLimitSettings": {
      "type": "object",
      "properties": {
        "maxPerHour": { "type": "integer", "minimum": 1, "maximum": 50 },
        "maxPerDay": { "type": "integer", "minimum": 1, "maximum": 200 },
        "maxPerTypePerDay": { "type": "integer", "minimum": 1, "maximum": 20 },
        "cooldownMinutes": { "type": "integer", "minimum": 1 }
      }
    },
    "FamilySettings": {
      "type": "object",
      "properties": {
        "mode": { "type": "string", "enum": ["inherit", "split", "custom"] },
        "parentUserId": { "type": "string" },
        "childSettings": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/definitions/TypeSettings"
          }
        }
      }
    }
  }
}
```

### 6.2 مثال تكوين كامل

```yaml
# config/notifications.example.yaml

# ==========================================
# Fajrak Notification Settings Example
# ==========================================

notificationSettings:
  userId: "usr_example123"
  enabled: true
  
  # إعدادات الأنواع
  types:
    budget:
      enabled: true
      priority: HIGH
      frequency: instant
      thresholds:
        budget: 80  # تنبيه عند 80%
      delayMinutes: 0
      channel: budget_alerts
    
    debt:
      enabled: true
      priority: HIGH
      frequency: instant
      thresholds:
        debtDays: 7  # تذكير قبل 7 أيام
      delayMinutes: 0
      channel: debt_alerts
    
    goal:
      enabled: true
      priority: NORMAL
      frequency: instant
      thresholds:
        goalPercent: 100
      delayMinutes: 0
    
    transaction:
      enabled: true
      priority: NORMAL
      frequency: daily_digest
      delayMinutes: 0
    
    reminder:
      enabled: true
      priority: NORMAL
      frequency: daily_digest
      delayMinutes: 480  # 8 hours
      channel: reminders
    
    achievement:
      enabled: true
      priority: LOW
      frequency: instant
    
    report:
      enabled: true
      priority: LOW
      frequency: weekly_digest
      channel: reports
  
  # أوقات الصمت
  quietHours:
    enabled: true
    start: "22:00"
    end: "08:00"
    timezone: "Asia/Riyadh"
  
  # أيام الأسبوع (الجمعة والسبت)
  quietDays: [5, 6]
  
  # معدل الإرسال
  rateLimit:
    maxPerHour: 10
    maxPerDay: 50
    maxPerTypePerDay: 5
    cooldownMinutes: 15
  
  # الإعدادات العائلية
  familySettings:
    mode: inherit
    parentUserId: "usr_parent123"
```

---

## 7. الاعتبارات الفنية

### 7.1 الجدول قاعدة البيانات

```sql
-- migrations/notification_tables.sql

-- جدول الإشعارات المرسلة
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- نوع الإشعار
  type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 1,
  channel VARCHAR(50) NOT NULL,
  
  -- المحتوى
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  
  -- التنقل
  deep_link VARCHAR(500),
  web_link VARCHAR(500),
  
  -- الحالة
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  
  -- التسليم
  status VARCHAR(20) DEFAULT 'pending',
  device_token VARCHAR(500),
  fcm_message_id VARCHAR(200),
  
  -- التوقيت
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- dedup
  deduplication_id VARCHAR(100),
  correlation_id VARCHAR(100),
  
  -- الفهرسة
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_created_at (created_at),
  INDEX idx_notifications_is_read (is_read),
  INDEX idx_notifications_deduplication_id (deduplication_id)
);

-- جدول سجلات التسليم
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- حدث التسليم
  event VARCHAR(50) NOT NULL,  -- sent, delivered, opened, clicked, dismissed
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- البيانات
  device_info JSONB,
  metadata JSONB DEFAULT '{}'
);

-- جدول_rate limits
CREATE TABLE notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  
  UNIQUE(user_id, type, window_start)
);

-- تفعيل RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own notification logs"
  ON notification_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users own rate limits"
  ON notification_rate_limits FOR ALL
  USING (auth.uid() = user_id);
```

### 7.2 الأداء التحسينات

```typescript
// services/notification_optimizations.ts

export const PERFORMANCE_OPTIMIZATIONS = {
  // 1. Batch delivery
  batchNotifications: async (
    notifications: RichNotification[],
    batchSize = 50
  ): Promise<void> => {
    const batches = [];
    for (let i = 0; i < notifications.length; i += batchSize) {
      batches.push(notifications.slice(i, i + batchSize));
    }
    
    await Promise.all(
      batches.map(batch => sendBatch(batch))
    );
  },
  
  // 2. Cache user tokens
  tokenCache: {
    cache: new Map<string, { tokens: string[], expires: Date }>(),
    ttlMinutes: 60,
    
    async get(userId: string): Promise<string[] | null> {
      const cached = this.cache.get(userId);
      if (cached && cached.expires > new Date()) {
        return cached.tokens;
      }
      return null;
    }
  },
  
  // 3. Deduplication
  deduplicationCache: {
    dedupIds: new Map<string, Date>(),
    ttlMinutes: 30,
    
    async shouldDeduplicate(dedupId: string): Promise<boolean> {
      if (this.dedupIds.has(dedupId)) {
        return true;
      }
      this.dedupIds.set(dedupId, new Date());
      return false;
    }
  },
  
  // 4. Lazy loading for lists
  lazyLoadSettings: async (
    userId: string,
    types: NotificationType[]
  ): Promise<Partial<NotificationSettings>> => {
    // تحميل فقط الأنواع المطلوبة
  }
};
```

### 7.3 الأمان

```typescript
// services/notification_security.ts

export const SECURITY_CHECKS = {
  // 1. التحقق من الصلاحيات
  checkPermission: async (
    userId: string,
    action: 'read' | 'write' | 'send'
  ): Promise<boolean> => {
    const user = await Supabase.client
      .auth.admin.getUserById(userId);
    
    if (!user.data.user) return false;
    
    // 检查 user_permissions table
    const permission = await Supabase.client
      .from('user_permissions')
      .select('notification_' + action)
      .eq('user_id', userId)
      .single();
    
    return permission?.[`notification_${action}`] ?? true;
  },
  
  // 2. تشفير البيانات الحساسة
  encryptSensitiveData: (data: any): string => {
    return encrypt(JSON.stringify(data), ENCRYPTION_KEY);
  },
  
  // 3. التحقق من rate limit
  checkGlobalRateLimit: async (
    userId: string
  ): Promise<{ allowed: boolean; remaining: number }> => {
    const today = new Date().toDateString();
    const count = await getTodayCount(userId);
    
    return {
      allowed: count < GLOBAL_DAILY_LIMIT,
      remaining: GLOBAL_DAILY_LIMIT - count
    };
  }
};
```

---

## 8. مقاييس النجاح

### 8.1 لوحة المقاييس

```typescript
// analytics/notification_metrics.ts

export interface NotificationMetrics {
  // مقاييس التسليم
  delivery: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    avgDeliveryTime: number; // بالثواني
  };
  
  // مقاييس التفاعل
  engagement: {
    opened: number;
    clicked: number;
    dismissed: number;
    openRate: number;
    clickRate: number;
  };
  
  // مقاييس الجودة
  quality: {
    optOuts: number;
    optOutRate: number;
    complaints: number;
    complaintRate: number;
    avgPriority: number;
  };
  
  // مقاييس التوقيت
  timing: {
    sentAtNight: number;
    sentInQuietHours: number;
    delayedRate: number;
  };
  
  // مقاييس الأنواع
  byType: Record<NotificationType, TypeMetrics>;
}

export interface TypeMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  clickThroughRate: number;
  avgDelay: number;
}
```

### 8.2 استعلامات SQL للمقاييس

```sql
-- analytics/notification_metrics.sql

-- مقاييس التسليم اليومية
SELECT 
  DATE(created_at) as date,
  COUNT(*) as sent,
  COUNT(delivered_at) as delivered,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))), 1) as avg_delivery_seconds
FROM notifications
WHERE user_id = $user_id
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- مقاييس التفاعل حسب النوع
SELECT 
  type,
  COUNT(*) as sent,
  COUNT(read_at) as opened,
  COUNT(clicked_at) as clicked,
  ROUND(COUNT(read_at)::numeric / COUNT(*) * 100, 1) as open_rate,
  ROUND(COUNT(clicked_at)::numeric / COUNT(*) * 100, 1) as click_rate
FROM notifications
WHERE user_id = $user_id
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY sent DESC;

-- معدل التخلي
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN is_read = false AND created_at < NOW() - INTERVAL '7 days' THEN 1 END) as unread_7d,
  ROUND(COUNT(CASE WHEN is_read = false AND created_at < NOW() - INTERVAL '7 days' THEN 1 END)::numeric / COUNT(*) * 100, 1) as ignore_rate
FROM notifications
WHERE user_id = $user_id
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY type;
```

---

## 9. ملاحق

### 9.1 قائمة الأنواع والأولويات

| Type | Channel | Default Priority | Default Frequency |
|------|---------|----------------|-----------------|------------------|
| BUDGET | budget_alerts | HIGH | instant |
| DEBT | debt_alerts | HIGH | instant |
| GOAL | goal_alerts | NORMAL | instant |
| TRANSACTION | default | NORMAL | daily_digest |
| REMINDER | reminders | NORMAL | daily_digest |
| ACHIEVEMENT | achievements | LOW | instant |
| REPORT | reports | LOW | weekly_digest |
| NEWS | news | LOW | weekly_digest |
| SYSTEM | system_alerts | NORMAL | instant |

### 9.2 Android Priority Mapping

| App Priority | Android Priority | FCM Priority |
|-------------|----------------|-------------|
| LOW | PRIORITY_MIN | low |
| NORMAL | PRIORITY_DEFAULT | normal |
| HIGH | PRIORITY_HIGH | high |
| URGENT | PRIORITY_MAX | high |

### 9.3 iOS Interruption Levels

| Priority | Interruption Level | Sound | Badge |
|----------|------------------|-------|-------|
| LOW | passive | None | Yes |
| NORMAL | active | Default | Yes |
| HIGH | timeSensitive | Default | Yes |
| URGENT | critical | Critical | Yes |

---

## 10. خريطة التنفيذ

### Phase 1:基础设施 (الأسبوع 1-2)
- [ ] إنشاء جداول قاعدة البيانات
- [ ] تنفيذ NotificationSettings API
- [ ] إنشاء NotificationService الجديد

### Phase 2: المحرك (الأسبوع 3-4)
- [ ] تنفيذ TriggerEngine
- [ ] تنفيذ RepeatPolicyEngine
- [ ] إضافة event listeners

### Phase 3: التكامل (الأسبوع 5-6)
- [ ] ربط.channels بالـ settings
- [ ] تنفيذ_rate limiting
- [ ] تنفيذ quiet hours

### Phase 4: التحسين (الأسبوع 7-8)
- [ ] Rich notifications
- [ ] Categories والأزرار
- [ ] Analytics

---

*Document Version: 1.0*
*Last Updated: 2026-04-05*
*Author: Technical Design Team*