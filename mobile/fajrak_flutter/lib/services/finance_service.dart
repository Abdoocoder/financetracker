import 'package:supabase_flutter/supabase_flutter.dart';

class FinanceService {
  static SupabaseClient get _db => Supabase.instance.client;
  static String get _uid => _db.auth.currentUser!.id;

  /// جلب ملخص الشهر الحالي الموحّد (income/expenses/debt_payments/net)
  static Future<Map<String, dynamic>> fetchMonthlyFinancialSummary({
    int? year,
    int? month,
  }) async {
    final response = await _db.rpc('get_monthly_financial_summary', params: {
      'p_user_id': _uid,
      'p_year': year,
      'p_month': month,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب ملخص لوحة المعلومات المالية باستخدام RPC المركزية
  static Future<Map<String, dynamic>> fetchFinancialDashboard(double usdToLocalRate) async {
    final response = await _db.rpc('get_financial_dashboard', params: {
      'p_user_id': _uid,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }

  /// جلب ملخص الزكاة الفقهي باستخدام RPC المركزية
  static Future<Map<String, dynamic>> fetchZakatSummary({
    required double goldPrice,
    required double silverPrice,
    required double usdToLocalRate,
  }) async {
    final response = await _db.rpc('get_zakat_summary', params: {
      'p_user_id': _uid,
      'p_gold_price_per_gram': goldPrice,
      'p_silver_price_per_gram': silverPrice,
      'p_usd_to_local_rate': usdToLocalRate,
    });
    return Map<String, dynamic>.from(response as Map);
  }
}
