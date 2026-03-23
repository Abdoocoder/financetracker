import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class InvestmentsService {
  static const Map<String, String> _cryptoIds = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'LTC': 'litecoin',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'TRX': 'tron',
  };

  static Future<double?> fetchPrice(String symbol) async {
    final s = symbol.toUpperCase();

    // 1. Try Crypto (CoinGecko)
    if (_cryptoIds.containsKey(s)) {
      final cryptoPrice = await _getCryptoPrice(_cryptoIds[s]!);
      if (cryptoPrice != null) return cryptoPrice;
    }

    // 2. Try Twelve Data
    final stockPrice = await _getStockPrice(s);
    if (stockPrice != null) return stockPrice;

    // 3. Try Yahoo Finance (Fallback)
    return await _getStockPriceYahoo(s);
  }

  static Future<double?> _getCryptoPrice(String id) async {
    try {
      final res = await http.get(Uri.parse(
          'https://api.coingecko.com/api/v3/simple/price?ids=$id&vs_currencies=usd'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        return (data[id]?['usd'] as num?)?.toDouble();
      }
    } catch (_) {}
    return null;
  }

  static Future<double?> _getStockPrice(String symbol) async {
    try {
      final res = await http.get(Uri.parse(
          'https://api.twelvedata.com/price?symbol=$symbol&apikey=${dotenv.env['TWELVE_DATA_KEY']}'));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        if (data['price'] != null) {
          return double.tryParse(data['price'].toString());
        }
      }
    } catch (_) {}
    return null;
  }

  static Future<double?> _getStockPriceYahoo(String symbol) async {
    try {
      final res = await http.get(
        Uri.parse('https://query1.finance.yahoo.com/v8/finance/chart/$symbol?interval=1d&range=1d'),
        headers: {'User-Agent': 'Mozilla/5.0'},
      );
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        return (data['chart']?['result']?[0]?['meta']?['regularMarketPrice'] as num?)?.toDouble();
      }
    } catch (_) {}
    return null;
  }
}
