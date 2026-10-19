import 'package:supabase_flutter/supabase_flutter.dart';

class FinanceService {
  static SupabaseClient get _db => Supabase.instance.client;
  static String? get _uid {
    final user = _db.auth.currentUser;
    return user?.id;
  }

  /// جلب ملخص الشهر الحالي الموحّد (income/expenses/debt_payments/net)
  static Future<Map<String, dynamic>> fetchMonthlyFinancialSummary({
    int? year,
    int? month,
  }) async {
    final uid = _uid;
    if (uid == null) return {};
    final response = await _db.rpc('get_monthly_financial_summary', params: {
      'p_user_id': uid,
      'p_year': year,
      'p_month': month,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب ملخص لوحة المعلومات المالية باستخدام RPC المركزية
  static Future<Map<String, dynamic>> fetchFinancialDashboard(double usdToLocalRate) async {
    final uid = _uid;
    if (uid == null) return {};
    final response = await _db.rpc('get_financial_dashboard', params: {
      'p_user_id': uid,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب ملخص الزكاة الفقهي باستخدام RPC المركزية (v2)
  static Future<Map<String, dynamic>> fetchZakatSummary({
    required double goldPrice,
    required double silverPrice,
    required double usdToLocalRate,
  }) async {
    final uid = _uid;
    if (uid == null) return {};
    final response = await _db.rpc('get_zakat_summary', params: {
      'p_user_id': uid,
      'p_gold_price_per_gram': goldPrice,
      'p_silver_price_per_gram': silverPrice,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب الحولات النشطة (استثمارات + ذهب/فضة) من RPC الموحد get_zakat_hauls.
  /// مصدر الحول الوحيد — لا يُحسب الحول في الواجهة بعد الآن.
  static Future<List<Map<String, dynamic>>> fetchZakatHauls() async {
    final uid = _uid;
    if (uid == null) return [];
    final response = await _db.rpc('get_zakat_hauls', params: {'p_user_id': uid});
    if (response is List) {
      return response.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  /// مزامنة حالة الحول عبر RPC الموحد sync_zakat_haul_state (Zakat Autopilot).
  /// يعيد الحالة المحدّثة: days_remaining / zakat_due / nisab_reached_at ...
  /// (ينشئ/يحدّث صف zakat_haul_state على الخادم — لا يُحسب الحول في الواجهة).
  /// تمرير الأسعار الحيّة (إن توفّرت) يجعل النصاب يُقيَّم بأسعار السوق بدل
  /// الافتراضيات القديمة (ذهب 30 / فضة 0.35 / سعر صرف 1.0).
  static Future<Map<String, dynamic>> syncZakatHaulState({
    double? goldPrice,
    double? silverPrice,
    double? usdToLocalRate,
  }) async {
    final uid = _uid;
    if (uid == null) return {};
    final params = <String, dynamic>{'p_user_id': uid};
    if (goldPrice != null) params['p_gold_price'] = goldPrice;
    if (silverPrice != null) params['p_silver_price'] = silverPrice;
    if (usdToLocalRate != null) params['p_fx_rate'] = usdToLocalRate;
    final response = await _db.rpc('sync_zakat_haul_state', params: params);
    return Map<String, dynamic>.from(response as Map);
  }

  /// مزامنة غرامات الذهب/الفضة إلى جدول zakat_holdings (لتصبح ضمن الوعاء).
  /// الجدول لا يملك قيداً فريداً، فنحدّث الصف الموجود أو ننشئه.
  /// الغرامات <= 0 تحذف الصف حتى لا تُحتسب дважды.
  static Future<void> syncZakatHoldings({
    required double goldGrams,
    required double silverGrams,
  }) async {
    final uid = _uid;
    if (uid == null) return;
    final targets = {'gold': goldGrams, 'silver': silverGrams};
    for (final entry in targets.entries) {
      final existing = await _db
          .from('zakat_holdings')
          .select('id')
          .eq('user_id', uid)
          .eq('asset_type', entry.key)
          .limit(1);
      final rows = List<Map<String, dynamic>>.from(existing as List);
      if (entry.value > 0) {
        if (rows.isNotEmpty) {
          await _db.from('zakat_holdings')
              .update({'grams': entry.value}).eq('id', rows.first['id'] as String);
        } else {
          await _db.from('zakat_holdings').insert({
            'user_id': uid,
            'asset_type': entry.key,
            'grams': entry.value,
          });
        }
      } else if (rows.isNotEmpty) {
        await _db.from('zakat_holdings').delete().eq('id', rows.first['id'] as String);
      }
    }
  }
}
