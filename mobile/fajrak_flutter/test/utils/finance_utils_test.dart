import 'package:flutter_test/flutter_test.dart';
import 'package:fajrak/utils/finance_utils.dart';

void main() {
  group('FinanceUtils', () {
    test('calculateAccountBalance should correctly track income, expense, and transfers', () {
      final transactions = [
        {'account_id': 'acc1', 'type': 'income', 'amount': 1000},
        {'account_id': 'acc1', 'type': 'expense', 'amount': 200},
        {'account_id': 'acc1', 'type': 'transfer', 'amount': 300, 'transfer_to_account_id': 'acc2'},
        {'account_id': 'acc0', 'type': 'transfer', 'amount': 500, 'transfer_to_account_id': 'acc1'},
      ];

      final balance = FinanceUtils.calculateAccountBalance(
        accountId: 'acc1',
        openingBalance: 500,
        transactions: transactions,
      );

      // 500 (opening) + 1000 (income) - 200 (expense) - 300 (transfer out) + 500 (transfer in) = 1500
      expect(balance, 1500.0);
    });

    test('calculateNetWorth should sum correctly', () {
      final nw = FinanceUtils.calculateNetWorth(
        totalAccountBalances: 1000,
        totalDebt: 200,
        totalReceivable: 50,
        investmentValue: 500,
        savingsGoalsValue: 100,
      );

      // 1000 (accounts) + 500 (inv) + 100 (goals) - 200 (debt) + 50 (receivable) = 1450
      expect(nw, 1450.0);
    });
  });
}
