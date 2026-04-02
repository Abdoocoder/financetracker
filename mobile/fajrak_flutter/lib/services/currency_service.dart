import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class CurrencyService {
  static const String _baseUrl = 'https://open.er-api.com/v6/latest';

  /// قائمة كاملة بالعملات مقسّمة حسب المجموعة
  static const List<Map<String, dynamic>> currencies = [
    // ── العربية ────────────────────────────────────────────────────────
    {'value': 'JOD', 'labelAr': 'دينار أردني',       'labelEn': 'Jordanian Dinar',     'flag': '🇯🇴', 'decimals': 3, 'group': 'arabic'},
    {'value': 'SAR', 'labelAr': 'ريال سعودي',         'labelEn': 'Saudi Riyal',          'flag': '🇸🇦', 'decimals': 2, 'group': 'arabic'},
    {'value': 'AED', 'labelAr': 'درهم إماراتي',       'labelEn': 'UAE Dirham',           'flag': '🇦🇪', 'decimals': 2, 'group': 'arabic'},
    {'value': 'KWD', 'labelAr': 'دينار كويتي',        'labelEn': 'Kuwaiti Dinar',        'flag': '🇰🇼', 'decimals': 3, 'group': 'arabic'},
    {'value': 'BHD', 'labelAr': 'دينار بحريني',       'labelEn': 'Bahraini Dinar',       'flag': '🇧🇭', 'decimals': 3, 'group': 'arabic'},
    {'value': 'OMR', 'labelAr': 'ريال عماني',         'labelEn': 'Omani Rial',           'flag': '🇴🇲', 'decimals': 3, 'group': 'arabic'},
    {'value': 'QAR', 'labelAr': 'ريال قطري',          'labelEn': 'Qatari Riyal',         'flag': '🇶🇦', 'decimals': 2, 'group': 'arabic'},
    {'value': 'EGP', 'labelAr': 'جنيه مصري',          'labelEn': 'Egyptian Pound',       'flag': '🇪🇬', 'decimals': 2, 'group': 'arabic'},
    {'value': 'IQD', 'labelAr': 'دينار عراقي',        'labelEn': 'Iraqi Dinar',          'flag': '🇮🇶', 'decimals': 3, 'group': 'arabic'},
    {'value': 'LYD', 'labelAr': 'دينار ليبي',         'labelEn': 'Libyan Dinar',         'flag': '🇱🇾', 'decimals': 3, 'group': 'arabic'},
    {'value': 'TND', 'labelAr': 'دينار تونسي',        'labelEn': 'Tunisian Dinar',       'flag': '🇹🇳', 'decimals': 3, 'group': 'arabic'},
    {'value': 'DZD', 'labelAr': 'دينار جزائري',       'labelEn': 'Algerian Dinar',       'flag': '🇩🇿', 'decimals': 2, 'group': 'arabic'},
    {'value': 'MAD', 'labelAr': 'درهم مغربي',         'labelEn': 'Moroccan Dirham',      'flag': '🇲🇦', 'decimals': 2, 'group': 'arabic'},
    {'value': 'SDG', 'labelAr': 'جنيه سوداني',        'labelEn': 'Sudanese Pound',       'flag': '🇸🇩', 'decimals': 2, 'group': 'arabic'},
    {'value': 'YER', 'labelAr': 'ريال يمني',          'labelEn': 'Yemeni Rial',          'flag': '🇾🇪', 'decimals': 2, 'group': 'arabic'},
    {'value': 'LBP', 'labelAr': 'ليرة لبنانية',      'labelEn': 'Lebanese Pound',       'flag': '🇱🇧', 'decimals': 2, 'group': 'arabic'},
    {'value': 'SYP', 'labelAr': 'ليرة سورية',        'labelEn': 'Syrian Pound',         'flag': '🇸🇾', 'decimals': 2, 'group': 'arabic'},
    // ── الإسلامية ────────────────────────────────────────────────────────
    {'value': 'PKR', 'labelAr': 'روبية باكستانية',   'labelEn': 'Pakistani Rupee',      'flag': '🇵🇰', 'decimals': 2, 'group': 'islamic'},
    {'value': 'IDR', 'labelAr': 'روبية إندونيسية',   'labelEn': 'Indonesian Rupiah',    'flag': '🇮🇩', 'decimals': 0, 'group': 'islamic'},
    {'value': 'MYR', 'labelAr': 'رينغيت ماليزي',     'labelEn': 'Malaysian Ringgit',    'flag': '🇲🇾', 'decimals': 2, 'group': 'islamic'},
    {'value': 'TRY', 'labelAr': 'ليرة تركية',        'labelEn': 'Turkish Lira',         'flag': '🇹🇷', 'decimals': 2, 'group': 'islamic'},
    {'value': 'BDT', 'labelAr': 'تاكا بنغلاديشي',   'labelEn': 'Bangladeshi Taka',     'flag': '🇧🇩', 'decimals': 2, 'group': 'islamic'},
    {'value': 'NGN', 'labelAr': 'نيرة نيجيرية',      'labelEn': 'Nigerian Naira',       'flag': '🇳🇬', 'decimals': 2, 'group': 'islamic'},
    {'value': 'IRR', 'labelAr': 'ريال إيراني',        'labelEn': 'Iranian Rial',         'flag': '🇮🇷', 'decimals': 2, 'group': 'islamic'},
    // ── العالمية ────────────────────────────────────────────────────────
    {'value': 'USD', 'labelAr': 'دولار أمريكي',      'labelEn': 'US Dollar',            'flag': '💵',  'decimals': 2, 'group': 'global'},
    {'value': 'EUR', 'labelAr': 'يورو',               'labelEn': 'Euro',                 'flag': '🇪🇺', 'decimals': 2, 'group': 'global'},
    {'value': 'GBP', 'labelAr': 'جنيه إسترليني',     'labelEn': 'British Pound',        'flag': '🇬🇧', 'decimals': 2, 'group': 'global'},
    {'value': 'JPY', 'labelAr': 'ين ياباني',          'labelEn': 'Japanese Yen',         'flag': '🇯🇵', 'decimals': 0, 'group': 'global'},
    {'value': 'CHF', 'labelAr': 'فرنك سويسري',       'labelEn': 'Swiss Franc',          'flag': '🇨🇭', 'decimals': 2, 'group': 'global'},
    {'value': 'CAD', 'labelAr': 'دولار كندي',        'labelEn': 'Canadian Dollar',      'flag': '🇨🇦', 'decimals': 2, 'group': 'global'},
    {'value': 'AUD', 'labelAr': 'دولار أسترالي',     'labelEn': 'Australian Dollar',    'flag': '🇦🇺', 'decimals': 2, 'group': 'global'},
    {'value': 'CNY', 'labelAr': 'يوان صيني',          'labelEn': 'Chinese Yuan',         'flag': '🇨🇳', 'decimals': 2, 'group': 'global'},
    {'value': 'INR', 'labelAr': 'روبية هندية',        'labelEn': 'Indian Rupee',         'flag': '🇮🇳', 'decimals': 2, 'group': 'global'},
    {'value': 'RUB', 'labelAr': 'روبل روسي',          'labelEn': 'Russian Ruble',        'flag': '🇷🇺', 'decimals': 2, 'group': 'global'},
    {'value': 'KES', 'labelAr': 'شلن كيني',           'labelEn': 'Kenyan Shilling',      'flag': '🇰🇪', 'decimals': 2, 'group': 'global'},
  ];

  /// ابحث عن عملة بالكود
  static Map<String, dynamic>? findByCode(String code) {
    try {
      return currencies.firstWhere((c) => c['value'] == code);
    } catch (_) {
      return null;
    }
  }

  /// عدد الخانات العشرية لعملة معيّنة
  static int getDecimals(String code) => findByCode(code)?['decimals'] as int? ?? 2;

  /// جلب سعر صرف بين عملتين
  static Future<double?> fetchExchangeRate(String base, String target) async {
    if (base == target) return 1.0;
    try {
      final response = await http.get(Uri.parse('$_baseUrl/$base'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['result'] == 'success') {
          final rates = data['rates'] as Map<String, dynamic>;
          return (rates[target] as num?)?.toDouble();
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching exchange rate: $e');
      return null;
    }
  }

  /// تنسيق مبلغ مع عملة (يحترم عدد الخانات العشرية)
  static String formatAmount(double amount, String currency) {
    final decimals = getDecimals(currency);
    return '${amount.toStringAsFixed(decimals)} $currency';
  }
}
