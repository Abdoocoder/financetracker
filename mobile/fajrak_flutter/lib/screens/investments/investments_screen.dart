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
  bool _showInUsd = true; // USD by default for investments
  static const _jodRate = 0.709; // 1 USD = 0.709 JOD

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

  // Record Buy inline form
  String? _showBuyFormId;
  final _buySharesCtrl = TextEditingController();
  final _buyPriceCtrl = TextEditingController();
  final _buyCommCtrl = TextEditingController(text: '0.5');
  bool _savingBuy = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _symbolCtrl.dispose(); _nameCtrl.dispose();
    _sharesCtrl.dispose(); _avgPriceCtrl.dispose();
    _currentPriceCtrl.dispose();
    _buySharesCtrl.dispose(); _buyPriceCtrl.dispose(); _buyCommCtrl.dispose();
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

  String? _editingId;

  Future<void> _addInvestment() async {
    if (_symbolCtrl.text.isEmpty || _sharesCtrl.text.isEmpty) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    HapticFeedback.mediumImpact();
    if (_editingId != null) {
      await Supabase.instance.client.from('investments').update({
        'symbol': _symbolCtrl.text.toUpperCase(),
        'name': _nameCtrl.text.isEmpty ? _symbolCtrl.text.toUpperCase() : _nameCtrl.text,
        'shares': double.tryParse(_sharesCtrl.text) ?? 0,
        'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
        'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
        'is_halal': _isHalal,
      }).eq('id', _editingId!);
    } else {
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
    }
    _symbolCtrl.clear(); _nameCtrl.clear();
    _sharesCtrl.clear(); _avgPriceCtrl.clear(); _currentPriceCtrl.clear();
    _editingId = null;
    setState(() => _saving = false);
    Navigator.pop(context);
    await _load();
  }

  Future<void> _deleteInvestment(String id) async {
    final confirm = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF0F1629),
      title: const Text('حذف الاستثمار', style: TextStyle(color: Colors.white, fontFamily: 'Cairo')),
      content: const Text('هل أنت متأكد؟', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo'))),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف', style: TextStyle(color: Color(0xFFEF4444), fontFamily: 'Cairo'))),
      ],
    ));
    if (confirm == true) {
      await Supabase.instance.client.from('investments').delete().eq('id', id);
      await _load();
    }
  }

  Future<void> _recordBuy(Map<String, dynamic> inv) async {
    final shares = double.tryParse(_buySharesCtrl.text);
    final price = double.tryParse(_buyPriceCtrl.text);
    final commission = double.tryParse(_buyCommCtrl.text) ?? 0.0;
    if (shares == null || shares <= 0 || price == null || price <= 0) return;

    setState(() => _savingBuy = true);
    final user = Supabase.instance.client.auth.currentUser!;
    
    await Supabase.instance.client.from('investment_transactions').insert({
      'investment_id': inv['id'],
      'user_id': user.id,
      'type': 'buy',
      'shares': shares,
      'price': price,
      'commission': commission,
      'transaction_date': DateTime.now().toIso8601String().split('T')[0],
    });

    final oldShares = (inv['shares'] as num).toDouble();
    final oldAvg = (inv['avg_buy_price'] as num).toDouble();
    final totalShares = oldShares + shares;
    final newAvg = totalShares > 0 ? ((oldShares * oldAvg) + (shares * price)) / totalShares : price;

    await Supabase.instance.client.from('investments').update({
      'shares': totalShares,
      'avg_buy_price': newAvg,
      'current_price': price,
    }).eq('id', inv['id']);

    _buySharesCtrl.clear(); _buyPriceCtrl.clear(); _buyCommCtrl.text = '0.5';
    setState(() { _showBuyFormId = null; _savingBuy = false; });
    await _load();
  }

  Future<void> _showTxHistory(String invId, String symbol) async {
    showDialog(context: context, builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6))));
    final data = await Supabase.instance.client.from('investment_transactions').select('*').eq('investment_id', invId).order('transaction_date', ascending: false);
    if (mounted) Navigator.pop(context); // close loading
    
    final txHistory = List<Map<String, dynamic>>.from(data);
    
    if (mounted) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: const Color(0xFF0F1629),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (ctx) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text('سجل معاملات $symbol', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            if (txHistory.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('لا توجد معاملات بعد', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'))))
            else
              SizedBox(
                height: 300,
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: txHistory.length,
                  itemBuilder: (ctx, i) {
                    final tx = txHistory[i];
                    final isBuy = tx['type'] == 'buy';
                    final color = isBuy ? const Color(0xFF10B981) : const Color(0xFFEF4444);
                    final shares = (tx['shares'] as num).toDouble();
                    final price = (tx['price'] as num).toDouble();
                    final comm = (tx['commission'] as num?)?.toDouble() ?? 0;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(12)),
                      child: Row(children: [
                        Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)), child: Center(child: Text(isBuy ? '📈' : '📉', style: const TextStyle(fontSize: 16)))),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${isBuy ? "شراء" : "بيع"} ${shares.toStringAsFixed(4)} وحدة', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13)),
                          Text('${tx['transaction_date']} • سعر \$${price.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 11)),
                        ])),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text('${isBuy ? "-" : "+"}\$${(shares * price).toStringAsFixed(0)}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontFamily: 'monospace', fontSize: 13)),
                          if (comm > 0) Text('عمولة \$${comm.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10, fontFamily: 'Cairo')),
                        ]),
                      ]),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
          ])
        ),
      );
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    if (existing != null) {
      _editingId = existing['id'].toString();
      _symbolCtrl.text = existing['symbol'] ?? '';
      _nameCtrl.text = existing['name'] ?? '';
      _sharesCtrl.text = existing['shares'].toString();
      _avgPriceCtrl.text = existing['avg_buy_price'].toString();
      _currentPriceCtrl.text = existing['current_price'].toString();
      _isHalal = existing['is_halal'] as bool? ?? false;
    } else {
      _editingId = null;
      _symbolCtrl.clear(); _nameCtrl.clear();
      _sharesCtrl.clear(); _avgPriceCtrl.clear(); _currentPriceCtrl.clear();
      _isHalal = true;
    }
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
        actions: [
          // Currency toggle
          GestureDetector(
            onTap: () => setState(() => _showInUsd = !_showInUsd),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Text(
                _showInUsd ? '💵 USD' : '🇯🇴 JOD',
                style: const TextStyle(color: Colors.white, fontSize: 11, fontFamily: 'Cairo', fontWeight: FontWeight.w700),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF3B7EF6)),
            tooltip: 'تحديث الأسعار',
            onPressed: () async {
              setState(() => _loading = true);
              await _load();
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('تم تحديث بيانات المحفظة ✅', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFF10B981), duration: Duration(seconds: 2)),
              );
            },
          ),
          IconButton(icon: const Icon(Icons.add, color: Color(0xFF3B7EF6)), onPressed: _showAddDialog),
        ],
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
                      Text(
                        _showInUsd
                            ? '\$${_totalValue.toStringAsFixed(2)}'
                            : '${(_totalValue * _jodRate).toStringAsFixed(2)} JOD',
                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900, fontFamily: 'Cairo'),
                      ),
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
                  // Portfolio Chart
                  if (_investments.isNotEmpty && _totalValue > 0) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('توزيع المحفظة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
                        const SizedBox(height: 12),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Row(children: _investments.map((inv) {
                            final val = (inv['shares'] as num).toDouble() * (inv['current_price'] as num).toDouble();
                            final pct = val / _totalValue * 100;
                            final colors = [const Color(0xFF3B7EF6), const Color(0xFF10B981), const Color(0xFFF59E0B), const Color(0xFF8B5CF6), const Color(0xFFEF4444)];
                            final color = colors[_investments.indexOf(inv) % colors.length];
                            return Expanded(flex: pct.round() == 0 ? 1 : pct.round(), child: Container(height: 10, decoration: BoxDecoration(color: color, border: const Border(right: BorderSide(color: Color(0xFF0F1629), width: 2)))));
                          }).toList()),
                        ),
                        const SizedBox(height: 12),
                        ..._investments.map((inv) {
                          final val = (inv['shares'] as num).toDouble() * (inv['current_price'] as num).toDouble();
                          final pct = _totalValue > 0 ? (val / _totalValue * 100) : 0.0;
                          final colors = [const Color(0xFF3B7EF6), const Color(0xFF10B981), const Color(0xFFF59E0B), const Color(0xFF8B5CF6), const Color(0xFFEF4444)];
                          final color = colors[_investments.indexOf(inv) % colors.length];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(children: [
                              Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
                              const SizedBox(width: 8),
                              Expanded(child: Text(inv['symbol'] ?? '', style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13))),
                              Text('${pct.toStringAsFixed(1)}%', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                              const SizedBox(width: 8),
                              Text('\$${val.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontWeight: FontWeight.w900, fontSize: 13)),
                            ]),
                          );
                        }),
                      ]),
                    ),
                    const SizedBox(height: 16),
                  ],

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
                            Text('بعد ${_years} سنة', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
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
          const SizedBox(width: 8),
          GestureDetector(onTap: () => _showAddDialog(existing: inv), child: Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFF3B7EF6).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(7), border: Border.all(color: const Color(0xFF3B7EF6).withValues(alpha: 0.2))), child: const Icon(Icons.edit, color: Color(0xFF3B7EF6), size: 14))),
          const SizedBox(width: 6),
          GestureDetector(onTap: () => _deleteInvestment(inv['id'].toString()), child: Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFFEF4444).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(7), border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.2))), child: const Icon(Icons.close, color: Color(0xFFEF4444), size: 14))),
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
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: OutlinedButton(
            onPressed: () => _showTxHistory(inv['id'].toString(), inv['symbol']),
            style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF94A3B8), side: const BorderSide(color: Color(0xFF1E293B)), padding: const EdgeInsets.symmetric(vertical: 8), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('سجل المعاملات', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700)),
          )),
          const SizedBox(width: 8),
          Expanded(child: OutlinedButton(
            onPressed: () => setState(() => _showBuyFormId = _showBuyFormId == inv['id'].toString() ? null : inv['id'].toString()),
            style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF10B981), side: BorderSide(color: const Color(0xFF10B981).withOpacity(0.3)), padding: const EdgeInsets.symmetric(vertical: 8), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            child: const Text('+ تسجيل شراء', style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700)),
          )),
        ]),
        if (_showBuyFormId == inv['id'].toString()) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              Row(children: [
                Expanded(child: _miniField(_buySharesCtrl, 'الوحدات', const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(child: _miniField(_buyPriceCtrl, 'السعر \$', const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(child: _miniField(_buyCommCtrl, 'العمولة \$', const TextInputType.numberWithOptions(decimal: true))),
              ]),
              const SizedBox(height: 10),
              SizedBox(width: double.infinity, child: ElevatedButton(
                onPressed: _savingBuy ? null : () => _recordBuy(inv),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                child: _savingBuy ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('تسجيل', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 12)),
              )),
            ]),
          ),
        ],
      ]),
    );
  }

  TextField _miniField(TextEditingController ctrl, String hint, TextInputType type) => TextField(
    controller: ctrl, keyboardType: type, textAlign: TextAlign.center,
    style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 12),
    decoration: InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 10),
      filled: true, fillColor: const Color(0xFF0F1629),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
    ),
  );
}
