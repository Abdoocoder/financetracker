import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
  String _stage = 'awareness';

  // Quick Add
  final _amountController = TextEditingController();
  String _selectedCategory = 'طعام';
  String _txType = 'expense';
  bool _saving = false;

  final _categories = ['طعام', 'مواصلات', 'فواتير', 'صحة', 'ترفيه', 'تسوق', 'راتب', 'عمل حر', 'أخرى'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final now = DateTime.now();
    final firstDay = DateTime(now.year, now.month, 1).toIso8601String().split('T')[0];

    final results = await Future.wait([
      Supabase.instance.client.from('profiles').select('full_name, monthly_income, currency').eq('id', user.id).single(),
      Supabase.instance.client.from('transactions').select('type, amount').eq('user_id', user.id).gte('transaction_date', firstDay),
      Supabase.instance.client.from('transactions').select('id, type, amount, category, description, transaction_date').eq('user_id', user.id).order('transaction_date', ascending: false).limit(5),
      Supabase.instance.client.from('debts').select('remaining_amount, monthly_payment').eq('user_id', user.id).eq('is_paid', false),
      Supabase.instance.client.from('investments').select('shares, current_price').eq('user_id', user.id),
      Supabase.instance.client.from('savings_goals').select('current_amount').eq('user_id', user.id),
    ]);

    final profile = results[0] as Map<String, dynamic>;
    final txs = results[1] as List;
    final recent = results[2] as List;
    final debts = results[3] as List;
    final investments = results[4] as List;
    final goals = results[5] as List;

    double txIncome = 0, txExpenses = 0;
    for (final tx in txs) {
      if (tx['type'] == 'income') txIncome += (tx['amount'] as num).toDouble();
      else txExpenses += (tx['amount'] as num).toDouble();
    }

    final profileIncome = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
    final income = txIncome > 0 ? txIncome : profileIncome;
    final totalDebt = debts.fold(0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
    final totalMonthly = debts.fold(0.0, (a, d) => a + (d['monthly_payment'] as num? ?? 0).toDouble());
    final invValue = investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
    final goalsSaved = goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());

    // Health Score
    int score = 0;
    final savingsRate = income > 0 ? (income - txExpenses) / income : 0;
    if (savingsRate >= 0.2) score += 30;
    else if (savingsRate >= 0.1) score += 20;
    else if (savingsRate > 0) score += 10;
    final debtRatio = income > 0 ? totalDebt / (income * 12) : 1;
    if (totalDebt == 0) score += 25;
    else if (debtRatio < 0.3) score += 20;
    else if (debtRatio < 0.6) score += 10;
    if (goalsSaved > 0) score += 20;
    if (invValue > 0) score += 15;
    if (txs.length >= 10) score += 10;

    // Stage
    String stage = 'awareness';
    if (totalDebt > 0 && (income > 0 && totalMonthly / income > 0.3)) stage = 'debt';
    else if (totalDebt == 0 && goalsSaved < income * 3) stage = 'emergency';
    else if (invValue > 0) stage = 'investing';
    else if (invValue > income * 12) stage = 'wealth';

    if (mounted) setState(() {
      _name = (profile['full_name'] as String?)?.split(' ').first ?? '';
      _currency = profile['currency'] as String? ?? 'JOD';
      _income = income;
      _expenses = txExpenses;
      _net = income - txExpenses;
      _recentTx = recent.cast<Map<String, dynamic>>();
      _healthScore = score.clamp(0, 100);
      _stage = stage;
      _loading = false;
    });
  }

  Future<void> _quickAdd() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    await Supabase.instance.client.from('transactions').insert({
      'user_id': user.id,
      'type': _txType,
      'amount': amount,
      'category': _selectedCategory,
      'description': _selectedCategory,
      'transaction_date': DateTime.now().toIso8601String().split('T')[0],
    });
    _amountController.clear();
    setState(() => _saving = false);
    await _load();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('تم الإضافة ✅', style: const TextStyle(fontFamily: 'Cairo')), backgroundColor: const Color(0xFF10B981), duration: const Duration(seconds: 2)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(backgroundColor: Color(0xFF070B14), body: Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6))));

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
                _buildStatCards(),
                const SizedBox(height: 16),
                _buildHealthScore(),
                const SizedBox(height: 16),
                _buildQuickAdd(),
                const SizedBox(height: 16),
                _buildStage(),
                const SizedBox(height: 16),
                _buildRecentTransactions(),
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
          Text(_name.isNotEmpty ? '👋 أهلاً $_name' : 'لوحة التحكم',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
          const Text('فجرك المالي يبدأ اليوم 🌅',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontFamily: 'Cairo')),
        ]),
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)]),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(child: Text('ف', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo'))),
        ),
      ],
    );
  }

  Widget _buildStatCards() {
    return Row(children: [
      Expanded(child: _statCard('الدخل', _income, const Color(0xFF10B981), '↑')),
      const SizedBox(width: 8),
      Expanded(child: _statCard('المصاريف', _expenses, const Color(0xFFEF4444), '↓')),
      const SizedBox(width: 8),
      Expanded(child: _statCard('الصافي', _net, _net >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), '=')),
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
        FittedBox(child: Text('${value.abs().toStringAsFixed(0)}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo'))),
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }

  Widget _buildHealthScore() {
    final color = _healthScore >= 80 ? const Color(0xFF10B981) :
                  _healthScore >= 60 ? const Color(0xFF3B7EF6) :
                  _healthScore >= 40 ? const Color(0xFFF59E0B) : const Color(0xFFEF4444);
    final label = _healthScore >= 80 ? 'ممتاز 🌟' : _healthScore >= 60 ? 'جيد 💪' : _healthScore >= 40 ? 'متوسط ⚡' : 'يحتاج تحسين';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(children: [
        SizedBox(
          width: 64, height: 64,
          child: Stack(alignment: Alignment.center, children: [
            CircularProgressIndicator(value: _healthScore / 100, color: color, backgroundColor: const Color(0xFF1E293B), strokeWidth: 6),
            Text('$_healthScore', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 18, fontFamily: 'Cairo')),
          ]),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('💊 نقاط الصحة المالية', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16, fontFamily: 'Cairo')),
          Text('/100 نقطة', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo')),
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
        const Text('⚡ إضافة سريعة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14, fontFamily: 'Cairo')),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _txType = 'income'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _txType == 'income' ? const Color(0xFF10B981).withValues(alpha: 0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _txType == 'income' ? const Color(0xFF10B981) : const Color(0xFF1E293B)),
                ),
                child: const Center(child: Text('دخل', style: TextStyle(color: Color(0xFF10B981), fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
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
                  color: _txType == 'expense' ? const Color(0xFFEF4444).withValues(alpha: 0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _txType == 'expense' ? const Color(0xFFEF4444) : const Color(0xFF1E293B)),
                ),
                child: const Center(child: Text('مصروف', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700))),
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
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFF3B7EF6).withValues(alpha: 0.2) : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: selected ? const Color(0xFF3B7EF6) : Colors.transparent),
                  ),
                  child: Text(cat, style: TextStyle(color: selected ? const Color(0xFF3B7EF6) : const Color(0xFF94A3B8), fontSize: 12, fontFamily: 'Cairo')),
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
                hintText: 'المبلغ',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                suffixText: _currency,
                suffixStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
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
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('إضافة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
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
          const Text('مرحلتك الحالية', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
          Text(s.$2, style: TextStyle(color: s.$3, fontWeight: FontWeight.w900, fontSize: 14, fontFamily: 'Cairo')),
        ]),
      ]),
    );
  }

  Widget _buildRecentTransactions() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('آخر المعاملات', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Cairo')),
      const SizedBox(height: 10),
      ..._recentTx.map((tx) {
        final isIncome = tx['type'] == 'income';
        final amount = (tx['amount'] as num).toDouble();
        final color = isIncome ? const Color(0xFF10B981) : const Color(0xFFEF4444);
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF1E293B))),
          child: Row(children: [
            Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
              child: Center(child: Text(isIncome ? '💰' : '💸', style: const TextStyle(fontSize: 16)))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tx['description'] ?? tx['category'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontFamily: 'Cairo', fontSize: 13)),
              Text(tx['category'] ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
            ])),
            Text('${isIncome ? '+' : '−'}${amount.toStringAsFixed(0)} $_currency', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 13)),
          ]),
        );
      }),
      if (_recentTx.isEmpty)
        Container(padding: const EdgeInsets.all(24), alignment: Alignment.center,
          child: const Text('لا توجد معاملات بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'))),
    ]);
  }
}
