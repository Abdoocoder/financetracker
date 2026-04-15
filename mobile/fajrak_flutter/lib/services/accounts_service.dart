import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

class AccountsService {
  static SupabaseClient get _db => Supabase.instance.client;

  static String get _uid => _db.auth.currentUser!.id;

  /// جلب الحسابات مع حساب الرصيد باستخدام RPC المركزية
  static Future<List<Map<String, dynamic>>> fetchAccounts() async {
    final userId = _uid;
    // جلب بيانات الحسابات الأساسية
    final accounts = await _db
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('is_default', ascending: false)
        .order('created_at');

    // جلب الأرصدة المحسوبة من القاعدة مباشرة (Best Practice)
    final List<dynamic> balancesData = await _db.rpc('get_account_balances', params: {'p_user_id': userId});
    
    final Map<String, double> balanceMap = {
      for (var b in balancesData) b['account_id'] as String: (b['current_balance'] as num).toDouble()
    };

    return (accounts as List).map<Map<String, dynamic>>((acc) {
      final id = acc['id'] as String;
      return {
        ...acc,
        'balance': balanceMap[id] ?? (acc['opening_balance'] as num? ?? 0).toDouble(),
      };
    }).toList();
  }

  static Future<void> createAccount({
    required String name,
    required String type,
    required double openingBalance,
    required String currency,
    required String color,
    required String icon,
    bool isDefault = false,
  }) async {
    await _db.from('accounts').insert({
      'user_id': _uid,
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
    required String fromAccountId,
    required String toAccountId,
    required double amount,
    required String date,
    String? note,
  }) async {
    final pairId = const Uuid().v4();
    await _db.from('transactions').insert({
      'user_id': _uid,
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
