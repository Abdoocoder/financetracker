import 'package:flutter_test/flutter_test.dart';
import 'package:fajrak/services/currency_service.dart';

void main() {
  group('CurrencyService', () {
    test('getDecimals should return correct decimal count', () {
      expect(CurrencyService.getDecimals('JOD'), 3);
      expect(CurrencyService.getDecimals('USD'), 2);
      expect(CurrencyService.getDecimals('JPY'), 0);
      expect(CurrencyService.getDecimals('UNKNOWN'), 2); // Default
    });

    test('findByCode should return correct currency info', () {
      final jord = CurrencyService.findByCode('JOD');
      expect(jord, isNotNull);
      expect(jord!['labelAr'], 'دينار أردني');
      expect(jord['flag'], '🇯🇴');

      final unknown = CurrencyService.findByCode('XYZ');
      expect(unknown, isNull);
    });

    test('formatAmount should format correctly', () {
      expect(CurrencyService.formatAmount(100, 'JOD'), '100.000 JOD');
      expect(CurrencyService.formatAmount(100.5, 'USD'), '100.50 USD');
      expect(CurrencyService.formatAmount(500, 'JPY'), '500 JPY');
    });

    test('currencies list should have expected items', () {
      expect(CurrencyService.currencies.length, greaterThan(30));
      expect(CurrencyService.currencies.any((c) => c['value'] == 'SAR'), isTrue);
    });
  });
}
