import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ZakatCalculatorScreen extends StatefulWidget {
  const ZakatCalculatorScreen({super.key});
  @override
  State<ZakatCalculatorScreen> createState() => _ZakatCalculatorScreenState();
}

class _ZakatCalculatorScreenState extends State<ZakatCalculatorScreen> {
  final _goldGramCtrl = TextEditingController(text: '0');
  final _goldPriceCtrl = TextEditingController(text: '30');
  final _silverGramCtrl = TextEditingController(text: '0');
  final _silverPriceCtrl = TextEditingController(text: '0.35');
  final _cashCtrl = TextEditingController(text: '0');
  final _investmentsCtrl = TextEditingController(text: '0');
  final _debtsCtrl = TextEditingController(text: '0');

  String _currency = 'JOD';
  List<Map<String, dynamic>> _history = [];
  bool _saving = false;
  bool _saved = false;
  final int _currentYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_goldGramCtrl, _goldPriceCtrl, _silverGramCtrl, _silverPriceCtrl, _cashCtrl, _investmentsCtrl, _debtsCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final results = await Future.wait<dynamic>([
      Supabase.instance.client.from('investments').select('shares,current_price').eq('user_id', user.id),
      Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single(),
      Supabase.instance.client.from('zakat_history').select('*').eq('user_id', user.id).order('year', ascending: false),
    ]);
    final investments = results[0] as List;
    final profile = results[1] as Map<String, dynamic>;
    final history = results[2] as List;
    final invValue = investments.fold(0.0, (a, i) => a + (i['shares'] as num).toDouble() * (i['current_price'] as num).toDouble());
    if (mounted) setState(() {
      _currency = profile['currency'] as String? ?? 'JOD';
      _investmentsCtrl.text = invValue.toStringAsFixed(0);
      _history = history.cast<Map<String, dynamic>>();
    });
  }

  double get _goldGram => double.tryParse(_goldGramCtrl.text) ?? 0;
  double get _goldPrice => double.tryParse(_goldPriceCtrl.text) ?? 30;
  double get _silverGram => double.tryParse(_silverGramCtrl.text) ?? 0;
  double get _silverPrice => double.tryParse(_silverPriceCtrl.text) ?? 0.35;
  double get _cash => double.tryParse(_cashCtrl.text) ?? 0;
  double get _investments => double.tryParse(_investmentsCtrl.text) ?? 0;
  double get _debts => double.tryParse(_debtsCtrl.text) ?? 0;

  double get _nisabGold => 85 * _goldPrice;
  double get _nisabSilver => 595 * _silverPrice;
  double get _nisab => _nisabGold < _nisabSilver ? _nisabGold : _nisabSilver;
  double get _totalAssets => _goldGram * _goldPrice + _silverGram * _silverPrice + _cash + _investments;
  double get _totalZakatable => (_totalAssets - _debts).clamp(0, double.infinity);
  double get _zakatDue => _totalZakatable >= _nisab ? _totalZakatable * 0.025 : 0;
  bool get _eligible => _totalZakatable >= _nisab;

  String _fmt(double n) => NumberFormat('#,##0.##', 'en').format(n);

  Future<void> _save() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() => _saving = true);
    await Supabase.instance.client.from('zakat_history').upsert({
      'user_id': user.id,
      'year': _currentYear,
      'gold_gram': _goldGram,
      'silver_gram': _silverGram,
      'cash': _cash,
      'investments': _investments,
      'debts_owed': _debts,
      'total_zakatable': _totalZakatable,
      'zakat_due': _zakatDue,
      'is_paid': false,
    }, onConflict: 'user_id,year');
    await _load();
    if (mounted) setState(() { _saving = false; _saved = true; });
    Future.delayed(const Duration(seconds: 2), () { if (mounted) setState(() => _saved = false); });
  }

  Future<void> _togglePaid(String id, bool isPaid) async {
    await Supabase.instance.client.from('zakat_history').update({'is_paid': !isPaid}).eq('id', id);
    setState(() { _history = _history.map((r) => r['id'] == id ? {...r, 'is_paid': !isPaid} : r).toList(); });
  }

  Widget _inputField(String label, TextEditingController ctrl, {String? hint}) {
    final cs = Theme.of(context).colorScheme;
    return Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSurfaceVariant)),
        if (hint != null) Text(hint, style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: cs.onSurfaceVariant)),
      ]),
      const SizedBox(height: 6),
      TextFormField(
        controller: ctrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        onChanged: (_) => setState(() {}),
        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, color: cs.onSurface),
        decoration: InputDecoration(
          filled: true, fillColor: cs.surfaceContainerHighest,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        ),
      ),
    ]));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('zakat_title'.tr(), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: cs.onSurface)),
        backgroundColor: cs.surface, elevation: 0,
        iconTheme: IconThemeData(color: cs.onSurface),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Result Card
          Container(
            width: double.infinity, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: _eligible ? const Color(0xFF10B981).withValues(alpha: 0.06) : cs.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _eligible ? const Color(0xFF10B981).withValues(alpha: 0.3) : cs.outlineVariant),
            ),
            child: Column(children: [
              Text(_eligible ? 'zakat_due_msg'.tr() : 'zakat_below_nisab'.tr(),
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700,
                  color: _eligible ? const Color(0xFF10B981) : cs.onSurfaceVariant)),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(_fmt(_zakatDue), style: TextStyle(fontFamily: 'Cairo', fontSize: 36, fontWeight: FontWeight.w900,
                  color: _eligible ? const Color(0xFF10B981) : cs.onSurfaceVariant)),
                const SizedBox(width: 8),
                Text(_currency, style: TextStyle(fontFamily: 'Cairo', fontSize: 14, color: cs.onSurfaceVariant)),
              ]),
              Text('zakat_percentage'.tr(), style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: cs.onSurfaceVariant)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _InfoBox(label: 'zakat_total_zakatable'.tr(), value: _fmt(_totalZakatable), currency: _currency, cs: cs)),
                const SizedBox(width: 10),
                Expanded(child: _InfoBox(label: 'zakat_nisab_gold'.tr(), value: _fmt(_nisabGold), currency: _currency, cs: cs)),
              ]),
            ]),
          ),
          const SizedBox(height: 16),

          // Inputs
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: cs.outlineVariant)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('zakat_enter_assets'.tr(), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
              const SizedBox(height: 16),
              _inputField('zakat_gold_price'.tr(), _goldPriceCtrl),
              _inputField('zakat_gold_gram'.tr(), _goldGramCtrl),
              _inputField('zakat_silver_price'.tr(), _silverPriceCtrl),
              _inputField('zakat_silver_gram'.tr(), _silverGramCtrl),
              _inputField('zakat_cash'.tr(), _cashCtrl, hint: 'zakat_cash_hint'.tr()),
              _inputField('zakat_investments'.tr(), _investmentsCtrl, hint: 'zakat_auto_fetched'.tr()),
              _inputField('zakat_debts'.tr(), _debtsCtrl, hint: 'zakat_debts_hint'.tr()),
              const SizedBox(height: 4),
              SizedBox(width: double.infinity, child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: cs.primary, padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: Text(
                  _saved ? 'zakat_saved'.tr() : _saving ? 'saving'.tr() : 'zakat_save'.tr(),
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white),
                ),
              )),
            ]),
          ),

          // History
          if (_history.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: cs.outlineVariant)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('zakat_history'.tr(), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
                const SizedBox(height: 14),
                ..._history.map((record) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: record['is_paid'] == true ? const Color(0xFF10B981).withValues(alpha: 0.06) : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: record['is_paid'] == true ? const Color(0xFF10B981).withValues(alpha: 0.25) : cs.outlineVariant),
                  ),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${record['year']} — ${_fmt((record['zakat_due'] as num?)?.toDouble() ?? 0)} $_currency',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, color: cs.onSurface)),
                      Text('zakat_zakatable_label'.tr(namedArgs: {'amount': _fmt((record['total_zakatable'] as num?)?.toDouble() ?? 0)}),
                        style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: cs.onSurfaceVariant)),
                    ])),
                    TextButton(
                      onPressed: () => _togglePaid(record['id'] as String, record['is_paid'] as bool),
                      style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                      child: Text(
                        record['is_paid'] == true ? 'zakat_paid'.tr() : 'zakat_unpaid'.tr(),
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 11,
                          color: record['is_paid'] == true ? const Color(0xFF10B981) : const Color(0xFFF59E0B)),
                      ),
                    ),
                  ]),
                )),
              ]),
            ),
          ],

          // Note
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.2)),
            ),
            child: Text('zakat_note'.tr(), style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Color(0xFFF59E0B), height: 1.6)),
          ),
          const SizedBox(height: 80),
        ]),
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  final String label, value, currency;
  final ColorScheme cs;
  const _InfoBox({required this.label, required this.value, required this.currency, required this.cs});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
    child: Column(children: [
      Text(label, style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: cs.onSurfaceVariant), textAlign: TextAlign.center),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w900, color: cs.onSurface)),
    ]),
  );
}
