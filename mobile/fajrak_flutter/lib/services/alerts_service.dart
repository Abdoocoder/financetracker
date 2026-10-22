/// خدمة التنبيهات — طبقة الوصول للبيانات لشاشة التنبيهات.
///
/// الاستعلامات الحقيقية تُضاف في Task 2. حتى ذلك الحين يرمي كل تابع
/// `UnimplementedError` عمدًا حتى يتمكّن ملف الاختبار من التصريف وتُظهر
/// جولة Task 1 (RED) رسائل تأكيد حقيقية بدل خطأ "تعذّر تحميل الملف".
class AlertsService {
  /// جلب تنبيهات المستخدم الحالي
  Future<List<Map<String, dynamic>>> fetchAlerts() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  /// تعليم تنبيه واحد كمقروء
  Future<void> markRead(String id) async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  /// تعليم كل التنبيهات كمقروءة
  Future<void> markAllRead() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  /// حذف تنبيه واحد
  Future<void> deleteAlert(String id) async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  /// حذف كل التنبيهات
  Future<void> deleteAll() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }
}
