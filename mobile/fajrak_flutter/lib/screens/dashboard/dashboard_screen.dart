import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/currency_service.dart';
import '../../services/accounts_service.dart';
import '../../widgets/dashboard/charts_card.dart';
import '../../widgets/dashboard/budget_progress_card.dart';
import '../../widgets/dashboard/quick_links_card.dart';
import '../../widgets/dashboard/gamification_card.dart';
import '../../widgets/dashboard/wealth_simulator_card.dart';
import '../../widgets/dashboard/challenges_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../../widgets/common/glass_panel.dart';

import '../../widgets/dashboard/dashboard_stats.dart';
import '../../widgets/dashboard/dashboard_health_score.dart';
import '../../widgets/dashboard/dashboard_quick_add.dart';
import '../../widgets/dashboard/dashboard_stage_card.dart';
import '../../widgets/dashboard/recent_transactions_list.dart';
import '../../widgets/dashboard/net_worth_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _accountsLoading = true;
  bool _loading = true;
  double _income = 0, _expenses = 0, _net = 0, _monthlyDebtCommitments = 0;
  double _totalAccountsBalance = 0;
  List<Map<String, dynamic>> _accounts = [];
  int _healthScore = 0;
  String _currency = 'JOD';
  String _name = '';
  List<Map<String, dynamic>> _recentTx = [];
  final List<Map<String, dynamic>> _months6Data = [];
  final List<Map<String, dynamic>> _categoryData = [];
  double _totalDebt = 0, _totalReceivable = 0, _netWorth = 0, _invValue = 0, _goalsSaved = 0, _goalsTarget = 0;
  DateTime? _lastUpdated;
  final double _prevExpenses = 0;
  final double _foodSpending = 0, _entertainmentSpending = 0;
  String _stage = 'awareness';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _accountsLoading = true; _loading = true; });
    await _loadPhase1();
    await _loadPhase2();
  }

  /// Phase 1 — accounts only (fast, shows hero card immediately)
  Future<void> _loadPhase1() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) { if (mounted) setState(() { _accountsLoading = false; }); return; }
      final accounts = await AccountsService.fetchAccounts(user.id);
      final totalAccountsBalance = accounts.fold(0.0, (a, acc) => a + (acc['balance'] as double? ?? 0));
      if (mounted) {
        setState(() {
          _accounts = accounts;
          _totalAccountsBalance = totalAccountsBalance;
          _accountsLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _accountsLoading = false);
    }
  }

  /// Phase 2 — all dashboard data
  Future<void> _loadPhase2() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) { if (mounted) setState(() => _loading = false); return; }

      final now = DateTime.now();
      final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];

      final results = await Future.wait<dynamic>([
        Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single(),
        Supabase.instance.client.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay),
        Supabase.instance.client.from('transactions').select('id, type, amount, category, description, transaction_date').eq('user_id', user.id).order('transaction_date', ascending: false).limit(5),
        Supabase.instance.client.from('debts').select('remaining_amount, monthly_payment, debt_type, auto_deduct').eq('user_id', user.id).eq('is_paid', false),
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
      final totalDebt = debts.where((d) => (d['debt_type'] ?? 'owed') == 'owed').fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
      final totalReceivable = debts.where((d) => d['debt_type'] == 'receivable').fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
      final totalMonthly = debts.fold(0.0, (a, d) => a + ((d['monthly_payment'] as num?) ?? 0).toDouble());
      final monthlyDebtCommitments = debts
          .where((d) => d['auto_deduct'] == true && (d['debt_type'] ?? 'owed') == 'owed')
          .fold(0.0, (a, d) => a + ((d['monthly_payment'] as num?) ?? 0).toDouble());
      final invValueUsd = investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
      final goalsSaved = goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
      final currency = profile['currency'] as String? ?? 'JOD';
      final usdToLocal = currency != 'USD'
          ? (await CurrencyService.fetchExchangeRate('USD', currency) ?? 1.0)
          : 1.0;
      final invValue = invValueUsd * usdToLocal;
      
      // FIX: Include _totalAccountsBalance in Net Worth calculation (Audit Report Fix)
      final netWorth = FinanceUtils.calculateNetWorth(
        totalAccountBalances: _totalAccountsBalance,
        totalDebt: totalDebt,
        totalReceivable: totalReceivable,
        investmentValue: invValue,
        savingsGoalsValue: goalsSaved,
      );

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
      if (goalsSaved > 0) score += 20;
      if (invValue > 0) score += 15;
      if (txs.length >= 10) score += 10;

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
          _currency = currency;
          _income = income;
          _expenses = txExpenses;
          _net = income - txExpenses;
          _monthlyDebtCommitments = monthlyDebtCommitments;
          _recentTx = recent.cast<Map<String, dynamic>>();
          _healthScore = score.clamp(0, 100);
          _stage = stage;
          _totalDebt = totalDebt;
          _totalReceivable = totalReceivable;
          _netWorth = netWorth;
          _invValue = invValue;
          _goalsSaved = goalsSaved;
          _goalsTarget = goals.fold(0.0, (a, g) => a + (g['target_amount'] as num).toDouble());
          _lastUpdated = DateTime.now();
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

              // ── 1. Header — instant ───────────────────────────────
              DashboardHeader(name: _name),
              if (_lastUpdated != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 12),
                  child: Text(
                    '${'last_updated'.tr()}: ${DateFormat('HH:mm').format(_lastUpdated!)}',
                    style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withValues(alpha: 0.5), fontWeight: FontWeight.w600),
                  ),
                ),
              const SizedBox(height: 12),

              // ── 2. Hero Balance Card — after phase 1 ─────────────
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 400),
                child: _accountsLoading
                    ? _SkeletonBox(key: const ValueKey('hero-skel'), height: 110, radius: 18)
                    : _AccountsBalanceCard(key: const ValueKey('hero-card'), accounts: _accounts, totalBalance: _totalAccountsBalance, currency: _currency),
              ),
              const SizedBox(height: 12),

              // ── 3. Monthly Stats — after phase 2 ─────────────────
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _loading
                    ? Row(key: const ValueKey('stats-skel'), children: [
                        Expanded(child: _SkeletonBox(height: 70, radius: 14)),
                        const SizedBox(width: 8),
                        Expanded(child: _SkeletonBox(height: 70, radius: 14)),
                        const SizedBox(width: 8),
                        Expanded(child: _SkeletonBox(height: 70, radius: 14)),
                      ])
                    : DashboardStats(key: const ValueKey('stats'), income: _income, expenses: _expenses, net: _net, monthlyDebtCommitments: _monthlyDebtCommitments, colorScheme: colorScheme),
              ),
              const SizedBox(height: 16),

              // ── 4. Quick Add — always visible ────────────────────
              DashboardQuickAdd(currency: _currency, onAdd: _quickAdd, colorScheme: colorScheme),
              const SizedBox(height: 16),

              // ── 5. Recent Transactions skeleton or real ───────────
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _loading
                    ? _SkeletonBox(key: const ValueKey('recent-skel'), height: 180, radius: 16)
                    : RecentTransactionsList(key: const ValueKey('recent'), transactions: _recentTx, currency: _currency, colorScheme: colorScheme),
              ),

              // ── 6–end. Secondary sections — after phase 2 ─────────
              if (_loading) ...[
                const SizedBox(height: 16),
                _SkeletonBox(height: 80, radius: 16),
                const SizedBox(height: 12),
                _SkeletonBox(height: 100, radius: 16),
              ],
              if (!_loading) ...[
                const SizedBox(height: 16),
                if (_invValue + _goalsSaved + _totalDebt > 0)
                  NetWorthCard(netWorth: _netWorth, invValue: _invValue, goalsSaved: _goalsSaved, totalDebt: _totalDebt, totalReceivable: _totalReceivable, currency: _currency),
                DashboardHealthScore(score: _healthScore, colorScheme: colorScheme),
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
              ],
            ]),
          ),
        ),
      ),
    );
  }
}

// ── Skeleton shimmer box ──────────────────────────────────────────
class _SkeletonBox extends StatefulWidget {
  final double height;
  final double radius;
  const _SkeletonBox({super.key, required this.height, this.radius = 12});
  @override
  State<_SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<_SkeletonBox> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.3, end: 0.7).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }
  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _anim,
    builder: (_, __) => Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: Color.lerp(const Color(0xFF1E293B), const Color(0xFF334155), _anim.value),
        borderRadius: BorderRadius.circular(widget.radius),
      ),
    ),
  );
}

class _AccountsBalanceCard extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;
  final double totalBalance;
  final String currency;
  const _AccountsBalanceCard({super.key, required this.accounts, required this.totalBalance, required this.currency});

  String _fmt(double n) => n.abs() % 1 == 0 ? n.abs().toStringAsFixed(0) : n.abs().toStringAsFixed(2);

  @override
  Widget build(BuildContext context) {
    final isPositive = totalBalance >= 0;
    final color = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return GlassPanel(
      padding: const EdgeInsets.all(16),
      borderRadius: 18,
      blur: 15,
      opacity: 0.1,
      color: color,
      borderColor: color.withValues(alpha: 0.3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('💰 إجمالي الرصيد', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
            const SizedBox(height: 2),
            const Text('عبر جميع الحسابات', style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontFamily: 'Cairo')),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${isPositive ? '+' : '-'}${_fmt(totalBalance)}',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color, fontFamily: 'monospace')),
            Text(currency, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontFamily: 'Cairo')),
          ]),
        ]),
        if (accounts.length > 1) ...[
          const SizedBox(height: 10),
          const Divider(height: 1, color: Color(0xFF1E293B)),
          const SizedBox(height: 8),
          ...accounts.map((acc) {
            final bal = acc['balance'] as double? ?? 0;
            final balColor = bal >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444);
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(children: [
                Text(acc['icon'] as String? ?? '🏦', style: const TextStyle(fontSize: 14)),
                const SizedBox(width: 6),
                Expanded(child: Text(acc['name'] as String? ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontFamily: 'Cairo'))),
                Text('${bal >= 0 ? '+' : '-'}${_fmt(bal)}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: balColor, fontFamily: 'monospace')),
              ]),
            );
          }),
        ],
      ]),
    );
  }
}
