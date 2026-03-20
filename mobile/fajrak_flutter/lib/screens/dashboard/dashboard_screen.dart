import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import '../../widgets/dashboard/charts_card.dart';
import '../../widgets/dashboard/budget_progress_card.dart';
import '../../widgets/dashboard/quick_links_card.dart';
import '../../widgets/dashboard/gamification_card.dart';
import '../../widgets/dashboard/wealth_simulator_card.dart';
import '../../widgets/dashboard/challenges_card.dart';
import '../../widgets/dashboard/badges_grid.dart';
import 'package:easy_localization/easy_localization.dart';
import '../alerts/alerts_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  double _income = 0, _expenses = 0, _net = 0;
  int _healthScore = 0;
  String _currency = 'inv_jod'.tr();
  String _name = '';
  int _unreadAlerts = 0;
  List<Map<String, dynamic>> _recentTx = [];
  List<Map<String, dynamic>> _months6Data = [];
  List<Map<String, dynamic>> _categoryData = [];
  double _totalDebt = 0;
  double _invValue = 0;
  double _goalsSaved = 0;
  double _goalsTarget = 0;
  double _prevExpenses = 0;
  String _stage = 'awareness';
  int _txCount = 0;
  int _paidDebts = 0;
  int _reachedGoals = 0;
  int _streak = 0;
  bool _hasInvestments = false;

  // Quick Add
  final _amountController = TextEditingController();
  String _selectedCategory = 'طعام';
  String _txType = 'expense';
  bool _saving = false;

  final _categories = [
    'طعام',
    'مواصلات',
    'فواتير',
    'صحة',
    'ترفيه',
    'تسوق',
    'راتب',
    'عمل حر',
    'أخرى'
  ];

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Dashboard');
    _loadAll();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    final now = DateTime.now();
    final firstDayCurrentMonth = DateTime(now.year, now.month, 1);
    final firstDay6MonthsAgo =
        DateTime(now.year, now.month - 5, 1).toIso8601String().split('T')[0];

    try {
      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('profiles')
            .select('full_name, monthly_income, currency')
            .eq('id', user.id)
            .single(),
        Supabase.instance.client
            .from('transactions')
            .select('type, amount, transaction_date, category')
            .eq('user_id', user.id)
            .gte('transaction_date', firstDay6MonthsAgo),
        Supabase.instance.client
            .from('transactions')
            .select('id, type, amount, category, description, transaction_date')
            .eq('user_id', user.id)
            .order('transaction_date', ascending: false)
            .limit(5),
        Supabase.instance.client
            .from('debts')
            .select('remaining_amount, monthly_payment')
            .eq('user_id', user.id)
            .eq('is_paid', false),
        Supabase.instance.client
            .from('investments')
            .select('shares, current_price')
            .eq('user_id', user.id),
        Supabase.instance.client
            .from('savings_goals')
            .select('current_amount, target_amount')
            .eq('user_id', user.id),
        Supabase.instance.client
            .from('alerts')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_read', false)
            .count(),
        Supabase.instance.client
            .from('debts')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_paid', true)
            .count(),
        Supabase.instance.client
            .from('profiles')
            .select('lesson_streak')
            .eq('id', user.id)
            .single(),
      ]);

      final profile = results[0] as Map<String, dynamic>;
      final txs = results[1] as List;
      final recent = results[2] as List;
      final debts = results[3] as List;
      final investments = results[4] as List;
      final goals = results[5] as List;
      final alertsRes = results[6] as dynamic;

      double txIncome = 0, txExpenses = 0, prevExpenses = 0;
      Map<String, double> catMap = {};

      // Group tx into months and categories
      List<Map<String, dynamic>> months6 = List.generate(6, (i) {
        final d = DateTime(now.year, now.month - (5 - i), 1);
        final key = '${d.year}-${d.month.toString().padLeft(2, '0')}';
        return {
          'month': '${d.month}/${d.year}',
          'key': key,
          'income': 0.0,
          'expense': 0.0
        };
      });

      for (final tx in txs) {
        final amount = (tx['amount'] as num).toDouble();
        final dateStr = tx['transaction_date'] as String?;
        if (dateStr == null) continue;

        final key = dateStr.substring(0, 7); // YYYY-MM
        final type = tx['type'] as String?;
        final isIncome = type == 'income';
        final isExpense = type == 'expense';

        for (var m in months6) {
          if (m['key'] == key) {
            if (isIncome) {
              m['income'] += amount;
            } else if (isExpense) {
              m['expense'] += amount;
            }
          }
        }

        final txDate = DateTime.parse(dateStr);
        if (txDate
            .isAfter(firstDayCurrentMonth.subtract(const Duration(days: 1)))) {
          if (isIncome) {
            txIncome += amount;
          } else if (isExpense) {
            txExpenses += amount;
            final cat = tx['category'] as String? ?? 'أخرى';
            catMap[cat] = (catMap[cat] ?? 0) + amount;
          }
        } else if (txDate.isAfter(DateTime(now.year, now.month - 1, 1)
                .subtract(const Duration(days: 1))) &&
            txDate.isBefore(firstDayCurrentMonth)) {
          if (isExpense) {
            prevExpenses += amount;
          }
        }
      }

      final sortedCats = catMap.entries.toList()
        ..sort((a, b) => b.value.compareTo(a.value));
      final categories = sortedCats.take(5).map((e) {
        return {
          'category': e.key,
          'amount': e.value,
          'percentage': txExpenses > 0 ? e.value / txExpenses : 0.0,
        };
      }).toList();

      final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      final income = txIncome > 0 ? txIncome : profileIncome;
      final totalDebt = debts.fold(
          0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
      final totalMonthly = debts.fold(
          0.0, (a, d) => a + (d['monthly_payment'] as num? ?? 0).toDouble());
      final invValue = investments.fold(
          0.0,
          (a, i) =>
              a +
              (i['shares'] as num).toDouble() *
                  (i['current_price'] as num).toDouble());
      final goalsSaved =
          goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
      final goalsTarget = goals.fold(
          0.0, (a, g) => a + (g['target_amount'] as num? ?? 0).toDouble());

      // Health Score
      int score = 0;
      final savingsRate = income > 0 ? (income - txExpenses) / income : 0;
      if (savingsRate >= 0.2) {
        score += 30;
      } else if (savingsRate >= 0.1)
        score += 20;
      else if (savingsRate > 0) score += 10;
      final debtRatio = income > 0 ? totalDebt / (income * 12) : 1;
      if (totalDebt == 0) {
        score += 25;
      } else if (debtRatio < 0.3)
        score += 20;
      else if (debtRatio < 0.6) score += 10;
      if (goalsSaved > 0) score += 20;
      if (invValue > 0) score += 15;
      if (txs.length >= 10) score += 10;

      // Stage
      String stage = 'awareness';
      if (totalDebt > 0 && (income > 0 && totalMonthly / income > 0.3)) {
        stage = 'debt';
      } else if (totalDebt == 0 && goalsSaved < income * 3)
        stage = 'emergency';
      else if (invValue > 0)
        stage = 'investing';
      else if (invValue > income * 12) stage = 'wealth';

      if (mounted) {
        setState(() {
          _name = (profile['full_name'] as String?)?.split(' ').first ?? '';
          _currency = profile['currency'] as String? ?? 'inv_jod'.tr();
          _income = income;
          _expenses = txExpenses;
          _net = income - txExpenses;
          _recentTx = recent.cast<Map<String, dynamic>>();
          _months6Data = months6;
          _categoryData = categories;
          _totalDebt = totalDebt;
          _invValue = invValue;
          _goalsSaved = goalsSaved;
          _goalsTarget = goalsTarget;
          _prevExpenses = prevExpenses;
          _healthScore = score.clamp(0, 100);
          _stage = stage;
          _unreadAlerts = alertsRes.count ?? 0;
          _paidDebts = (results[7] as dynamic).count ?? 0;
          _reachedGoals = goals.where((g) => (g['current_amount'] as num).toDouble() >= (g['target_amount'] as num? ?? 0).toDouble()).length;
          _streak = ((results[8] as Map<String, dynamic>)['lesson_streak'] as num?)?.toInt() ?? 0;
          _txCount = txs.length;
          _hasInvestments = investments.isNotEmpty;
        });
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Dashboard LoadAll');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _quickAdd() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    try {
      await Supabase.instance.client.from('transactions').insert({
        'user_id': user.id,
        'type': _txType,
        'amount': amount,
        'category': _selectedCategory,
        'description': _selectedCategory,
        'transaction_date': DateTime.now().toIso8601String().split('T')[0],
      });
      _amountController.clear();
      await _loadAll();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content:
                  Text('تم الإضافة ✅', style: TextStyle(fontFamily: 'Cairo')),
              backgroundColor: Color(0xFF10B981),
              duration: Duration(seconds: 2)),
        );
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Dashboard QuickAdd');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
          backgroundColor: Color(0xFF070B14),
          body: Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6))));
    }

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: RefreshIndicator(
        onRefresh: _load,
        color: const Color(0xFF3B7EF6),
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                if (_income == 0 && _expenses == 0 && _recentTx.isEmpty)
                  _buildEmptyState()
                else ...[
                  _buildStatCards(),
                  const SizedBox(height: 16),
                  _buildHealthScore(),
                  const SizedBox(height: 16),
                  _buildComparisonCard(), // Added Comparison Card
                  const SizedBox(height: 16),
                  _buildQuickAdd(),
                  const SizedBox(height: 16),
                  BudgetProgressCard(
                      income: _income,
                      expenses: _expenses,
                      currency: _currency),
                  const SizedBox(height: 16),
                  QuickLinksCards(
                      totalDebt: _totalDebt,
                      invValue: _invValue,
                      goalsSaved: _goalsSaved,
                      goalsTarget: _goalsTarget,
                      currency: _currency),
                  const SizedBox(height: 16),
                  _buildStage(),
                  const SizedBox(height: 16),
                  GamificationCard(score: _healthScore),
                  const SizedBox(height: 12),
                  BadgesGrid(
                    // Added BadgesGrid
                    score: _healthScore,
                    txCount: _txCount,
                    paidDebts: _paidDebts,
                    reachedGoals: _reachedGoals,
                    streak: _streak,
                    hasInvestments: _hasInvestments,
                  ),
                  const SizedBox(height: 16),
                  ChartsCard(
                      months6Data: _months6Data,
                      categoryData: _categoryData,
                      currency: _currency),
                  const SizedBox(height: 16),
                  WealthSimulatorCard(currency: _currency),
                  const SizedBox(height: 16),
                  _buildRecentTransactions(),
                  const SizedBox(height: 16),
                  ChallengesCard(
                    expensesFood: _categoryData.firstWhere(
                        (c) => c['category'] == 'طعام',
                        orElse: () => {'amount': 0.0})['amount'] as double,
                    income: _income,
                    net: _net,
                    prevExpenses: _prevExpenses,
                    currentExpenses: _expenses,
                    expensesEntertainment: _categoryData.firstWhere(
                        (c) => c['category'] == 'ترفيه',
                        orElse: () => {'amount': 0.0})['amount'] as double,
                    currency: _currency,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_name.isNotEmpty ? '👋 ${'dash_title'.tr()} $_name' : 'dash_title'.tr(),
              style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  fontFamily: 'Cairo')),
          Text('gamif_start'.tr().substring(0, 15), // Fallback or a localized welcome message
              style: const TextStyle(
                  fontSize: 12, color: Color(0xFF64748B), fontFamily: 'Cairo')),
        ]),
        if (_unreadAlerts > 0)
          GestureDetector(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const AlertsScreen())),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Text('🔔', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 6),
                  Text('$_unreadAlerts',
                      style: const TextStyle(
                          color: Color(0xFFF87171),
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo')),
                ],
              ),
            ),
          )
        else
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)]),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
                child: Text('ف',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        fontFamily: 'Cairo'))),
          ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
                color: const Color(0xFF3B7EF6).withValues(alpha: 0.1),
                shape: BoxShape.circle),
            child:
                const Center(child: Text('👋', style: TextStyle(fontSize: 40))),
          ),
          const SizedBox(height: 20),
          Text('onboard_welcome'.tr(),
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo')),
          const SizedBox(height: 8),
          Text(
              'gamif_start'.tr(),
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 13, fontFamily: 'Cairo')),
        ],
      ),
    );
  }

  Widget _buildStatCards() {
    return Row(children: [
      Expanded(
          child: _statCard('dash_income'.tr(), _income, const Color(0xFF10B981), '↑')),
      const SizedBox(width: 8),
      Expanded(
          child:
              _statCard('dash_expenses'.tr(), _expenses, const Color(0xFFEF4444), '↓')),
      const SizedBox(width: 8),
      Expanded(
          child: _statCard(
              'dash_net'.tr(),
              _net,
              _net >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              '=')),
    ]);
  }

  Widget _statCard(String label, double value, Color color, String icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(icon, style: TextStyle(color: color, fontSize: 12)),
        const SizedBox(height: 4),
        FittedBox(
            child: Text(value.abs().toStringAsFixed(0),
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    fontFamily: 'Cairo'))),
        Text(label,
            style: const TextStyle(
                color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _buildHealthScore() {
    final color = _healthScore >= 80
        ? const Color(0xFF10B981)
        : _healthScore >= 60
            ? const Color(0xFF3B7EF6)
            : _healthScore >= 40
                ? const Color(0xFFF59E0B)
                : const Color(0xFFEF4444);
    final label = _healthScore >= 80
        ? 'health_excellent'.tr()
        : _healthScore >= 60
            ? 'health_good'.tr()
            : _healthScore >= 40
                ? 'health_fair'.tr()
                : 'health_poor'.tr();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        SizedBox(
          width: 64,
          height: 64,
          child: Stack(alignment: Alignment.center, children: [
            CircularProgressIndicator(
                value: _healthScore / 100,
                color: color,
                backgroundColor: const Color(0xFF1E293B),
                strokeWidth: 6),
            Text('$_healthScore',
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                    fontFamily: 'Cairo')),
          ]),
        ),
        const SizedBox(width: 16),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('💊 ${'health_score'.tr()}',
              style: const TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'Cairo')),
        ])),
      ]),
    );
  }

  Widget _buildComparisonCard() {
    final diff = _expenses - _prevExpenses;
    final percent =
        _prevExpenses > 0 ? (diff / _prevExpenses * 100).abs() : 0.0;
    final isLess = diff <= 0;
    final color = isLess ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(children: [
        Icon(isLess ? Icons.trending_down : Icons.trending_up,
            color: color, size: 24),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(isLess ? 'أداء رائع! ✨' : 'انتباه للمصاريف! ⚠️',
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  fontSize: 13)),
          Text(
              isLess
                  ? 'أنفقت ${percent.toStringAsFixed(0)}% أقل من الشهر الماضي'
                  : 'أنفقت ${percent.toStringAsFixed(0)}% أكثر من الشهر الماضي',
              style: const TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
        ])),
      ]),
    );
  }

  Widget _buildQuickAdd() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('quick_add_title'.tr(),
            style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
                fontSize: 14,
                fontFamily: 'Cairo')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _txType = 'income'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _txType == 'income'
                      ? const Color(0xFF10B981).withValues(alpha: 0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: _txType == 'income'
                          ? const Color(0xFF10B981)
                          : const Color(0xFF1E293B)),
                ),
                child: Center(
                    child: Text('trans_income'.tr(),
                        style: const TextStyle(
                            color: Color(0xFF10B981),
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700))),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _txType = 'expense'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _txType == 'expense'
                      ? const Color(0xFFEF4444).withValues(alpha: 0.2)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                      color: _txType == 'expense'
                          ? const Color(0xFFEF4444)
                          : const Color(0xFF1E293B)),
                ),
                child: Center(
                    child: Text('trans_expense'.tr(),
                        style: const TextStyle(
                            color: Color(0xFFEF4444),
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700))),
              ),
            ),
          ),
        ]),
        const SizedBox(height: 12),
        SizedBox(
          height: 40,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _categories.length,
            itemBuilder: (_, i) {
              final cat = _categories[i];
              final selected = cat == _selectedCategory;
              return GestureDetector(
                onTap: () => setState(() => _selectedCategory = cat),
                child: Container(
                  margin: const EdgeInsets.only(left: 8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected
                        ? const Color(0xFF3B7EF6).withValues(alpha: 0.2)
                        : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                        color: selected
                            ? const Color(0xFF3B7EF6)
                            : Colors.transparent),
                  ),
                  child: Text(cat,
                      style: TextStyle(
                          color: selected
                              ? const Color(0xFF3B7EF6)
                              : const Color(0xFF94A3B8),
                          fontSize: 12,
                          fontFamily: 'Cairo')),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.right,
              style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
              decoration: InputDecoration(
                hintText: 'trans_amount'.tr(),
                hintStyle: const TextStyle(
                    color: Color(0xFF64748B), fontFamily: 'Cairo'),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide.none),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                suffixText: _currency,
                suffixStyle: const TextStyle(
                    color: Color(0xFF64748B), fontFamily: 'Cairo'),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _saving ? null : _quickAdd,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF3B7EF6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: _saving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          color: Colors.white, strokeWidth: 2))
                  : Text('add'.tr(),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo')),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _buildStage() {
    final stages = {
      'awareness': ('🌱', 'مرحلة الوعي', const Color(0xFF8B5CF6)),
      'debt': ('💳', 'مرحلة سداد الديون', const Color(0xFFEF4444)),
      'emergency': ('🛡️', 'مرحلة الطوارئ', const Color(0xFFF59E0B)),
      'investing': ('📈', 'مرحلة الاستثمار', const Color(0xFF10B981)),
      'wealth': ('👑', 'مرحلة الثروة', const Color(0xFF3B7EF6)),
    };
    final s = stages[_stage]!;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: s.$3.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: s.$3.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Text(s.$1, style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('مرحلتك الحالية',
              style: TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
          Text(s.$2,
              style: TextStyle(
                  color: s.$3,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  fontFamily: 'Cairo')),
        ]),
      ]),
    );
  }

  Widget _buildRecentTransactions() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('آخر المعاملات',
          style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: Colors.white,
              fontFamily: 'Cairo')),
      const SizedBox(height: 10),
      ..._recentTx.map((tx) {
        final isIncome = tx['type'] == 'income';
        final amount = (tx['amount'] as num).toDouble();
        final color =
            isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444);
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: const Color(0xFF0F1629),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B))),
          child: Row(children: [
            Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10)),
                child: Center(
                    child: Text(isIncome ? '💰' : '💸',
                        style: const TextStyle(fontSize: 16)))),
            const SizedBox(width: 10),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(tx['description'] ?? tx['category'] ?? '',
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontFamily: 'Cairo',
                          fontSize: 13)),
                  Text(tx['category'] ?? '',
                      style: const TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 11,
                          fontFamily: 'Cairo')),
                ])),
            Text(
                '${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $_currency',
                style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo',
                    fontSize: 13)),
          ]),
        );
      }),
      if (_recentTx.isEmpty)
        Container(
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            child: const Text('لا توجد معاملات بعد',
                style:
                    TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'))),
    ]);
  }
}
