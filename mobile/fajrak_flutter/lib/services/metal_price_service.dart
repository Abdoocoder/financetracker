import 'dart:convert';
import 'package:http/http.dart' as http;

class MetalPriceService {
  static const _troyOzToGram = 31.1034768;
  static const _timeout = Duration(seconds: 5);

  static Future<double?> fetchLocalPerGram(String symbol, double usdRate) async {
    if (usdRate <= 0) return null;
    try {
      final res = await http.get(Uri.parse('https://api.gold-api.com/price/$symbol')).timeout(_timeout);
      if (res.statusCode != 200 || res.body.isEmpty) return null;
      final decoded = json.decode(res.body);
      if (decoded is! Map) return null;
      final priceOz = (decoded['price'] as num?)?.toDouble() ?? 0;
      if (priceOz <= 0) return null;
      return (priceOz / _troyOzToGram) * usdRate;
    } catch (_) {
      return null;
    }
  }
}