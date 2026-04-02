/// Pure utility functions for financial calculations
class FinanceUtils {
  /// Calulates the balance of an account based on its opening balance and a list of transactions.
  static double calculateAccountBalance({
    required String accountId,
    required double openingBalance,
    required List<Map<String, dynamic>> transactions,
  }) {
    double income = 0, expense = 0, xferIn = 0, xferOut = 0;
    for (final tx in transactions) {
      final amt = (tx['amount'] as num).toDouble();
      final type = tx['type'] as String?;
      final fromId = tx['account_id'] as String?;
      final toId = tx['transfer_to_account_id'] as String?;

      if (fromId == accountId) {
        if (type == 'income') income += amt;
        if (type == 'expense') expense += amt;
        if (type == 'transfer') xferOut += amt;
      }
      if (toId == accountId && type == 'transfer') {
        xferIn += amt;
      }
    }
    return openingBalance + income - expense + xferIn - xferOut;
  }

  /// Calculates total net worth from account balances, debts, and investments.
  static double calculateNetWorth({
    required double totalAccountBalances,
    required double totalDebt,
    required double totalReceivable,
    required double investmentValue,
    required double savingsGoalsValue,
  }) {
    return totalAccountBalances + investmentValue + savingsGoalsValue - totalDebt + totalReceivable;
  }
}
