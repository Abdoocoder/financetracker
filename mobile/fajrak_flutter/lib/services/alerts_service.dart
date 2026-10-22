import 'package:supabase_flutter/supabase_flutter.dart';

/// طبقة الوصول للبيانات لشاشة التنبيهات.
///
/// كل تابع يتعامل مع Supabase مباشرة؛ وقاعدة RLS (القاعدة الذهبية 1) تقيّد
/// الصفوف على `auth.uid()`. استُخدمت توابع instance (وليست static) حتى يتمكّن
/// ملف الاختبار من حقن subclass وهمية — نفس نمط `ByokService`.
class AlertsService {
  /// جلب تنبيهات المستخدم الحالي، الأحدث أولًا.
  Future<List<Map<String, dynamic>>> fetchAlerts() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return [];
    final data = await Supabase.instance.client
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data);
  }

  /// تعليم تنبيه واحد كمقروء.
  Future<void> markRead(String id) async {
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('id', id);
  }

  /// تعليم كل التنبيهات كمقروءة.
  Future<void> markAllRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('user_id', user.id)
        .eq('is_read', false);
  }

  /// حذف تنبيه واحد.
  Future<void> deleteAlert(String id) async {
    await Supabase.instance.client.from('alerts').delete().eq('id', id);
  }

  /// حذف كل التنبيهات.
  Future<void> deleteAll() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client.from('alerts').delete().eq('user_id', user.id);
  }
}
