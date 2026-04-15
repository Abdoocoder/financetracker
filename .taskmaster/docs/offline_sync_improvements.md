# Offline-First Sync Architecture Improvements

## Context

تم تصميم معمارية offline-first للتطبيق المحمول (Flutter + Supabase). بعد المراجعة المعمّقة، تم تحديد 6 مشاكل وتحسينات يجب تطبيقها لضمان موثوقية وأمان النظام في بيئة الإنتاج.

## Tasks Required

### Task 1: Security — Fix userId Source & Enable SQLCipher Encryption

**Priority: Critical**

المشكلة: `userId` يأتي من client code بدلاً من Supabase Auth مباشرة، مما يتيح للمستخدم تمرير userId شخص آخر.

الخطوات:
1. تعديل `TransactionModel.create()` لسحب `userId` دائماً من `Supabase.instance.client.auth.currentUser!.id` وليس كـ parameter
2. تطبيق نفس التعديل على جميع models الأخرى (debts, investments, budgets, goals)
3. التحقق من وجود `WITH CHECK (auth.uid() = user_id)` في جميع RLS policies في Supabase
4. إضافة `sqlcipher_flutter_libs` لتشفير قاعدة بيانات Drift المحلية
5. كتابة migration SQL للتحقق من صحة RLS policies

---

### Task 2: Queue Collapse — Prevent Queue Explosion on Repeated Edits

**Priority: High**

المشكلة: تعديل نفس المعاملة 50 مرة وهو offline ينتج 50 صفاً في sync_queue لنفس الـ entity، مما يسبب 50 طلب Supabase عند الاتصال.

الخطوات:
1. تعديل `_enqueueUpdate()` في `TransactionRepository` للتحقق من وجود `pending_create` لنفس الـ `entityId` → دمج الـ payload بدلاً من إضافة صف جديد
2. التحقق من وجود `pending_update` لنفس الـ `entityId` → استبداله بدلاً من إضافة صف جديد مع reset لـ `attemptCount`
3. إضافة DB index على `(entityId, operationType)` في `sync_queue` لتسريع عمليات الـ collapse
4. كتابة unit tests لسيناريو: 10 تعديلات على نفس المعاملة → يجب أن ينتج صف واحد فقط في القائمة

---

### Task 3: Delete/Create Race — Fix Operation Ordering & Premature Delete

**Priority: High**

المشكلة: إذا حذف المستخدم معاملة offline قبل أن يتم sync الـ create، قد يُرسل الـ delete قبل الـ create مما يسبب "row not found" error، ثم يُرسل create لاحقاً منشئاً صفاً يجب حذفه.

الخطوات:
1. تعديل `_enqueueDelete()` ليتحقق أولاً من وجود `pending_create` لنفس الـ id → إذا وُجد يعني الصف لم يصل Supabase أصلاً → امسح محلياً فقط بدون إرسال delete
2. عند enqueue delete: احذف جميع العمليات السابقة في القائمة لنفس الـ entityId (create + updates)
3. تعديل `_processQueue()` لترتيب العمليات: creates أولاً ← updates ثانياً ← deletes أخيراً
4. إضافة unit test لسيناريو: create offline → delete offline → يجب أن لا يُرسل أي شيء لـ Supabase

---

### Task 4: Pull Sync Pagination & Soft Delete Support

**Priority: High**

المشكلة: `_pullRemoteChanges()` يجلب كل البيانات منذ آخر sync بدون pagination، مما يسبب مشاكل عند المستخدمين ذوي البيانات الكثيرة. كذلك لا يكتشف الصفوف المحذوفة من أجهزة أخرى.

الخطوات:
1. إضافة عمود `deleted_at TIMESTAMPTZ` في Supabase على جدول `transactions` (soft delete) بـ migration جديد
2. تحديث RLS policy لإخفاء الصفوف ذات `deleted_at IS NOT NULL` من queries عادية
3. تعديل `_pullRemoteChanges()` لاستخدام pagination بحجم 100 صف مع loop
4. تحديد أعمدة محددة في SELECT بدلاً من `SELECT *`
5. إضافة `_pullDeletedRows()` لجلب الصفوف المحذوفة من أجهزة أخرى وحذفها محلياً
6. حفظ `lastSyncTimestamp` في `shared_preferences`

---

### Task 5: Background Sync with WorkManager

**Priority: Medium**

المشكلة: لا يوجد background sync — البيانات تُرسل فقط عند فتح التطبيق أو استعادة الاتصال، مما يعني تأخير في sync البيانات بين الأجهزة.

الخطوات:
1. إضافة `workmanager: ^0.5.0` إلى `pubspec.yaml`
2. إنشاء `BackgroundSyncService` مستقل يُعيد init جميع الـ dependencies (AppDatabase + Supabase)
3. تسجيل periodic task كل 15 دقيقة مع constraint: `networkType: NetworkType.connected`
4. استخدام `ExistingWorkPolicy.keep` لمنع تشغيل multiple instances
5. معالجة iOS background fetch limitations بوضع documentation

---

### Task 6: Soft Lock UI — Pending Sync Status Badges

**Priority: Medium**

المشكلة: لا يوجد مؤشر للمستخدم على أن بعض المعاملات لم تُرسل بعد للسيرفر (pending sync)، مما يسبب قلقاً عند المستخدمين أو تكرار العمليات.

الخطوات:
1. إضافة sync status badge في `TransactionListItem` widget: أيقونة `cloud_upload` برتقالية للـ pending، `delete_outline` حمراء للـ pending_delete، لا شيء للـ synced
2. إضافة "pending sync" indicator في صفحة المعاملات الرئيسية (عدد العمليات المعلقة)
3. عدم تعطيل أي أزرار بسبب sync status — فقط عرض المؤشر (المستخدم يحق له التعديل حتى وهو pending)
4. إضافة pull-to-refresh يُشغّل `syncPendingQueue()` يدوياً
