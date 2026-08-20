import 'dart:convert';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/currency_service.dart';
import '../../widgets/common/calculator_disclaimer.dart';

class ZakatCalculatorScreen extends StatefulWidget {
  const ZakatCalculatorScreen({super.key});
  @override
  State<ZakatCalculatorScreen> createState() => _ZakatCalculatorScreenState();
}

class _ZakatCalculatorScreenState extends State<ZakatCalculatorScreen> with WidgetsBindingObserver {
  final _goldGramCtrl = TextEditingController(text: '0');
  final _goldPriceCtrl = TextEditingController(text: '30');
  final _silverGramCtrl = TextEditingController(text: '0');
  final _silverPriceCtrl = TextEditingController(text: '0.35');
  final _cashCtrl = TextEditingController(text: '0');
  final _investmentsCtrl = TextEditingController(text: '0');
  final _debtsCtrl = TextEditingController(text: '0');

  String _currency = 'JOD';
  List<Map<String, dynamic>> _history = [];
  List<Map<String, dynamic>> _invItems = [];
  bool _saving = false;
  bool _saved = false;
  bool _fetchingPrices = false;
  final int _currentYear = DateTime.now().year;

  static const int _haulDays = 354;
  static const double _troyOzToGram = 31.1035;

  // Uses purchase_date if available, falls back to created_at
  DateTime _haulStart(Map<String, dynamic> inv) {
    final pd = inv['purchase_date'];
    if (pd != null) return DateTime.parse(pd.toString());
    return DateTime.parse(inv['created_at'] as String);
  }

  int _daysLeft(Map<String, dynamic> inv) {
    final haulDate = _haulStart(inv).add(const Duration(days: _haulDays));
    return haulDate.difference(DateTime.now()).inDays;
  }

  String _haulDueDate(Map<String, dynamic> inv) {
    final haulDate = _haulStart(inv).add(const Duration(days: _haulDays));
    return '${haulDate.day}/${haulDate.month}/${haulDate.year}';
  }

  Future<void> _fetchLivePrices() async {
    if (!mounted) return;
    setState(() => _fetchingPrices = true);
    try {
      final results = await Future.wait([
        http.get(Uri.parse('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d'), headers: {'User-Agent': 'Mozilla/5.0'}).timeout(const Duration(seconds: 10)),
        http.get(Uri.parse('https://query1.finance.yahoo.com/v8/finance/chart/SI=F?interval=1d&range=1d'), headers: {'User-Agent': 'Mozilla/5.0'}).timeout(const Duration(seconds: 10)),
        CurrencyService.fetchExchangeRate('USD', _currency),
      ]).catchError((e) => [http.Response('', 404), http.Response('', 404), 1.0]);

      double usdRate = results[2] as double? ?? 1.0;
      double? goldP;
      double? silverP;

      final goldRes = results[0] as http.Response;
      if (goldRes.statusCode == 200 && goldRes.body.isNotEmpty) {
        final d = json.decode(goldRes.body);
        final priceOz = (d['chart']?['result']?[0]?['meta']?['regularMarketPrice'] as num?)?.toDouble() ?? 0;
        if (priceOz > 0) goldP = (priceOz / _troyOzToGram) * usdRate;
      }

      final silverRes = results[1] as http.Response;
      if (silverRes.statusCode == 200 && silverRes.body.isNotEmpty) {
        final d = json.decode(silverRes.body);
        final priceOz = (d['chart']?['result']?[0]?['meta']?['regularMarketPrice'] as num?)?.toDouble() ?? 0;
        if (priceOz > 0) silverP = (priceOz / _troyOzToGram) * usdRate;
      }

      // Fallback Source: FreeGoldAPI
      if (goldP == null || silverP == null) {
        final fbRes = await http.get(Uri.parse('https://freegoldapi.com/data/latest.json')).timeout(const Duration(seconds: 5)).catchError((_) => http.Response('', 404));
        if (fbRes.statusCode == 200 && fbRes.body.isNotEmpty) {
          final fb = json.decode(fbRes.body);
          if (goldP == null && fb['gold'] != null) goldP = (fb['gold'] as num).toDouble() * usdRate;
          if (silverP == null && fb['silver'] != null) silverP = (fb['silver'] as num).toDouble() * usdRate;
        }
      }

      if (mounted) {
        setState(() {
          if (goldP != null) _goldPriceCtrl.text = goldP.toStringAsFixed(2);
          if (silverP != null) _silverPriceCtrl.text = silverP.toStringAsFixed(2);
        });
      }
    } catch (e, s) {
      debugPrint('Zakat Live Prices Error: $e $s');
    } finally {
      if (mounted) setState(() => _fetchingPrices = false);
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    for (final c in [_goldGramCtrl, _goldPriceCtrl, _silverGramCtrl, _silverPriceCtrl, _cashCtrl, _investmentsCtrl, _debtsCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) return;

    try {
      final results = await Future.wait<dynamic>([
        client.from('investments').select('id,name,symbol,shares,current_price,created_at,purchase_date').eq('user_id', user.id),
        client.from('profiles').select('currency').eq('id', user.id).single(),
        client.from('zakat_history').select('*').eq('user_id', user.id).order('year', ascending: false),
        CurrencyService.fetchExchangeRate('USD', 'JOD'), // Temporary for rate calc
      ]);

      final invList = results[0] as List;
      final profile = results[1] as Map<String, dynamic>;
      final history = results[2] as List;
      final String currencyCode = profile['currency'] as String? ?? 'JOD';
      
      final double usdRate = await CurrencyService.fetchExchangeRate('USD', currencyCode) ?? 1.0;

      // جلب البيانات المالية الموحدة للملء التلقائي عبر RPC
      final dashRes = await client.rpc('get_financial_dashboard', params: {
        'p_user_id': user.id,
        'p_usd_to_local_rate': usdRate,
      });

      if (mounted) {
        setState(() {
          _currency = currencyCode;
          if (dashRes != null) {
            _cashCtrl.text = ((dashRes['total_accounts_balance'] ?? 0) + (dashRes['goals_saved'] ?? 0)).toStringAsFixed(0);
            _investmentsCtrl.text = ((dashRes['investments_value_local'] ?? 0) + (dashRes['investment_cash_local'] ?? 0)).toStringAsFixed(0);
            _debtsCtrl.text = (dashRes['total_debt_owed'] ?? 0).toStringAsFixed(0);
          }
          _history = history.cast<Map<String, dynamic>>();
          _invItems = invList.cast<Map<String, dynamic>>();
        });
        _fetchLivePrices();
      }
    } catch (e, s) {
      debugPrint('Error loading zakat data: $e $s');
    }
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
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: cs.onSurfaceVariant)),
        if (hint != null) Text(hint, style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant)),
      ]),
      const SizedBox(height: 6),
      TextFormField(
        controller: ctrl,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        onChanged: (_) => setState(() {}),
        style: TextStyle(fontWeight: FontWeight.w700, color: cs.onSurface),
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
        title: Text('zakat_title'.tr(), style: TextStyle(fontWeight: FontWeight.w900, color: cs.onSurface)),
        backgroundColor: cs.surface, elevation: 0,
        iconTheme: IconThemeData(color: cs.onSurface),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          const CalculatorDisclaimer(storageKey: 'disclaimer_zakat'),
          // Haul Countdown Section
          if (_invItems.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: cs.outlineVariant)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('zakat_haul_title'.tr(), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
                  GestureDetector(
                    onTap: _load,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.refresh, size: 14, color: cs.onSurfaceVariant),
                        const SizedBox(width: 4),
                        Text('zakat_refresh'.tr(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: cs.onSurfaceVariant)),
                      ]),
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                ..._invItems.where((i) => i['created_at'] != null || i['purchase_date'] != null).map((inv) {
                  final days = _daysLeft(inv);
                  final due = _haulDueDate(inv);
                  final invValue = (inv['shares'] as num).toDouble() * (inv['current_price'] as num).toDouble();
                  final overdue = days < 0;
                  final urgent = !overdue && days <= 30;
                  final soon = !overdue && days > 30 && days <= 60;
                  final color = overdue ? AppColors.error : urgent ? AppColors.warning : soon ? cs.primary : AppColors.success;
                  final bgColor = overdue ? AppColors.error.withValues(alpha: 0.06) : urgent ? AppColors.warning.withValues(alpha: 0.06) : cs.surfaceContainerHighest;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.25))),
                    child: Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(inv['symbol'] as String? ?? inv['name'] as String? ?? 'استثمار',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
                        Text('${_fmt(invValue)} $_currency · ${'zakat_haul_due'.tr(namedArgs: {'date': due})}',
                          style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant)),
                      ])),
                      Column(children: [
                        Text(overdue ? 'zakat_overdue'.tr() : '$days',
                          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: color)),
                        if (!overdue) Text('zakat_days'.tr(), style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w700)),
                      ]),
                    ]),
                  );
                }),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.warning.withValues(alpha: 0.25))),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Icon(Icons.lightbulb_outline, size: 14, color: AppColors.warning),
                    const SizedBox(width: 6),
                    Expanded(child: Text('zakat_haul_purchase_tip'.tr(), style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant, height: 1.5))),
                  ]),
                ),
              ]),
            ),
            const SizedBox(height: 16),
          ],

          // Result Card
          Container(
            width: double.infinity, padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: _eligible ? AppColors.success.withValues(alpha: 0.06) : cs.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _eligible ? AppColors.success.withValues(alpha: 0.3) : cs.outlineVariant),
            ),
            child: Column(children: [
              Text(_eligible ? 'zakat_due_msg'.tr() : 'zakat_below_nisab'.tr(),
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                  color: _eligible ? AppColors.success : cs.onSurfaceVariant)),
              const SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(_fmt(_zakatDue), style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900,
                  color: _eligible ? AppColors.success : cs.onSurfaceVariant)),
                const SizedBox(width: 8),
                Text(_currency, style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant)),
              ]),
              Text('zakat_percentage'.tr(), style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
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
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('zakat_enter_assets'.tr(), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
                TextButton.icon(
                  onPressed: _fetchingPrices ? null : _fetchLivePrices,
                  icon: _fetchingPrices
                      ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: cs.primary))
                      : Icon(Icons.refresh, size: 16, color: cs.primary),
                  label: Text('zakat_fetch_prices'.tr(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: cs.primary)),
                  style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4)),
                ),
              ]),
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
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white),
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
                Text('zakat_history'.tr(), style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
                const SizedBox(height: 14),
                ..._history.map((record) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: record['is_paid'] == true ? AppColors.success.withValues(alpha: 0.06) : cs.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: record['is_paid'] == true ? AppColors.success.withValues(alpha: 0.25) : cs.outlineVariant),
                  ),
                  child: Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${record['year']} — ${_fmt((record['zakat_due'] as num?)?.toDouble() ?? 0)} $_currency',
                        style: TextStyle(fontWeight: FontWeight.w800, color: cs.onSurface)),
                      Text('zakat_zakatable_label'.tr(namedArgs: {'amount': _fmt((record['total_zakatable'] as num?)?.toDouble() ?? 0)}),
                        style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
                    ])),
                    TextButton(
                      onPressed: () => _togglePaid(record['id'] as String, record['is_paid'] as bool),
                      style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6)),
                      child: Text(
                        record['is_paid'] == true ? 'zakat_paid'.tr() : 'zakat_unpaid'.tr(),
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11,
                          color: record['is_paid'] == true ? AppColors.success : AppColors.warning),
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
              color: AppColors.warning.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
            ),
            child: Text('zakat_note'.tr(), style: const TextStyle(fontSize: 12, color: AppColors.warning, height: 1.6)),
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
      Text(label, style: TextStyle(fontSize: 10, color: cs.onSurfaceVariant), textAlign: TextAlign.center),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: cs.onSurface)),
    ]),
  );
}
