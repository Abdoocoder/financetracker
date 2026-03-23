import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class CurrencyService {
  static const String _baseUrl = 'https://open.er-api.com/v6/latest';

  static final List<Map<String, String>> currencies = [
    {'value': 'JOD', 'label': 'دينار أردني (JOD)', 'icon': '🇯🇴'},
    {'value': 'USD', 'label': 'دولار أمريكي (USD)', 'icon': '💵'},
    {'value': 'EUR', 'label': 'يورو (EUR)', 'icon': '🇪🇺'},
    {'value': 'SAR', 'label': 'ريال سعودي (SAR)', 'icon': '🇸🇦'},
    {'value': 'AED', 'label': 'درهم إماراتي (AED)', 'icon': '🇦🇪'},
    {'value': 'KWD', 'label': 'دينار كويتي (KWD)', 'icon': '🇰🇼'},
    {'value': 'TRY', 'label': 'ليرة تركية (TRY)', 'icon': '🇹🇷'},
    {'value': 'GBP', 'label': 'جنيه إسترليني (GBP)', 'icon': '🇬🇧'},
  ];

  static Future<double?> fetchExchangeRate(String base, String target) async {
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

  static String formatAmount(double amount, String currency) {
    return '${amount.toStringAsFixed(2)} $currency';
  }
}
