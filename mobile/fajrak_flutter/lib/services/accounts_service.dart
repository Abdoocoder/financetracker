import 'package:supabase_flutter/supabase_flutter.dart';

class AccountsService {
  static SupabaseClient get _db => Supabase.instance.client;

  /// جلب الحسابات مع حساب الرصيد لكل حساب
  static Future<List<Map<String, dynamic>>> fetchAccounts(String userId) async {
    final accounts = await _db
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('is_default', ascending: false)
        .order('created_at');

    final txs = await _db
        .from('transactions')
        .select('account_id, transfer_to_account_id, type, amount')
        .eq('user_id', userId);

    return accounts.map<Map<String, dynamic>>((acc) {
      final id = acc['id'] as String;
      double income  = 0, expense = 0, xferIn = 0, xferOut = 0;
      for (final tx in txs) {
        final amt = (tx['amount'] as num).toDouble();
        if (tx['account_id'] == id) {
          if (tx['type'] == 'income')   income  += amt;
          if (tx['type'] == 'expense')  expense += amt;
          if (tx['type'] == 'transfer') xferOut += amt;
        }
        if (tx['transfer_to_account_id'] == id && tx['type'] == 'transfer') {
          xferIn += amt;
        }
      }
      final openingBalance = (acc['opening_balance'] as num? ?? 0).toDouble();
      return {
        ...acc,
        'balance': openingBalance + income - expense + xferIn - xferOut,
      };
    }).toList();
  }

  static Future<void> createAccount({
    required String userId,
    required String name,
    required String type,
    required double openingBalance,
    required String currency,
    required String color,
    required String icon,
    bool isDefault = false,
  }) async {
    await _db.from('accounts').insert({
      'user_id': userId,
      'name': name,
      'type': type,
      'opening_balance': openingBalance,
      'currency': currency,
      'color': color,
      'icon': icon,
      'is_default': isDefault,
    });
  }

  static Future<void> updateAccount(String id, Map<String, dynamic> data) async {
    await _db.from('accounts').update(data).eq('id', id);
  }

  static Future<void> archiveAccount(String id) async {
    await _db.from('accounts').update({'is_archived': true}).eq('id', id);
  }

  static Future<void> transfer({
    required String userId,
    required String fromAccountId,
    required String toAccountId,
    required double amount,
    required String date,
    String? note,
  }) async {
    final pairId = DateTime.now().millisecondsSinceEpoch.toString();
    await _db.from('transactions').insert({
      'user_id': userId,
      'type': 'transfer',
      'amount': amount,
      'category': 'تحويل',
      'description': note ?? 'تحويل بين الحسابات',
      'transaction_date': date,
      'account_id': fromAccountId,
      'transfer_to_account_id': toAccountId,
      'transfer_pair_id': pairId,
      'is_recurring': false,
    });
  }
}
