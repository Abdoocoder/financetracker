import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app_state.dart';
import '../../services/currency_service.dart';
import '../../services/accounts_service.dart';
import '../../widgets/dashboard/charts_card.dart';
import '../../widgets/dashboard/budget_progress_card.dart';
import '../../widgets/dashboard/quick_links_card.dart';
import '../../widgets/dashboard/gamification_card.dart';
import '../../widgets/dashboard/wealth_simulator_card.dart';
import '../../widgets/dashboard/challenges_card.dart';
import '../../widgets/dashboard/dashboard_header.dart';
import '../../services/finance_service.dart';
import '../../widgets/common/glass_panel.dart';
import '../../widgets/common/skeleton_loader.dart';

import '../../widgets/dashboard/dashboard_stats.dart';
import '../../widgets/dashboard/dashboard_health_score.dart';
import '../../widgets/dashboard/dashboard_quick_add.dart';
import '../../widgets/dashboard/dashboard_stage_card.dart';
import '../../widgets/dashboard/recent_transactions_list.dart';
import '../../widgets/dashboard/net_worth_card.dart';
import '../../widgets/dashboard/month_summary_card.dart';
import '../../widgets/dashboard/dashboard_customizer_sheet.dart';
import '../../providers/dashboard_layout_provider.dart';
import 'package:provider/provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _accountsLoading = true;
  bool _loading = true;
  bool _hasError = false;
  bool _saving = false;
  double _income = 0, _expenses = 0, _net = 0, _monthlyDebtCommitments = 0;
  double _totalAccountsBalance = 0;
  List<Map<String, dynamic>> _accounts = [];
  int _healthScore = 0;
  String _currency = 'JOD';
  String _name = '';
  List<Map<String, dynamic>> _recentTx = [];
  List<Map<String, dynamic>> _months6Data = [];
  List<Map<String, dynamic>> _categoryData = [];
  double _totalDebt = 0, _totalReceivable = 0, _netWorth = 0, _invValue = 0, _goalsSaved = 0, _goalsTarget = 0;
  double _prevIncome = 0, _prevExpenses = 0;
  DateTime? _lastUpdated;
  final double _foodSpending = 0, _entertainmentSpending = 0;
  String _stage = 'awareness';
  int _loadedTransactionVersion = 0;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() { _accountsLoading = true; _loading = true; _hasError = false; });
    await _loadPhase1();
    await _loadPhase2();
  }

  /// Phase 1 — accounts only (fast, shows hero card immediately)
  Future<void> _loadPhase1() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) { if (mounted) setState(() { _accountsLoading = false; }); return; }
      final accounts = await AccountsService.fetchAccounts();
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
      final prevMonthStart = DateTime(now.year, now.month - 1, 1).toIso8601String().split('T')[0];
      final prevMonthEnd = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];
      final sixMonthsAgo = DateTime(now.year, now.month - 5, 1).toIso8601String().split('T')[0];

      // Parallel batch — base table queries only (RPC calls handled separately with fallbacks)
      final results = await Future.wait<dynamic>([
        /* 0 */ Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single(),
        /* 1 */ Supabase.instance.client.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay),
        /* 2 */ Supabase.instance.client.from('transactions').select('id, type, amount, category, description, transaction_date').eq('user_id', user.id).order('transaction_date', ascending: false).limit(5),
        /* 3 */ Supabase.instance.client.from('debts').select('remaining_amount, monthly_payment, debt_type, auto_deduct').eq('user_id', user.id).eq('is_paid', false),
        /* 4 */ Supabase.instance.client.from('investments').select('shares, current_price').eq('user_id', user.id),
        /* 5 */ Supabase.instance.client.from('savings_goals').select('current_amount, target_amount').eq('user_id', user.id),
        /* 6 */ Supabase.instance.client.from('transactions').select('type, amount, category, transaction_date').eq('user_id', user.id).gte('transaction_date', sixMonthsAgo).order('transaction_date', ascending: true),
        // prev month totals for MonthSummaryCard (only fetched in first 7 days)
        if (now.day <= 7)
          /* 7 */ Supabase.instance.client.from('transactions').select('type, amount')
              .eq('user_id', user.id).gte('transaction_date', prevMonthStart).lt('transaction_date', prevMonthEnd),
      ]);

      final profile = results[0] as Map<String, dynamic>;
      final currentMonthTxs = results[1] as List;
      final recent = results[2] as List;
      final debts = results[3] as List;
      final goals = results[5] as List;
      final chartsList = results[6] as List;

      // ── Build 6-month aggregated data from already-fetched chartsList ──
      final monthMap = <String, Map<String, double>>{};
      for (final tx in chartsList) {
        final date = tx['transaction_date'] as String;
        final monthKey = date.substring(0, 7); // "YYYY-MM"
        monthMap.putIfAbsent(monthKey, () => {'income': 0.0, 'expenses': 0.0});
        final amount = (tx['amount'] as num).toDouble();
        if (tx['type'] == 'income') {
          monthMap[monthKey]!['income'] = (monthMap[monthKey]!['income'] ?? 0) + amount;
        } else if (tx['type'] == 'expense') {
          monthMap[monthKey]!['expenses'] = (monthMap[monthKey]!['expenses'] ?? 0) + amount;
        }
      }
      final months6 = monthMap.entries.map((e) => {
        'month': e.key,
        'income': e.value['income'] ?? 0.0,
        'expenses': e.value['expenses'] ?? 0.0,
      }).toList();

      // ── Build category breakdown (current month expenses only) ──
      final catMap = <String, double>{};
      for (final tx in chartsList) {
        if (tx['type'] == 'expense' && (tx['transaction_date'] as String).startsWith('${now.year}-${now.month.toString().padLeft(2, '0')}')) {
          final cat = tx['category'] as String? ?? 'other';
          catMap[cat] = (catMap[cat] ?? 0) + (tx['amount'] as num).toDouble();
        }
      }
      final totalCatExpenses = catMap.values.fold(0.0, (a, b) => a + b);
      final catData = catMap.entries.map((e) => {
        'category': e.key,
        'amount': e.value,
        'percentage': totalCatExpenses > 0 ? (e.value / totalCatExpenses).clamp(0.0, 1.0) : 0.0,
      }).toList();

      // Monthly summary via RPC — fallback to calculating from already-fetched transactions
      Map<String, dynamic> monthly;
      try {
        monthly = await FinanceService.fetchMonthlyFinancialSummary(year: now.year, month: now.month);
      } catch (_) {
        final inc = currentMonthTxs.where((t) => t['type'] == 'income').fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
        final exp = currentMonthTxs.where((t) => t['type'] == 'expense').fold(0.0, (a, t) => a + (t['amount'] as num).toDouble());
        monthly = {'income': inc, 'expenses': exp, 'debt_payments': 0.0, 'net': inc - exp};
      }

      final income = (monthly['income'] as num?)?.toDouble() ?? 0.0;
      final txExpenses = (monthly['expenses'] as num?)?.toDouble() ?? 0.0;
      final net = (monthly['net'] as num?)?.toDouble() ?? (income - txExpenses);

      final currency = (profile['currency'] as String? ?? 'JOD').toUpperCase();
      final usdToLocal = currency != 'USD'
          ? (await CurrencyService.fetchExchangeRate('USD', currency) ?? 1.0)
          : 1.0;
      // Financial dashboard via RPC — fallback to zeros if function not available
      Map<String, dynamic> dash;
      try {
        dash = await FinanceService.fetchFinancialDashboard(usdToLocal);
      } catch (_) {
        dash = {
          'net_worth': 0.0, 'total_accounts_balance': 0.0,
          'investments_value_local': 0.0, 'goals_saved': 0.0,
          'total_debt_owed': 0.0, 'total_receivable': 0.0,
          'monthly_debt_commitments': 0.0, 'health_score': 0,
        };
      }
      
      final netWorth = (dash['net_worth'] as num).toDouble();
      final totalDebt = (dash['total_debt_owed'] as num).toDouble();
      final totalReceivable = (dash['total_receivable'] as num).toDouble();
      final invValue = (dash['investments_value_local'] as num).toDouble();
      final goalsSaved = (dash['goals_saved'] as num).toDouble();

      final totalMonthly = debts.fold(0.0, (a, d) => a + ((d['monthly_payment'] as num?) ?? 0).toDouble());
      final monthlyDebtCommitments = debts
          .where((d) => d['auto_deduct'] == true && (d['debt_type'] ?? 'owed') == 'owed')
          .fold(0.0, (a, d) => a + ((d['monthly_payment'] as num?) ?? 0).toDouble());

      // Use Centralized Database RPC for Health Score
      int score = (dash['health_score'] as num?)?.toInt() ?? 0;

      String stage = 'awareness';
      if (totalDebt > 0 && income > 0 && totalMonthly / income > 0.3) {
        stage = 'debt';
      } else if (totalDebt == 0 && goalsSaved < income * 3) {
        stage = 'emergency';
      } else if (invValue > 0) {
        stage = 'investing';
      }

      // ── prev month summary ──
      double prevIncome = 0, prevExpenses = 0;
      if (now.day <= 7 && results.length > 7) {
        final prevTxs = results[7] as List;
        for (final tx in prevTxs) {
          if (tx['type'] == 'income') {
            prevIncome += (tx['amount'] as num).toDouble();
          } else if (tx['type'] == 'expense') {
            prevExpenses += (tx['amount'] as num).toDouble();
          }
        }
      }
      if (mounted) {
        setState(() {
          _name = (profile['full_name'] as String?)?.split(' ').first ?? '';
          _currency = currency;
          _income = income;
          _expenses = txExpenses;
          _net = net;
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
          _prevIncome = prevIncome;
          _prevExpenses = prevExpenses;
          _months6Data = months6;
          _categoryData = catData;
          _lastUpdated = DateTime.now();
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('Dashboard _loadPhase2 error: $e');
      if (mounted) setState(() { _loading = false; _hasError = true; });
    }
  }

  Future<void> _quickAdd(String type, double amount, String category, {double? originalAmount, String? originalCurrency, double? exchangeRate}) async {
    if (_saving) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    _saving = true;
    setState(() {});
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
        final cs = Theme.of(context).colorScheme;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('toast_saved'.tr(), style: const TextStyle()), backgroundColor: cs.primary));
      }
    } catch (e) {
      if (mounted) {
        final cs = Theme.of(context).colorScheme;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('toast_error_save'.tr(), style: const TextStyle()), backgroundColor: cs.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final txVersion = context.watch<AppState>().transactionVersion;
    if (txVersion != _loadedTransactionVersion) {
      _loadedTransactionVersion = txVersion;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_loading) _load();
      });
    }
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final layout = context.watch<DashboardLayoutProvider>();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: RefreshIndicator(
        onRefresh: _load,
        color: colorScheme.primary,
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: _hasError
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.wifi_off_rounded, size: 56, color: colorScheme.onSurface.withValues(alpha: 0.3)),
                      const SizedBox(height: 16),
                      Text('error_load_failed'.tr(), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: colorScheme.onSurface), textAlign: TextAlign.center),
                      const SizedBox(height: 8),
                      Text('error_check_connection'.tr(), style: TextStyle(fontSize: 13, color: colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: _load,
                        icon: const Icon(Icons.refresh_rounded),
                        label: Text('btn_retry'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                      ),
                    ]),
                  ),
                )
              : _loading
              ? const PageSkeleton()
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

              // ── 1. Header + Customize button ─────────────────────
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: DashboardHeader(name: _name)),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => showDashboardCustomizer(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: colorScheme.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.tune_rounded, size: 14, color: colorScheme.primary),
                        const SizedBox(width: 4),
                        Text(
                          'dash_customize'.tr(),
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: colorScheme.primary),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
              if (_lastUpdated != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 12),
                  child: Text(
                    '${'last_updated'.tr()}: ${DateFormat('HH:mm').format(_lastUpdated!)}',
                    style: TextStyle(fontSize: 11, color: colorScheme.onSurface.withValues(alpha: 0.5), fontWeight: FontWeight.w600),
                  ),
                ),
              const SizedBox(height: 12),

              // ── 2. Month Summary Banner (days 1-7 of new month) ──
              if (!_loading && layout.isVisible(DashCardId.monthSummary))
                Builder(builder: (ctx) {
                  const monthKeys = ['month_jan', 'month_feb', 'month_mar', 'month_apr',
                    'month_may', 'month_jun', 'month_jul', 'month_aug', 'month_sep',
                    'month_oct', 'month_nov', 'month_dec'];
                  final prevIdx = (DateTime.now().month - 2 + 12) % 12;
                  final prevName = monthKeys[prevIdx].tr();
                  return MonthSummaryCard(
                    prevIncome: _prevIncome,
                    prevExpenses: _prevExpenses,
                    currency: _currency,
                    prevMonthName: prevName,
                  );
                }),

              // ── 3. Hero Balance Card ──────────────────────────────
              if (layout.isVisible(DashCardId.heroBalance))
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 400),
                  child: _accountsLoading
                      ? const CardSkeleton(height: 110)
                      : _AccountsBalanceCard(key: const ValueKey('hero-card'), accounts: _accounts, totalBalance: _totalAccountsBalance, currency: _currency),
                ),
              const SizedBox(height: 12),

              // ── 4. Monthly Stats ──────────────────────────────────
              if (layout.isVisible(DashCardId.monthlyStats))
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _loading
                      ? Row(key: const ValueKey('stats-skel'), children: const [
                          Expanded(child: CardSkeleton(height: 70)),
                          SizedBox(width: 8),
                          Expanded(child: CardSkeleton(height: 70)),
                          SizedBox(width: 8),
                          Expanded(child: CardSkeleton(height: 70)),
                        ])
                      : DashboardStats(key: const ValueKey('stats'), income: _income, expenses: _expenses, net: _net, totalBalance: _totalAccountsBalance, monthlyDebtCommitments: _monthlyDebtCommitments, colorScheme: colorScheme),
                ),
              const SizedBox(height: 16),

              // ── 5. Quick Add — always visible (required) ──────────
              DashboardQuickAdd(currency: _currency, onAdd: _quickAdd, colorScheme: colorScheme),
              const SizedBox(height: 16),

              // ── 6. Recent Transactions ────────────────────────────
              if (layout.isVisible(DashCardId.recentTx))
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _loading
                      ? const CardSkeleton(height: 180)
                      : RecentTransactionsList(key: const ValueKey('recent'), transactions: _recentTx, currency: _currency, colorScheme: colorScheme),
                ),

              // ── Secondary sections — after phase 2 ────────────────
              if (_loading) ...[
                const SizedBox(height: 16),
                const SkeletonLoader(width: double.infinity, height: 80, borderRadius: 16),
                const SizedBox(height: 12),
                const SkeletonLoader(width: double.infinity, height: 100, borderRadius: 16),
              ],
              if (!_loading) ...[
                const SizedBox(height: 16),
                if (layout.isVisible(DashCardId.netWorth) && _invValue + _goalsSaved + _totalDebt > 0)
                  RepaintBoundary(child: NetWorthCard(netWorth: _netWorth, invValue: _invValue, goalsSaved: _goalsSaved, totalDebt: _totalDebt, totalReceivable: _totalReceivable, currency: _currency)),
                if (layout.isVisible(DashCardId.healthScore))
                  RepaintBoundary(child: DashboardHealthScore(score: _healthScore, colorScheme: colorScheme)),
                if (layout.isVisible(DashCardId.stage)) ...[
                  const SizedBox(height: 16),
                  DashboardStageCard(stage: _stage),
                ],
                if (layout.isVisible(DashCardId.charts)) ...[
                  const SizedBox(height: 16),
                  RepaintBoundary(child: ChartsCard(months6Data: _months6Data, categoryData: _categoryData, currency: _currency)),
                ],
                if (layout.isVisible(DashCardId.budgets)) ...[
                  const SizedBox(height: 16),
                  BudgetProgressCard(income: _income, expenses: _expenses, currency: _currency),
                ],
                if (layout.isVisible(DashCardId.quickLinks)) ...[
                  const SizedBox(height: 16),
                  QuickLinksCards(totalDebt: _totalDebt, invValue: _invValue, goalsSaved: _goalsSaved, goalsTarget: _goalsTarget, currency: _currency),
                ],
                if (layout.isVisible(DashCardId.gamification)) ...[
                  const SizedBox(height: 16),
                  GamificationCard(score: _healthScore),
                ],
                if (layout.isVisible(DashCardId.simulator)) ...[
                  const SizedBox(height: 16),
                  RepaintBoundary(child: WealthSimulatorCard(currency: _currency)),
                ],
                if (layout.isVisible(DashCardId.challenges)) ...[
                  const SizedBox(height: 16),
                  ChallengesCard(expensesFood: _foodSpending, expectedFoodLimit: 50, income: _income, net: _net, prevExpenses: _prevExpenses, currentExpenses: _expenses, expensesEntertainment: _entertainmentSpending, currency: _currency),
                ],
              ],
            ]),
          ),
        ),
      ),
    );
  }
}

class _AccountsBalanceCard extends StatelessWidget {
  final List<Map<String, dynamic>> accounts;
  final double totalBalance;
  final String currency;
  const _AccountsBalanceCard({super.key, required this.accounts, required this.totalBalance, required this.currency});

  String _fmt(double n) => n.abs() % 1 == 0 ? n.abs().toStringAsFixed(0) : n.abs().toStringAsFixed(2);

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isPositive = totalBalance >= 0;
    final color = isPositive ? cs.primary : cs.error;

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
            Text('dash_accounts_total'.tr(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: cs.onSurfaceVariant)),
            const SizedBox(height: 2),
            Text('dash_accounts_all'.tr(), style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('${isPositive ? '+' : '-'}${_fmt(totalBalance)}',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: color)),
            Text(currency, style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
          ]),
        ]),
        if (accounts.length > 1) ...[
          const SizedBox(height: 10),
          Divider(height: 1, color: cs.outlineVariant),
          const SizedBox(height: 8),
          ...accounts.map((acc) {
            final bal = acc['balance'] as double? ?? 0;
            final balColor = bal >= 0 ? cs.primary : cs.error;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(children: [
                Text(acc['icon'] as String? ?? '🏦', style: const TextStyle(fontSize: 14)),
                const SizedBox(width: 6),
                Expanded(child: Text(acc['name'] as String? ?? '', style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant))),
                Text('${bal >= 0 ? '+' : '-'}${_fmt(bal)}',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: balColor)),
              ]),
            );
          }),
        ],
      ]),
    );
  }
}
