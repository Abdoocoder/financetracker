import 'package:supabase_flutter/supabase_flutter.dart';

class FinanceService {
  static SupabaseClient get _db => Supabase.instance.client;

  /// جلب ملخص لوحة المعلومات المالية باستخدام RPC المركزية
  static Future<Map<String, dynamic>> fetchFinancialDashboard(String userId, double usdToLocalRate) async {
    final response = await _db.rpc('get_financial_dashboard', params: {
      'p_user_id': userId,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب ملخص الزكاة الفقهي باستخدام RPC المركزية
  static Future<Map<String, dynamic>> fetchZakatSummary({
    required String userId,
    required double goldPrice,
    required double silverPrice,
    required double usdToLocalRate,
  }) async {
    final response = await _db.rpc('get_zakat_summary', params: {
      'p_user_id': userId,
      'p_gold_price_per_gram': goldPrice,
      'p_silver_price_per_gram': silverPrice,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }
}
