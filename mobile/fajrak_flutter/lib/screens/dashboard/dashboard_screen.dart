import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../widgets/dashboard/charts_card.dart';
import '../../widgets/dashboard/budget_progress_card.dart';
import '../../widgets/dashboard/quick_links_card.dart';
import '../../widgets/dashboard/gamification_card.dart';
import '../../widgets/dashboard/wealth_simulator_card.dart';
import '../../widgets/dashboard/challenges_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';

import '../../widgets/dashboard/dashboard_stats.dart';
import '../../widgets/dashboard/dashboard_health_score.dart';
import '../../widgets/dashboard/dashboard_quick_add.dart';
import '../../widgets/dashboard/dashboard_stage_card.dart';
import '../../widgets/dashboard/recent_transactions_list.dart';
import '../../services/currency_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  double _income = 0, _expenses = 0, _net = 0;
  int _healthScore = 0;
  String _currency = 'JOD';
  String _name = '';
  List<Map<String, dynamic>> _recentTx = [];
  final List<Map<String, dynamic>> _months6Data = [];
  final List<Map<String, dynamic>> _categoryData = [];
  double _totalDebt = 0, _invValue = 0, _goalsSaved = 0, _goalsTarget = 0;
  final double _prevExpenses = 0;
  final double _foodSpending = 0, _entertainmentSpending = 0;
  String _stage = 'awareness';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) { if (mounted) setState(() => _loading = false); return; }

      final now = DateTime.now();
      final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];

      final results = await Future.wait<dynamic>([
        Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single(),
        Supabase.instance.client.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay),
        Supabase.instance.client.from('transactions').select('id, type, amount, category, description, transaction_date').eq('user_id', user.id).order('transaction_date', ascending: false).limit(5),
        Supabase.instance.client.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
        Supabase.instance.client.from('investments').select('shares, current_price').eq('user_id', user.id),
        Supabase.instance.client.from('savings_goals').select('current_amount, target_amount').eq('user_id', user.id),
      ]);

      final profile = results[0] as Map<String, dynamic>;
      final txs = results[1] as List;
      final recent = results[2] as List;
      final debts = results[3] as List;
      final investments = results[4] as List;
      final goals = results[5] as List;

      double txIncome = 0, txExpenses = 0;
      for (final tx in txs) {
        if (tx['type'] == 'income') {
          txIncome += (tx['amount'] as num).toDouble();
        } else {
          txExpenses += (tx['amount'] as num).toDouble();
        }
      }

      final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      final income = txIncome > 0 ? txIncome : profileIncome;
      final totalDebt = debts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
      final totalMonthly = debts.fold(0.0, (a, d) => a + ((d['monthly_payment'] as num?) ?? 0).toDouble());
      final invValue = investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
      final goalsSaved = goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());

      int score = 0;
      final savingsRate = income > 0 ? (income - txExpenses) / income : 0;
      if (savingsRate >= 0.2) {
        score += 30;
      } else if (savingsRate >= 0.1) {
        score += 20;
      } else if (savingsRate > 0) {
        score += 10;
      }
      if (totalDebt == 0) {
        score += 25;
      } else if (income > 0 && totalDebt / (income * 12) < 0.3) {
        score += 15;
      }
      if (goalsSaved > 0) {
        score += 20;
      }
      if (invValue > 0) {
        score += 15;
      }
      if (txs.length >= 10) {
        score += 10;
      }

      String stage = 'awareness';
      if (totalDebt > 0 && income > 0 && totalMonthly / income > 0.3) {
        stage = 'debt';
      } else if (totalDebt == 0 && goalsSaved < income * 3) {
        stage = 'emergency';
      } else if (invValue > 0) {
        stage = 'investing';
      }

      if (mounted) {
        setState(() {
        _name = (profile['full_name'] as String?)?.split(' ').first ?? '';
        _currency = profile['currency'] as String? ?? 'JOD';
        _income = income;
        _expenses = txExpenses;
        _net = income - txExpenses;
        _recentTx = recent.cast<Map<String, dynamic>>();
        _healthScore = score.clamp(0, 100);
        _stage = stage;
        _totalDebt = totalDebt;
        _invValue = invValue;
        _goalsSaved = goalsSaved;
        _goalsTarget = goals.fold(0.0, (a, g) => a + (g['target_amount'] as num).toDouble());
        _loading = false;
      });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _quickAdd(String type, double amount, String category, {double? originalAmount, String? originalCurrency, double? exchangeRate}) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    HapticFeedback.mediumImpact();
    try {
      await Supabase.instance.client.from('transactions').insert({
        'user_id': user.id, 
        'type': type, 
        'amount': amount,
        'original_amount': originalAmount ?? amount,
        'original_currency': originalCurrency ?? _currency,
        'exchange_rate': exchangeRate ?? 1.0,
        'category': category, 
        'description': category,
        'transaction_date': DateTime.now().toIso8601String().split('T')[0],
      });
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('toast_saved'.tr(), style: const TextStyle(fontFamily: 'Cairo')), backgroundColor: const Color(0xFF10B981)));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('toast_error_save'.tr(), style: const TextStyle(fontFamily: 'Cairo')), backgroundColor: const Color(0xFFEF4444)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (_loading) {
      return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Center(child: CircularProgressIndicator(color: colorScheme.primary)));
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: RefreshIndicator(
        onRefresh: _load,
        color: colorScheme.primary,
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              DashboardHeader(name: _name),
              const SizedBox(height: 16),
              DashboardStats(income: _income, expenses: _expenses, net: _net, colorScheme: colorScheme),
              const SizedBox(height: 16),
              DashboardHealthScore(score: _healthScore, colorScheme: colorScheme),
              const SizedBox(height: 16),
              DashboardQuickAdd(currency: _currency, onAdd: _quickAdd, colorScheme: colorScheme),
              const SizedBox(height: 16),
              DashboardStageCard(stage: _stage),
              const SizedBox(height: 16),
              ChartsCard(months6Data: _months6Data, categoryData: _categoryData, currency: _currency),
              const SizedBox(height: 16),
              BudgetProgressCard(income: _income, expenses: _expenses, currency: _currency),
              const SizedBox(height: 16),
              QuickLinksCards(totalDebt: _totalDebt, invValue: _invValue, goalsSaved: _goalsSaved, goalsTarget: _goalsTarget, currency: _currency),
              const SizedBox(height: 16),
              GamificationCard(score: _healthScore),
              const SizedBox(height: 16),
              WealthSimulatorCard(currency: _currency),
              const SizedBox(height: 16),
              ChallengesCard(expensesFood: _foodSpending, expectedFoodLimit: 50, income: _income, net: _net, prevExpenses: _prevExpenses, currentExpenses: _expenses, expensesEntertainment: _entertainmentSpending, currency: _currency),
              const SizedBox(height: 16),
              RecentTransactionsList(transactions: _recentTx, currency: _currency, colorScheme: colorScheme),
            ]),
          ),
        ),
      ),
    );
  }
}
