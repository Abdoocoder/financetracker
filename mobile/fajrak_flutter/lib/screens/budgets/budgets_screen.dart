import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

import '../../widgets/budgets/month_selector.dart';
import '../../widgets/budgets/budget_summary_card.dart';
import '../../widgets/budgets/financial_advisor_card.dart';
import '../../widgets/budgets/budget_rule_card.dart';
import '../../widgets/budgets/budget_list_item.dart';
import '../../widgets/budgets/add_budget_dialog.dart';
import '../../widgets/budgets/category_spending_item.dart';
import '../../widgets/common/skeleton_loader.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});
  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  bool _loading = true;
  double _income = 0, _totalDebtPayments = 0;
  String _currency = 'JOD';
  Map<String, double> _spending = {};
  List<Map<String, dynamic>> _budgets = [];
  List<Map<String, dynamic>> _goals = [];
  int _month = DateTime.now().month;
  final int _year = DateTime.now().year;

  final List<Map<String, dynamic>> _localizedCategories = [
    {'key': 'طعام', 'icon': Icons.restaurant, 'label': 'cat_food'.tr()},
    {'key': 'مواصلات', 'icon': Icons.directions_car, 'label': 'cat_transport'.tr()},
    {'key': 'فواتير', 'icon': Icons.receipt_long, 'label': 'cat_bills'.tr()},
    {'key': 'صحة', 'icon': Icons.health_and_safety, 'label': 'cat_health'.tr()},
    {'key': 'ملابس', 'icon': Icons.checkroom, 'label': 'cat_clothes'.tr()},
    {'key': 'ترفيه', 'icon': Icons.sports_esports, 'label': 'cat_entertainment'.tr()},
    {'key': 'تعليم', 'icon': Icons.school, 'label': 'cat_education'.tr()},
    {'key': 'أخرى', 'icon': Icons.more_horiz, 'label': 'cat_others'.tr()},
  ];

  final List<String> _monthLabels = [
    'month_jan'.tr(), 'month_feb'.tr(), 'month_mar'.tr(), 'month_apr'.tr(),
    'month_may'.tr(), 'month_jun'.tr(), 'month_jul'.tr(), 'month_aug'.tr(),
    'month_sep'.tr(), 'month_oct'.tr(), 'month_nov'.tr(), 'month_dec'.tr(),
  ];

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Budgets');
    _load();
  }

  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      
      final firstDay = '$_year-${_month.toString().padLeft(2, '0')}-01';
      final lastDay = DateTime(_year, _month + 1, 0).toIso8601String().split('T')[0];

      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('profiles')
            .select('monthly_income, currency')
            .eq('id', user.id)
            .single(),
        Supabase.instance.client
            .from('transactions')
            .select('type, amount, category')
            .eq('user_id', user.id)
            .gte('transaction_date', firstDay)
            .lte('transaction_date', lastDay),
        Supabase.instance.client
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)
            .eq('month', _month)
            .eq('year', _year),
        Supabase.instance.client
            .from('debts')
            .select('monthly_payment')
            .eq('user_id', user.id)
            .eq('is_paid', false),
        Supabase.instance.client
            .from('savings_goals')
            .select('*')
            .eq('user_id', user.id),
      ]);

      final profile = results[0] as Map<String, dynamic>;
      final txs = results[1] as List;
      final budgets = results[2] as List;
      final debts = results[3] as List;

      double income = 0;
      final Map<String, double> cats = {};
      for (final tx in txs) {
        if (tx['type'] == 'income') {
          income += (tx['amount'] as num).toDouble();
        } else {
          final cat = tx['category'] as String? ?? 'أخرى';
          cats[cat] = (cats[cat] ?? 0) + (tx['amount'] as num).toDouble();
        }
      }
      final debtTotal = (debts)
          .fold(0.0, (a, d) => a + (d['monthly_payment'] as num).toDouble());

      if (mounted) {
        setState(() {
          _currency = profile['currency'] as String? ?? 'JOD';
          _income = income > 0
              ? income
              : (profile['monthly_income'] as num?)?.toDouble() ?? 0;
          _spending = Map.fromEntries(cats.entries.toList()
            ..sort((a, b) => b.value.compareTo(a.value)));
          _budgets = List<Map<String, dynamic>>.from(budgets);
          _goals = List<Map<String, dynamic>>.from(results[4] as List);
          _totalDebtPayments = debtTotal;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Budgets Load');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deleteBudget(String id) async {
    await Supabase.instance.client.from('budgets').delete().eq('id', id);
    await _load();
  }

  Future<void> _apply502030() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    
    final available = _income - _totalDebtPayments;
    final needs = available * 0.50;
    final wants = available * 0.30;
    
    final suggestions = [
      {'category': 'فواتير', 'limit': (needs * 0.4).round().toDouble()},
      {'category': 'طعام', 'limit': (needs * 0.35).round().toDouble()},
      {'category': 'مواصلات', 'limit': (needs * 0.25).round().toDouble()},
      {'category': 'ترفيه', 'limit': (wants * 0.5).round().toDouble()},
      {'category': 'ملابس', 'limit': (wants * 0.3).round().toDouble()},
      {'category': 'صحة', 'limit': (wants * 0.2).round().toDouble()},
    ];

    for (final s in suggestions) {
      final existing = _budgets
          .firstWhere((b) => b['category'] == s['category'], orElse: () => {});
      if (existing.isNotEmpty) {
        await Supabase.instance.client
            .from('budgets')
            .update({'monthly_limit': s['limit']}).eq('id', existing['id']);
      } else {
        await Supabase.instance.client.from('budgets').insert({
          'user_id': user.id,
          'category': s['category'],
          'monthly_limit': s['limit'],
          'month': _month,
          'year': _year
        });
      }
    }
    await _load();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('budget_apply_success'.tr(),
              style: const TextStyle()),
          backgroundColor: Theme.of(context).colorScheme.primary));
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddBudgetDialog(
        existing: existing,
        localizedCategories: _localizedCategories,
        currency: _currency,
        month: _month,
        year: _year,
        currentBudgets: _budgets,
        onSaved: _load,
      ),
    );
  }

  List<Map<String, dynamic>> _getAdvisorInsights() {
    final insights = <Map<String, dynamic>>[];
    final available = _income - _totalDebtPayments;
    final totalBudgeted = _budgets.fold(
        0.0, (a, b) => a + (b['monthly_limit'] as num).toDouble());
    final totalSpent =
        _budgets.fold(0.0, (a, b) => a + (_spending[b['category']] ?? 0));

    String getCatName(String key) {
      final cat = _localizedCategories.firstWhere((c) => c['key'] == key, orElse: () => {});
      return cat.isNotEmpty ? cat['label'] as String : key;
    }

    for (final b in _budgets) {
      final spent = _spending[b['category']] ?? 0;
      final limit = (b['monthly_limit'] as num).toDouble();
      if (spent > limit) {
        insights.add({
          'icon': Icons.cancel,
          'type': 'danger',
          'text': 'budget_insight_over'.tr(args: [getCatName(b['category']), (spent - limit).toStringAsFixed(0), _currency])
        });
      } else if (limit > 0 && (spent / limit) > 0.8) {
        insights.add({
          'icon': Icons.warning_amber_rounded,
          'type': 'warning',
          'text': 'budget_insight_near'.tr(args: [getCatName(b['category']), (limit - spent).toStringAsFixed(0), _currency])
        });
      }
    }

    if (_income > 0 && totalSpent > 0) {
      final ratio = totalSpent / _income * 100;
      if (ratio > 90) {
        insights.add({'icon': Icons.dangerous, 'type': 'danger', 'text': 'budget_insight_ratio_danger'.tr(args: [ratio.toStringAsFixed(0)])});
      } else if (ratio < 70) {
        insights.add({'icon': Icons.check_circle_outline, 'type': 'success', 'text': 'budget_insight_ratio_success'.tr(args: [ratio.toStringAsFixed(0)])});
      }
    }

    if (_budgets.isEmpty) {
      insights.add({'icon': Icons.info_outline, 'type': 'info', 'text': 'budget_insight_empty'.tr()});
    } else if (available > totalBudgeted) {
      insights.add({'icon': Icons.account_balance_wallet, 'type': 'success', 'text': 'budget_insight_surplus'.tr(args: [available.toStringAsFixed(0), _currency])});
    } else if (available < totalBudgeted) {
      insights.add({'icon': Icons.trending_down, 'type': 'danger', 'text': 'budget_insight_deficit'.tr(args: [(totalBudgeted - available).toStringAsFixed(0), _currency])});
    }

    for (final g in _goals) {
      final current = (g['current_amount'] as num).toDouble();
      final target = (g['target_amount'] as num).toDouble();
      if (target > 0 && current < target && (current / target) > 0.9) {
        insights.add({'icon': Icons.track_changes, 'type': 'success', 'text': 'budget_insight_goal_near'.tr(args: [g['title'] ?? '', (target - current).toStringAsFixed(0)])});
      }
    }

    return insights.take(4).toList();
  }

  Color _insightColor(String type) {
    switch (type) {
      case 'danger': return AppColors.error;
      case 'warning': return AppColors.warning;
      case 'success': return AppColors.success;
      default: return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final available = _income - _totalDebtPayments;
    final totalBudgeted = _budgets.fold(0.0, (a, b) => a + (b['monthly_limit'] as num).toDouble());
    final totalSpent = _budgets.fold(0.0, (a, b) => a + (_spending[b['category']] ?? 0));
    final insights = _getAdvisorInsights();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('nav_budgets'.tr(),
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              tooltip: 'budget_add'.tr(),
              onPressed: () => _showAddDialog())
        ],
      ),
      body: _loading
          ? const PageSkeleton()
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MonthSelector(
                        selectedMonth: _month,
                        monthLabels: _monthLabels,
                        onMonthSelected: (m) {
                          setState(() {
                            _month = m;
                            _loading = true;
                          });
                          _load();
                        },
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(height: 16),

                      if (_income > 0) ...[
                        BudgetSummaryCard(
                          income: _income,
                          totalDebtPayments: _totalDebtPayments,
                          available: available,
                          totalBudgeted: totalBudgeted,
                          totalSpent: totalSpent,
                          currency: _currency,
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(height: 12),
                      ],

                      FinancialAdvisorCard(
                        insights: insights,
                        colorScheme: colorScheme,
                        getInsightColor: _insightColor,
                      ),
                      const SizedBox(height: 12),

                      if (_income > 0) ...[
                        BudgetRuleCard(
                          available: available,
                          currency: _currency,
                          colorScheme: colorScheme,
                          onApply: () async {
                            final confirm = await showDialog<bool>(
                                context: context,
                                builder: (_) => AlertDialog(
                                      backgroundColor: colorScheme.surface,
                                      title: Text('dash_rule_confirm_title'.tr(),
                                          style: TextStyle(color: colorScheme.onSurface)),
                                      content: Text('dash_rule_confirm_body'.tr(),
                                          style: TextStyle(color: colorScheme.onSurfaceVariant)),
                                      actions: [
                                        TextButton(onPressed: () => Navigator.pop(context, false), child: Text('cancel'.tr(), style: const TextStyle())),
                                        TextButton(onPressed: () => Navigator.pop(context, true), child: Text('تطبيق', style: TextStyle(color: colorScheme.primary))),
                                      ],
                                    ));
                            if (confirm == true) await _apply502030();
                          },
                        ),
                        const SizedBox(height: 16),
                      ],

                      if (_budgets.isNotEmpty) ...[
                        Text('dash_my_budgets'.tr(),
                            style: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w900, fontSize: 15)),
                        const SizedBox(height: 10),
                        ..._budgets.map((b) => BudgetListItem(
                          key: ValueKey(b['id']),
                          budget: b,
                          spent: _spending[b['category']] ?? 0,
                          currency: _currency,
                          localizedCategories: _localizedCategories,
                          colorScheme: colorScheme,
                          onEdit: (budget) => _showAddDialog(existing: budget),
                          onDelete: _deleteBudget,
                        )),
                        const SizedBox(height: 16),
                      ],

                      if (_spending.isNotEmpty) ...[
                        Text('dash_spending_by_category'.tr(),
                            style: TextStyle(color: colorScheme.onSurface, fontWeight: FontWeight.w900, fontSize: 15)),
                        const SizedBox(height: 10),
                        ..._spending.entries.map((e) {
                          final totalExpenses = _spending.values.fold(0.0, (a, b) => a + b);
                          final pct = totalExpenses > 0 ? (e.value / totalExpenses * 100) : 0.0;
                          return CategorySpendingItem(
                            key: ValueKey(e.key),
                            category: e.key,
                            amount: e.value,
                            percentage: pct,
                            currency: _currency,
                            colorScheme: colorScheme,
                          );
                        }),
                      ],
                    ]),
              ),
            ),
    );
  }
}
