import 'dart:io';

class DetectionResult {
  final String currency;
  final String confidence; // 'high' | 'low'
  final String countryName;
  const DetectionResult({
    required this.currency,
    required this.confidence,
    required this.countryName,
  });
}

/// يكتشف العملة المحلية من locale الجهاز (country code).
/// لا يستخدم أي API خارجي.
class DetectCurrency {
  static DetectionResult detect() {
    try {
      // Platform.localeName → e.g. "ar_JO", "en_US", "ar-SA"
      final locale = Platform.localeName;
      final parts = locale.split(RegExp(r'[_\-]'));
      if (parts.length >= 2) {
        final cc = parts[1].toUpperCase();
        final match = _localeCurrencyMap[cc];
        if (match != null) {
          return DetectionResult(
            currency: match['currency']!,
            confidence: 'high',
            countryName: match['countryName']!,
          );
        }
      }
      // Arabic locale بدون country code → JOD كـ fallback
      if (locale.startsWith('ar')) {
        return const DetectionResult(currency: 'JOD', confidence: 'low', countryName: '');
      }
    } catch (_) {}
    return const DetectionResult(currency: 'USD', confidence: 'low', countryName: '');
  }
}

/// ISO 3166-1 Alpha-2 → { currency, countryName }
const Map<String, Map<String, String>> _localeCurrencyMap = {
  // العربية
  'JO': {'currency': 'JOD', 'countryName': 'الأردن'},
  'SA': {'currency': 'SAR', 'countryName': 'السعودية'},
  'AE': {'currency': 'AED', 'countryName': 'الإمارات'},
  'KW': {'currency': 'KWD', 'countryName': 'الكويت'},
  'BH': {'currency': 'BHD', 'countryName': 'البحرين'},
  'OM': {'currency': 'OMR', 'countryName': 'عُمان'},
  'QA': {'currency': 'QAR', 'countryName': 'قطر'},
  'EG': {'currency': 'EGP', 'countryName': 'مصر'},
  'IQ': {'currency': 'IQD', 'countryName': 'العراق'},
  'LY': {'currency': 'LYD', 'countryName': 'ليبيا'},
  'TN': {'currency': 'TND', 'countryName': 'تونس'},
  'DZ': {'currency': 'DZD', 'countryName': 'الجزائر'},
  'MA': {'currency': 'MAD', 'countryName': 'المغرب'},
  'SD': {'currency': 'SDG', 'countryName': 'السودان'},
  'YE': {'currency': 'YER', 'countryName': 'اليمن'},
  'LB': {'currency': 'LBP', 'countryName': 'لبنان'},
  'SY': {'currency': 'SYP', 'countryName': 'سوريا'},
  // الإسلامية
  'PK': {'currency': 'PKR', 'countryName': 'باكستان'},
  'ID': {'currency': 'IDR', 'countryName': 'إندونيسيا'},
  'MY': {'currency': 'MYR', 'countryName': 'ماليزيا'},
  'TR': {'currency': 'TRY', 'countryName': 'تركيا'},
  'BD': {'currency': 'BDT', 'countryName': 'بنغلاديش'},
  'NG': {'currency': 'NGN', 'countryName': 'نيجيريا'},
  'IR': {'currency': 'IRR', 'countryName': 'إيران'},
  // العالمية
  'US': {'currency': 'USD', 'countryName': 'الولايات المتحدة'},
  'GB': {'currency': 'GBP', 'countryName': 'المملكة المتحدة'},
  'DE': {'currency': 'EUR', 'countryName': 'أوروبا'},
  'FR': {'currency': 'EUR', 'countryName': 'أوروبا'},
  'CA': {'currency': 'CAD', 'countryName': 'كندا'},
  'AU': {'currency': 'AUD', 'countryName': 'أستراليا'},
  'JP': {'currency': 'JPY', 'countryName': 'اليابان'},
  'CN': {'currency': 'CNY', 'countryName': 'الصين'},
  'IN': {'currency': 'INR', 'countryName': 'الهند'},
  'CH': {'currency': 'CHF', 'countryName': 'سويسرا'},
  'KE': {'currency': 'KES', 'countryName': 'كينيا'},
  'RU': {'currency': 'RUB', 'countryName': 'روسيا'},
};
