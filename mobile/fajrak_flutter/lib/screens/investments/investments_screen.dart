import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class InvestmentsScreen extends StatefulWidget {
  const InvestmentsScreen({super.key});
  @override
  State<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends State<InvestmentsScreen> {
  List<Map<String, dynamic>> _investments = [];
  bool _loading = true;
  bool _showSimulator = false;

  // Wealth Simulator
  double _monthly = 100;
  int _years = 10;
  double _rate = 7;

  // Add Form
  final _symbolCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _sharesCtrl = TextEditingController();
  final _avgPriceCtrl = TextEditingController();
  final _currentPriceCtrl = TextEditingController();
  bool _isHalal = true;
  bool _saving = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _symbolCtrl.dispose(); _nameCtrl.dispose();
    _sharesCtrl.dispose(); _avgPriceCtrl.dispose();
    _currentPriceCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client.from('investments').select('*').eq('user_id', user.id);
    if (mounted) setState(() { _investments = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  double get _totalValue => _investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
  double get _totalCost => _investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['avg_buy_price'] as num).toDouble());

  double _calcFV(double monthly, int years, double rate) {
    if (rate == 0) return monthly * years * 12;
    final r = rate / 100 / 12;
    final n = years * 12;
    return monthly * ((((1 + r) * ((1 + r) * n - 1)) / r));
  }

  Future<void> _addInvestment() async {
    if (_symbolCtrl.text.isEmpty || _sharesCtrl.text.isEmpty) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    await Supabase.instance.client.from('investments').insert({
      'user_id': user.id,
      'symbol': _symbolCtrl.text.toUpperCase(),
      'name': _nameCtrl.text.isEmpty ? _symbolCtrl.text.toUpperCase() : _nameCtrl.text,
      'shares': double.tryParse(_sharesCtrl.text) ?? 0,
      'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
      'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
      'is_halal': _isHalal,
      'type': 'etf',
      'currency': 'USD',
    });
    _symbolCtrl.clear(); _nameCtrl.clear();
    _sharesCtrl.clear(); _avgPriceCtrl.clear(); _currentPriceCtrl.clear();
    setState(() => _saving = false);
    Navigator.pop(context);
    await _load();
  }

  void _showAddDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
          child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            const Text('إضافة استثمار', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            _field(_symbolCtrl, 'الرمز (مثال: SPUS)', TextInputType.text),
            const SizedBox(height: 10),
            _field(_nameCtrl, 'الاسم (اختياري)', TextInputType.text),
            const SizedBox(height: 10),
            _field(_sharesCtrl, 'عدد الأسهم', const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 10),
            _field(_avgPriceCtrl, 'متوسط سعر الشراء', const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 10),
            _field(_currentPriceCtrl, 'السعر الحالي', const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => setS(() => _isHalal = !_isHalal),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _isHalal ? const Color(0xFF10B981).withValues(alpha: 0.1) : const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: _isHalal ? const Color(0xFF10B981).withValues(alpha: 0.4) : const Color(0xFF334155)),
                ),
                child: Row(children: [
                  Icon(_isHalal ? Icons.check_circle : Icons.circle_outlined, color: _isHalal ? const Color(0xFF10B981) : const Color(0xFF64748B), size: 20),
                  const SizedBox(width: 10),
                  Text('استثمار حلال 🕌', style: TextStyle(color: _isHalal ? const Color(0xFF10B981) : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                ]),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(width: double.infinity, child: ElevatedButton(
              onPressed: _saving ? null : _addInvestment,
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3B7EF6), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
              child: _saving ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('إضافة', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 15)),
            )),
            const SizedBox(height: 16),
          ])),
        ),
      ),
    );
  }

  TextField _field(TextEditingController ctrl, String hint, TextInputType type) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
        filled: true, fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final gain = _totalValue - _totalCost;
    final gainPct = _totalCost > 0 ? (gain / _totalCost * 100) : 0.0;
    final fv = _calcFV(_monthly, _years, _rate);
    final totalInvested = _monthly * _years * 12;

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('الاستثمارات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: _showAddDialog)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [

                  // Portfolio Summary
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [const Color(0xFF3B7EF6).withValues(alpha: 0.15), const Color(0xFF8B5CF6).withValues(alpha: 0.15)]),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF3B7EF6).withValues(alpha: 0.2)),
                    ),
                    child: Column(children: [
                      const Text('قيمة المحفظة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                      const SizedBox(height: 8),
                      Text('\$${_totalValue.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                      const SizedBox(height: 8),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Icon(gain >= 0 ? Icons.trending_up : Icons.trending_down, color: gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), size: 18),
                        const SizedBox(width: 6),
                        Text('${gain >= 0 ? '+' : ''}\$${gain.toStringAsFixed(2)} (${gainPct.toStringAsFixed(1)}%)',
                          style: TextStyle(color: gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                      ]),
                      const SizedBox(height: 12),
                      Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                        _miniStat('التكلفة', '\$${_totalCost.toStringAsFixed(0)}', const Color(0xFF94A3B8)),
                        _miniStat('الأسهم', '${_investments.length}', const Color(0xFF3B7EF6)),
                        _miniStat('الحلال', '${_investments.where((i) => i['is_halal'] == true).length}', const Color(0xFF10B981)),
                      ]),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // Wealth Simulator
                  GestureDetector(
                    onTap: () => setState(() => _showSimulator = !_showSimulator),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F1629),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3)),
                      ),
                      child: Row(children: [
                        const Text('🚀', style: TextStyle(fontSize: 20)),
                        const SizedBox(width: 10),
                        const Expanded(child: Text('محاكي الثروة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14))),
                        Icon(_showSimulator ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: const Color(0xFF64748B)),
                      ]),
                    ),
                  ),

                  if (_showSimulator) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        _slider('الاستثمار الشهري', '\$${_monthly.toStringAsFixed(0)}', _monthly, 10, 1000, (v) => setState(() => _monthly = v)),
                        _slider('المدة (سنوات)', '${_years} سنة', _years.toDouble(), 1, 30, (v) => setState(() => _years = v.toInt())),
                        _slider('العائد السنوي', '${_rate.toStringAsFixed(0)}%', _rate, 1, 20, (v) => setState(() => _rate = v)),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: const Color(0xFF8B5CF6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3))),
                          child: Column(children: [
                            const Text('بعد ${_years} سنة', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                            Text('\$${fv.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF8B5CF6), fontWeight: FontWeight.w900, fontSize: 28, fontFamily: 'Cairo')),
                            Text('استثمرت: \$${totalInvested.toStringAsFixed(0)} | ربح: \$${(fv - totalInvested).toStringAsFixed(0)}',
                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'Cairo')),
                          ]),
                        ),
                      ]),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Investments List
                  if (_investments.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(children: [
                        const Text('📈', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        const Text('لا توجد استثمارات بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _showAddDialog, child: const Text('أضف استثمارك الأول', style: TextStyle(fontFamily: 'Cairo'))),
                      ]),
                    )
                  else ...[
                    Align(alignment: Alignment.centerRight, child: Text('محفظتي (${_investments.length})', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 15))),
                    const SizedBox(height: 10),
                    ..._investments.map((inv) => _invCard(inv)),
                  ],

                  // Halal Note
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.15))),
                    child: const Row(children: [
                      Text('🕌', style: TextStyle(fontSize: 18)),
                      SizedBox(width: 10),
                      Expanded(child: Text('تأكد من استثمارك في صناديق حلال مثل SPUS أو HLAL', style: TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 12))),
                    ]),
                  ),
                ]),
              ),
            ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(children: [
      Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 16)),
      Text(label, style: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 11)),
    ]);
  }

  Widget _slider(String label, String value, double v, double min, double max, ValueChanged<double> onChanged) {
    return Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12)),
      ]),
      Slider(value: v, min: min, max: max, activeColor: const Color(0xFF8B5CF6), inactiveColor: const Color(0xFF1E293B), onChanged: onChanged),
    ]);
  }

  Widget _invCard(Map<String, dynamic> inv) {
    final shares = (inv['shares'] as num).toDouble();
    final avgPrice = (inv['avg_buy_price'] as num).toDouble();
    final currentPrice = (inv['current_price'] as num).toDouble();
    final value = shares * currentPrice;
    final cost = shares * avgPrice;
    final gain = value - cost;
    final gainPct = cost > 0 ? (gain / cost * 100) : 0.0;
    final isHalal = inv['is_halal'] as bool? ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
      child: Column(children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: const Color(0xFF3B7EF6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(inv['symbol']?.toString().substring(0, 1) ?? '?', style: const TextStyle(color: Color(0xFF3B7EF6), fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(inv['symbol'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
              if (isHalal) ...[const SizedBox(width: 6), const Text('🕌', style: TextStyle(fontSize: 12))],
            ]),
            Text('${shares.toStringAsFixed(4)} سهم • \$${currentPrice.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('\$${value.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
            Text('${gain >= 0 ? '+' : ''}${gainPct.toStringAsFixed(1)}%', style: TextStyle(color: gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444), fontSize: 12, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
          ]),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: cost > 0 ? (value / (cost * 2)).clamp(0.0, 1.0) : 0,
            backgroundColor: const Color(0xFF1E293B),
            valueColor: AlwaysStoppedAnimation(gain >= 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
            minHeight: 4,
          ),
        ),
      ]),
    );
  }
}
