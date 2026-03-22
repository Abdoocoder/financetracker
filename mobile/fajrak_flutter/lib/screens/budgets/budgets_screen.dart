import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _categories = [
  {'key': 'طعام', 'icon': '🍔'},
  {'key': 'مواصلات', 'icon': '🚗'},
  {'key': 'فواتير', 'icon': '💡'},
  {'key': 'صحة', 'icon': '💊'},
  {'key': 'ملابس', 'icon': '👕'},
  {'key': 'ترفيه', 'icon': '🎮'},
  {'key': 'تعليم', 'icon': '📚'},
  {'key': 'أخرى', 'icon': '📝'},
];

const _months = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

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
      final lastDay =
          DateTime(_year, _month + 1, 0).toIso8601String().split('T')[0];

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

      double income = 0, expenses = 0;
      final Map<String, double> cats = {};
      for (final tx in txs) {
        if (tx['type'] == 'income') {
          income += (tx['amount'] as num).toDouble();
        } else {
          expenses += (tx['amount'] as num).toDouble();
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
        });
      }
      if (expenses > 0) {} // suppress unused local
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
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم تطبيق التوزيع المقترح ✨',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Color(0xFF10B981)));
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    String selectedCat =
        existing?['category'] as String? ?? _categories[0]['key'] as String;
    final limitCtrl = TextEditingController(
        text: existing?['monthly_limit']?.toString() ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text(existing != null ? 'تعديل الميزانية' : 'ميزانية جديدة',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: colorScheme.onSurface,
                    fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            if (existing == null) ...[
              Align(
                  alignment: Alignment.centerRight,
                  child: Text('الفئة',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          fontFamily: 'Cairo'))),
              const SizedBox(height: 8),
              GridView.count(
                  crossAxisCount: 4,
                  shrinkWrap: true,
                  mainAxisSpacing: 8,
                  crossAxisSpacing: 8,
                  childAspectRatio: 1,
                  children: _categories.map((cat) {
                                child: Container(
                        decoration: BoxDecoration(
                          color: isSelected
                              ? colorScheme.primary.withOpacity(0.15)
                              : colorScheme.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: isSelected
                                  ? colorScheme.primary
                                  : colorScheme.outlineVariant),
                        ),
                        child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(cat['icon'] as String,
                                  style: const TextStyle(fontSize: 20)),
                              const SizedBox(height: 4),
                              Text(cat['key'] as String,
                                  style: TextStyle(
                                      color: isSelected
                                          ? colorScheme.primary
                                          : colorScheme.onSurfaceVariant,
                                      fontSize: 10,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center),
                            ]),
                      ),
ontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700),
                                  textAlign: TextAlign.center),
                            ]),
                      ),
                    );
                  }).toList()),
              const SizedBox(height: 12),
            ],
            TextField(
              controller: limitCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              textAlign: TextAlign.right,
              style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
              decoration: InputDecoration(
                labelText: 'الحد الشهري ($_currency)',
                labelStyle: TextStyle(
                    color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
                filled: true,
                fillColor: colorScheme.surface,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: BorderSide(color: colorScheme.outlineVariant)),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (limitCtrl.text.isEmpty) return;
                    final user = Supabase.instance.client.auth.currentUser!;
                    HapticFeedback.mediumImpact();
                    if (existing != null) {
                      await Supabase.instance.client.from('budgets').update({
                        'monthly_limit': double.tryParse(limitCtrl.text) ?? 0
                      }).eq('id', existing['id']);
                    } else {
                      final exists =
                          _budgets.any((b) => b['category'] == selectedCat);
                      if (exists) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                                content: Text('ميزانية هذه الفئة موجودة مسبقاً',
                                    style: TextStyle(fontFamily: 'Cairo')),
                                backgroundColor: Color(0xFFF59E0B)));
                        return;
                      }
                      await Supabase.instance.client.from('budgets').insert({
                        'user_id': user.id,
                        'category': selectedCat,
                        'monthly_limit': double.tryParse(limitCtrl.text) ?? 0,
                        'month': _month,
                        'year': _year
                      });
                    }
                    if (ctx.mounted) Navigator.pop(ctx);
                    await _load();
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  child: Text(existing != null ? 'حفظ' : 'إضافة معاملة',
                      style: const TextStyle(
                          fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
                )),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }

  List<Map<String, String>> _getAdvisorInsights() {
    final insights = <Map<String, String>>[];
    final available = _income - _totalDebtPayments;
    final totalBudgeted = _budgets.fold(
        0.0, (a, b) => a + (b['monthly_limit'] as num).toDouble());
    final totalSpent =
        _budgets.fold(0.0, (a, b) => a + (_spending[b['category']] ?? 0));

    for (final b in _budgets) {
      final spent = _spending[b['category']] ?? 0;
      final limit = (b['monthly_limit'] as num).toDouble();
      if (spent > limit) {
        insights.add({
          'icon': '🔴',
          'type': 'danger',
          'text':
              'تجاوزت ميزانية ${b['category']} بـ ${(spent - limit).toStringAsFixed(0)} $_currency'
        });
      } else if (limit > 0 && (spent / limit) > 0.8)
        insights.add({
          'icon': '🔶',
          'type': 'warning',
          'text':
              'اقتربت من حد ${b['category']} — ${(limit - spent).toStringAsFixed(0)} $_currency متبقي'
        });
    }
    if (_income > 0 && totalSpent > 0) {
      final ratio = totalSpent / _income * 100;
      if (ratio > 90) {
        insights.add({
          'icon': '🚨',
          'type': 'danger',
          'text': 'أنفقت ${ratio.toStringAsFixed(0)}% من دخلك — خطر!'
        });
      } else if (ratio < 70)
        insights.add({
          'icon': '✅',
          'type': 'success',
          'text': 'ممتاز! أنفقت ${ratio.toStringAsFixed(0)}% فقط من دخلك'
        });
    }
    if (_budgets.isEmpty) {
      insights.add({
        'icon': '💡',
        'type': 'info',
        'text': 'أضف ميزانية لكل فئة لتتبع إنفاقك بدقة'
      });
    }
    if (available > _income * 0.2 && _income > 0) {
      insights.add({
        'icon': '💰',
        'type': 'success',
        'text':
            'فائض ${available.toStringAsFixed(0)} $_currency — فكر في الاستثمار!'
      });
    }
    if (totalBudgeted > available && available > 0) {
      insights.add({
        'icon': '⚠️',
        'type': 'warning',
        'text':
            'ميزانيتك تتجاوز المتاح بـ ${(totalBudgeted - available).toStringAsFixed(0)} $_currency'
      });
    }

    // Savings Insights
    for (final g in _goals) {
      final current = (g['current_amount'] as num).toDouble();
      final target = (g['target_amount'] as num).toDouble();
      if (target > 0 && current < target && (current / target) > 0.9) {
        insights.add({
          'icon': '🎯',
          'type': 'success',
          'text':
              'أنت على وشك تحقيق هدف ${g['title']}! (${(target - current).toStringAsFixed(0)} متبقي)'
        });
      }
    }

    return insights.take(4).toList();
  }

  Color _insightColor(String type) {
    switch (type) {
      case 'danger':
        return const Color(0xFFEF4444);
      case 'warning':
        return const Color(0xFFF59E0B);
      case 'success':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF3B7EF6);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final available = _income - _totalDebtPayments;
    final totalBudgeted = _budgets.fold(
        0.0, (a, b) => a + (b['monthly_limit'] as num).toDouble());
    final totalSpent =
        _budgets.fold(0.0, (a, b) => a + (_spending[b['category']] ?? 0));
    final insights = _getAdvisorInsights();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('الميزانية',
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              onPressed: () => _showAddDialog())
        ],
      ),
      body: _loading
          ? Center(
              child: CircularProgressIndicator(color: colorScheme.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Month selector
                      SizedBox(
                          height: 40,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: 12,
                            itemBuilder: (_, i) => GestureDetector(
                              onTap: () {
                                setState(() {
                                  _month = i + 1;
                                  _loading = true;
                                });
                                _load();
                              },
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _month == i + 1
                                      ? colorScheme.primary
                                      : colorScheme.surface,
                                  borderRadius: BorderRadius.circular(100),
                                  border: Border.all(
                                      color: _month == i + 1
                                          ? colorScheme.primary
                                          : colorScheme.outlineVariant),
                                ),
                                child: Text(_months[i],
                                    style: TextStyle(
                                        color: _month == i + 1
                                            ? Colors.white
                                            : colorScheme.onSurfaceVariant,
                                        fontFamily: 'Cairo',
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700)),
                              ),
                            ),
                          )),
                      const SizedBox(height: 16),

                      // Monthly summary
                      if (_income > 0) ...[
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border:
                                  Border.all(color: colorScheme.outlineVariant)),
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('📋 ملخص الشهر',
                                    style: TextStyle(
                                        color: colorScheme.onSurfaceVariant,
                                        fontSize: 12,
                                        fontFamily: 'Cairo',
                                        fontWeight: FontWeight.w900)),
                                const SizedBox(height: 12),
                                _summaryRow(
                                    '💵 الدخل',
                                    '+${_income.toStringAsFixed(0)} $_currency',
                                    const Color(0xFF6EE7B7)),
                                if (_totalDebtPayments > 0)
                                  _summaryRow(
                                      '💳 أقساط الديون',
                                      '-${_totalDebtPayments.toStringAsFixed(0)} $_currency',
                                      const Color(0xFFFCA5A5)),
                                Divider(
                                    color: colorScheme.outlineVariant, height: 20),
                                Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('✅ المتاح للإنفاق',
                                          style: TextStyle(
                                              color: colorScheme.onSurface,
                                              fontWeight: FontWeight.w900,
                                              fontFamily: 'Cairo')),
                                      Text(
                                          '${available.toStringAsFixed(0)} $_currency',
                                          style: TextStyle(
                                              color: available >= 0
                                                  ? const Color(0xFF6EE7B7)
                                                  : const Color(0xFFFCA5A5),
                                              fontWeight: FontWeight.w900,
                                              fontSize: 18,
                                              fontFamily: 'Cairo')),
                                    ]),
                                if (totalBudgeted > 0) ...[
                                  const SizedBox(height: 10),
                                  Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('منفق من الفئات',
                                            style: TextStyle(
                                                color: colorScheme.onSurfaceVariant,
                                                fontSize: 11,
                                                fontFamily: 'Cairo')),
                                        Text(
                                            '${totalSpent.toStringAsFixed(0)} / ${totalBudgeted.toStringAsFixed(0)} $_currency',
                                            style: TextStyle(
                                                color: totalSpent >
                                                        totalBudgeted
                                                    ? colorScheme.error
                                                    : colorScheme.onSurfaceVariant,
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                fontFamily: 'Cairo')),
                                      ]),
                                  const SizedBox(height: 6),
                                  ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                          value: totalBudgeted > 0
                                              ? (totalSpent / totalBudgeted)
                                                  .clamp(0.0, 1.0)
                                              : 0,
                                          backgroundColor:
                                              colorScheme.outlineVariant,
                                          color: totalSpent > totalBudgeted
                                              ? colorScheme.error
                                              : colorScheme.primary,
                                          minHeight: 8)),
                                ],
                              ]),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // AI Advisor
                      if (insights.isNotEmpty) ...[
                        Container(
                          decoration: BoxDecoration(
                              color: colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border:
                                  Border.all(color: colorScheme.outlineVariant)),
                          child: Column(children: [
                            const Padding(
                              padding: EdgeInsets.all(14),
                              child: Row(children: [
                                Text('🤖', style: TextStyle(fontSize: 18)),
                                SizedBox(width: 8),
                                Text('المستشار المالي',
                                    style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                        fontFamily: 'Cairo')),
                              ]),
                            ),
                            Divider(color: colorScheme.outlineVariant, height: 1),
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Column(
                                  children: insights.map((ins) {
                                final color = _insightColor(ins['type']!);
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                      color: color.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                          color: color.withOpacity(0.2))),
                                  child: Row(children: [
                                    Text(ins['icon']!,
                                        style: const TextStyle(fontSize: 16)),
                                    const SizedBox(width: 10),
                                    Expanded(
                                        child: Text(ins['text']!,
                                            style: TextStyle(
                                                color: color,
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                fontFamily: 'Cairo'))),
                                  ]),
                                );
                              }).toList()),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // 50/30/20 Rule
                      if (_income > 0) ...[
                        Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: [
                              colorScheme.primary.withOpacity(0.08),
                              colorScheme.secondary.withOpacity(0.06)
                            ]),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                                color:
                                    colorScheme.primary.withOpacity(0.2)),
                          ),
                          child: Column(children: [
                            Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(children: [
                                const Text('⚖️',
                                    style: TextStyle(fontSize: 18)),
                                const SizedBox(width: 8),
                                Expanded(
                                    child: Text('قاعدة 50/30/20 المقترحة',
                                        style: TextStyle(
                                            color: colorScheme.onSurface,
                                            fontWeight: FontWeight.w900,
                                            fontFamily: 'Cairo',
                                            fontSize: 13))),
                                GestureDetector(
                                  onTap: () async {
                                    final confirm = await showDialog<bool>(
                                        context: context,
                                        builder: (_) => AlertDialog(
                                              backgroundColor:
                                                  colorScheme.surface,
                                              title: Text(
                                                  'تطبيق 50/30/20',
                                                  style: TextStyle(
                                                      color: colorScheme.onSurface,
                                                      fontFamily: 'Cairo')),
                                              content: Text(
                                                  'سيتم إنشاء أو تعديل الميزانيات لتناسب التوزيع المقترح. هل تريد المتابعة؟',
                                                  style: TextStyle(
                                                      color: colorScheme.onSurfaceVariant,
                                                      fontFamily: 'Cairo')),
                                              actions: [
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, false),
                                                    child: Text('إلغاء',
                                                        style: const TextStyle(
                                                            fontFamily:
                                                                'Cairo'))),
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, true),
                                                    child: Text('✨ تطبيق',
                                                        style: TextStyle(
                                                            color: colorScheme.primary,
                                                            fontFamily:
                                                                'Cairo'))),
                                              ],
                                            ));
                                    if (confirm == true) await _apply502030();
                                  },
                                  child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                          color: colorScheme.primary,
                                          borderRadius:
                                              BorderRadius.circular(8)),
                                      child: const Text('تطبيق ✨',
                                          style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 12,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700))),
                                ),
                              ]),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                              child: Row(children: [
                                Expanded(
                                    child: _rule502030Card(
                                        '50%',
                                        '🏠 ضروريات',
                                        (available * 0.5).round().toDouble(),
                                        colorScheme.primary)),
                                const SizedBox(width: 8),
                                Expanded(
                                    child: _rule502030Card(
                                        '30%',
                                        '🎯 رغبات',
                                        (available * 0.3).round().toDouble(),
                                        colorScheme.secondary)),
                                const SizedBox(width: 8),
                                Expanded(
                                    child: _rule502030Card(
                                        '20%',
                                        '💰 ادخار',
                                        (available * 0.2).round().toDouble(),
                                        const Color(0xFF10B981))),
                              ]),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Budgets list
                      if (_budgets.isNotEmpty) ...[
                        Text('ميزانياتي',
                            style: TextStyle(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 15)),
                        const SizedBox(height: 10),
                        ..._budgets.map((b) => _budgetCard(b)),
                        const SizedBox(height: 16),
                      ],

                      // Category spending
                      if (_spending.isNotEmpty) ...[
                        Text('الإنفاق حسب الفئة',
                            style: TextStyle(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 15)),
                        const SizedBox(height: 10),
                        ..._spending.entries.map((e) {
                          final totalExpenses =
                              _spending.values.fold(0.0, (a, b) => a + b);
                          final pct = totalExpenses > 0
                              ? (e.value / totalExpenses * 100)
                              : 0.0;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                                color: colorScheme.surface,
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: colorScheme.outlineVariant)),
                            child: Column(children: [
                              Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(e.key,
                                        style: TextStyle(
                                            color: colorScheme.onSurface,
                                            fontFamily: 'Cairo',
                                            fontSize: 13)),
                                    Text(
                                        '${e.value.toStringAsFixed(0)} $_currency (${pct.toStringAsFixed(0)}%)',
                                        style: TextStyle(
                                            color: colorScheme.onSurfaceVariant,
                                            fontFamily: 'Cairo',
                                            fontSize: 12)),
                                  ]),
                              const SizedBox(height: 6),
                              ClipRRect(
                                  borderRadius: BorderRadius.circular(3),
                                  child: LinearProgressIndicator(
                                      value: pct / 100,
                                      backgroundColor: colorScheme.outlineVariant,
                                      color: colorScheme.primary,
                                      minHeight: 5)),
                            ]),
                          );
                        }),
                      ],
                    ]),
              ),
            ),
    );
  }

  Widget _summaryRow(String label, String value, Color color) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child:
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(label,
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 13)),
          Text(value,
              style: TextStyle(
                  color: color,
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w800,
                  fontSize: 13)),
        ]),
      );

  Widget _rule502030Card(
          String pct, String label, double amount, Color color) =>
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: color.withOpacity(0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.2))),
        child: Column(children: [
          Text(pct,
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'Cairo')),
          Text(amount.toStringAsFixed(0),
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                  fontFamily: 'Cairo')),
          Text(label,
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant.withOpacity(0.8), fontSize: 9, fontFamily: 'Cairo'),
              textAlign: TextAlign.center),
        ]),
      );

  Widget _budgetCard(Map<String, dynamic> b) {
    final cat = _categories.firstWhere((c) => c['key'] == b['category'],
        orElse: () => {'key': b['category'], 'icon': '📝'});
    final spent = _spending[b['category']] ?? 0;
    final limit = (b['monthly_limit'] as num).toDouble();
    final pct = limit > 0 ? (spent / limit).clamp(0.0, 1.0) : 0.0;
    final over = spent > limit;
    final warn = !over && pct > 0.8;
    final color = over
        ? const Color(0xFFEF4444)
        : warn
            ? const Color(0xFFF59E0B)
            : const Color(0xFF10B981);
    final remaining = (limit - spent).clamp(0.0, double.infinity);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: over
                  ? colorScheme.error.withOpacity(0.3)
                  : warn
                      ? Colors.orange.withOpacity(0.2)
                      : colorScheme.outlineVariant)),
      child: Column(children: [
        Row(children: [
          Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12)),
              child: Center(
                  child: Text(cat['icon'] as String,
                      style: const TextStyle(fontSize: 22)))),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(b['category'] as String,
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w800,
                        fontSize: 14)),
                Text(
                    '${spent.toStringAsFixed(0)} / ${limit.toStringAsFixed(0)} $_currency${over ? ' ⚠️ تجاوزت!' : warn ? ' 🔶 اقتربت' : ''}',
                    style: TextStyle(
                        color: color,
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700)),
              ])),
          Text('${(pct * 100).round()}%',
              style: TextStyle(
                  color:
                      over ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'Cairo')),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => _showAddDialog(existing: b),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: colorScheme.primary.withOpacity(0.2))),
                  child: Icon(Icons.edit,
                      color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => _deleteBudget(b['id'].toString()),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: const Color(0xFFEF4444).withOpacity(0.2))),
                  child: const Icon(Icons.close,
                      color: Color(0xFFEF4444), size: 14))),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
                value: pct,
                backgroundColor: colorScheme.outlineVariant,
                color: color,
                minHeight: 8)),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            const Text('متبقي: ',
                style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 11,
                    fontFamily: 'Cairo')),
            Text('${remaining.toStringAsFixed(0)} $_currency',
                style: TextStyle(
                    color: over
                        ? const Color(0xFFFCA5A5)
                        : const Color(0xFF6EE7B7),
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                    fontFamily: 'Cairo'))
          ]),
          Text('الحد: ${limit.toStringAsFixed(0)} $_currency',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant, fontSize: 11, fontFamily: 'Cairo')),
        ]),
      ]),
    );
  }
}
