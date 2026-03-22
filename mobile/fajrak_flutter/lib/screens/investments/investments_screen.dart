import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
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
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Investments');
    _load();
  }

  @override
  void dispose() {
    _symbolCtrl.dispose();
    _nameCtrl.dispose();
    _sharesCtrl.dispose();
    _avgPriceCtrl.dispose();
    _currentPriceCtrl.dispose();
    _buySharesCtrl.dispose();
    _buyPriceCtrl.dispose();
    _buyCommCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client
        .from('investments')
        .select('*')
        .eq('user_id', user.id);
    if (mounted) {
      setState(() {
        _investments = List<Map<String, dynamic>>.from(data);
        _loading = false;
      });
    }
  }

  double get _totalValue => _investments.fold(
      0.0,
      (a, i) =>
          a +
          (i['shares'] as num).toDouble() *
              (i['current_price'] as num).toDouble());
  double get _totalCost => _investments.fold(
      0.0,
      (a, i) =>
          a +
          (i['shares'] as num).toDouble() *
              (i['avg_buy_price'] as num).toDouble());

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
        'name': _nameCtrl.text.isEmpty
            ? _symbolCtrl.text.toUpperCase()
            : _nameCtrl.text,
        'shares': double.tryParse(_sharesCtrl.text) ?? 0,
        'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
        'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
        'is_halal': _isHalal,
      }).eq('id', _editingId!);
    } else {
      await Supabase.instance.client.from('investments').insert({
        'user_id': user.id,
        'symbol': _symbolCtrl.text.toUpperCase(),
        'name': _nameCtrl.text.isEmpty
            ? _symbolCtrl.text.toUpperCase()
            : _nameCtrl.text,
        'shares': double.tryParse(_sharesCtrl.text) ?? 0,
        'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
        'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
        'is_halal': _isHalal,
        'type': 'etf',
        'currency': 'دولار',
      });
    }
    _symbolCtrl.clear();
    _nameCtrl.clear();
    _sharesCtrl.clear();
    _avgPriceCtrl.clear();
    _currentPriceCtrl.clear();
    _editingId = null;
    setState(() => _saving = false);
    Navigator.pop(context);
    await _load();
  }

  Future<void> _deleteInvestment(String id) async {
    final confirm = await showDialog<bool>(
        context: context,
        builder: (_) {
          final theme = Theme.of(context);
          final colorScheme = theme.colorScheme;
          return AlertDialog(
            backgroundColor: colorScheme.surface,
            title: Text('inv_delete_title',
                style: TextStyle(
                    color: colorScheme.onSurface, fontFamily: 'Cairo')),
            content: Text('confirm_delete',
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo')),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text('cancel',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontFamily: 'Cairo'))),
              TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text('delete',
                      style: TextStyle(
                          color: colorScheme.error, fontFamily: 'Cairo'))),
            ],
          );
        });
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
    final newAvg = totalShares > 0
        ? ((oldShares * oldAvg) + (shares * price)) / totalShares
        : price;

    await Supabase.instance.client.from('investments').update({
      'shares': totalShares,
      'avg_buy_price': newAvg,
      'current_price': price,
    }).eq('id', inv['id']);

    _buySharesCtrl.clear();
    _buyPriceCtrl.clear();
    _buyCommCtrl.text = '0.5';
    setState(() {
      _showBuyFormId = null;
      _savingBuy = false;
    });
    await _load();
  }

  Future<void> _showTxHistory(String invId, String symbol) async {
    showDialog(
        context: context,
        builder: (_) => Center(
            child: CircularProgressIndicator(
                color: Theme.of(context).colorScheme.primary)));
    final data = await Supabase.instance.client
        .from('investment_transactions')
        .select('*')
        .eq('investment_id', invId)
        .order('transaction_date', ascending: false);
    if (mounted) Navigator.pop(context); // close loading

    final txHistory = List<Map<String, dynamic>>.from(data);

    if (mounted) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (ctx) => Padding(
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
                      color: Theme.of(context).colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text('inv_tx_history_symbol'.tr(args: [symbol]),
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Theme.of(context).colorScheme.onSurface,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 20),
              if (txHistory.isEmpty)
                Center(
                    child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text('inv_empty',
                            style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                                fontFamily: 'Cairo'))))
              else
                SizedBox(
                  height: 300,
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: txHistory.length,
                    itemBuilder: (ctx, i) {
                      final tx = txHistory[i];
                      final isBuy = tx['type'] == 'buy';
                      final color = isBuy
                          ? (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF10B981)
                              : const Color(0xFF10B981))
                          : (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFFEF4444)
                              : const Color(0xFFEF4444));
                      final shares = (tx['shares'] as num).toDouble();
                      final price = (tx['price'] as num).toDouble();
                      final comm = (tx['commission'] as num?)?.toDouble() ?? 0;
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(12)),
                        child: Row(children: [
                          Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                  color: color.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10)),
                              child: Center(
                                  child: Text(isBuy ? '📈' : '📉',
                                      style: const TextStyle(fontSize: 16)))),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(
                                    '${isBuy ? "inv_buy" : "inv_sell"} ${shares.toStringAsFixed(4)} وحدة',
                                    style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurface,
                                        fontFamily: 'Cairo',
                                        fontWeight: FontWeight.w700,
                                        fontSize: 13)),
                                Text(
                                    '${tx['transaction_date']} • سعر \$${price.toStringAsFixed(2)}',
                                    style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                        fontFamily: 'Cairo',
                                        fontSize: 11)),
                              ])),
                          Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                    '${isBuy ? "-" : "+"}\$${(shares * price).toStringAsFixed(0)}',
                                    style: TextStyle(
                                        color: color,
                                        fontWeight: FontWeight.w900,
                                        fontFamily: 'monospace',
                                        fontSize: 13)),
                                if (comm > 0)
                                  Text('inv_commission'.tr(args: [comm.toStringAsFixed(2)]),
                                      style: TextStyle(
                                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                                          fontSize: 10,
                                          fontFamily: 'Cairo')),
                              ]),
                        ]),
                      );
                    },
                  ),
                ),
              const SizedBox(height: 16),
            ])),
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
      _symbolCtrl.clear();
      _nameCtrl.clear();
      _sharesCtrl.clear();
      _avgPriceCtrl.clear();
      _currentPriceCtrl.clear();
      _isHalal = true;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20),
          child: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text('inv_new',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Theme.of(context).colorScheme.onSurface,
                    fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            _field(_symbolCtrl, 'inv_symbol_hint', TextInputType.text),
            const SizedBox(height: 10),
            _field(_nameCtrl, 'inv_name_hint', TextInputType.text),
            const SizedBox(height: 10),
            _field(_sharesCtrl, 'inv_shares_hint',
                const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 10),
            _field(_avgPriceCtrl, 'inv_avg_price_hint',
                const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 10),
            _field(_currentPriceCtrl, 'inv_current_price_hint',
                const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => setS(() => _isHalal = !_isHalal),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _isHalal
                      ? (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF10B981)
                              : const Color(0xFF10B981))
                          .withValues(alpha: 0.1)
                      : Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: _isHalal
                          ? (Theme.of(context).brightness == Brightness.dark
                                  ? const Color(0xFF10B981)
                                  : const Color(0xFF10B981))
                              .withValues(alpha: 0.4)
                          : Theme.of(context).colorScheme.outlineVariant),
                ),
                child: Row(children: [
                  Icon(_isHalal ? Icons.check_circle : Icons.circle_outlined,
                      color: _isHalal
                          ? const Color(0xFF10B981)
                          : const Color(0xFF64748B),
                      size: 20),
                  const SizedBox(width: 10),
                  Text('inv_halal',
                      style: TextStyle(
                          color: _isHalal
                              ? const Color(0xFF10B981)
                              : const Color(0xFF94A3B8),
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w700)),
                ]),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _addInvestment,
                  style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  child: _saving
                      ? CircularProgressIndicator(
                          color: Theme.of(context).colorScheme.onPrimary, strokeWidth: 2)
                      : Text('inv_save',
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900,
                              fontSize: 15)),
                )),
            const SizedBox(height: 16),
          ])),
        ),
      ),
    );
  }

  TextField _field(
      TextEditingController ctrl, String hint, TextInputType type) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontFamily: 'Cairo'),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle:
            TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
        filled: true,
        fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final gain = _totalValue - _totalCost;
    final gainPct = _totalCost > 0 ? (gain / _totalCost * 100) : 0.0;
    final fv = _calcFV(_monthly, _years, _rate);
    final totalInvested = _monthly * _years * 12;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        title: Text('inv_title',
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          // Currency toggle
          GestureDetector(
            onTap: () => setState(() => _showInUsd = !_showInUsd),
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Text(
                _showInUsd ? '💵 USD' : '🇯🇴 JOD',
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 11,
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700),
              ),
            ),
          ),
          IconButton(
            icon: Icon(Icons.refresh, color: colorScheme.primary),
            tooltip: 'inv_refresh',
            onPressed: () async {
              setState(() => _loading = true);
              try {
                await _load();
              } catch (e) {
                if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Investments Refresh');
              } finally {
                if (mounted) setState(() => _loading = false);
              }
            },
          ),
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              onPressed: _showAddDialog),
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
                child: Column(children: [
                  // Portfolio Summary
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [
                        colorScheme.primary.withValues(alpha: 0.15),
                        colorScheme.secondary.withValues(alpha: 0.15)
                      ]),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                          color:
                              colorScheme.primary.withValues(alpha: 0.2)),
                    ),
                    child: Column(children: [
                      Text('inv_total_value',
                          style: TextStyle(
                              color: colorScheme.onSurfaceVariant,
                              fontFamily: 'Cairo',
                              fontSize: 13)),
                      const SizedBox(height: 8),
                      Text(
                        _showInUsd
                            ? '\$${_totalValue.toStringAsFixed(2)}'
                            : '${(_totalValue * _jodRate).toStringAsFixed(2)} JOD',
                        style: TextStyle(
                            color: colorScheme.onSurface,
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Cairo'),
                      ),
                      const SizedBox(height: 8),
                      Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                                gain >= 0
                                    ? Icons.trending_up
                                    : Icons.trending_down,
                                color: gain >= 0
                                    ? const Color(0xFF10B981)
                                    : const Color(0xFFEF4444),
                                size: 18),
                            const SizedBox(width: 6),
                            Text(
                                '${gain >= 0 ? '+' : ''}\$${gain.toStringAsFixed(2)} (${gainPct.toStringAsFixed(1)}%)',
                                style: TextStyle(
                                    color: gain >= 0
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFFEF4444),
                                    fontFamily: 'Cairo',
                                    fontWeight: FontWeight.w700)),
                          ]),
                      const SizedBox(height: 12),
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _miniStat(
                                'inv_cost',
                                '\$${_totalCost.toStringAsFixed(0)}',
                                colorScheme.onSurfaceVariant),
                            _miniStat('inv_assets', '${_investments.length}',
                                colorScheme.primary),
                            _miniStat(
                                'inv_halal',
                                '${_investments.where((i) => i['is_halal'] == true).length}',
                                const Color(0xFF10B981)),
                          ]),
                    ]),
                  ),
                  // Portfolio Chart
                  if (_investments.isNotEmpty && _totalValue > 0) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: const Color(0xFF0F1629),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF1E293B))),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('inv_portfolio_chart',
                                style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo',
                                    fontSize: 14)),
                            const SizedBox(height: 12),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Row(
                                  children: _investments.map((inv) {
                                final val = (inv['shares'] as num).toDouble() *
                                    (inv['current_price'] as num).toDouble();
                                final pct = val / _totalValue * 100;
                                final colors = [
                                  const Color(0xFF3B7EF6),
                                  const Color(0xFF10B981),
                                  const Color(0xFFF59E0B),
                                  const Color(0xFF8B5CF6),
                                  const Color(0xFFEF4444)
                                ];
                                final color = colors[
                                    _investments.indexOf(inv) % colors.length];
                                return Expanded(
                                    flex: pct.round() == 0 ? 1 : pct.round(),
                                    child: Container(
                                        height: 10,
                                        decoration: BoxDecoration(
                                            color: color,
                                            border: Border(
                                                right: BorderSide(
                                                    color: colorScheme.surface,
                                                    width: 2)))));
                              }).toList()),
                            ),
                            const SizedBox(height: 12),
                            ..._investments.map((inv) {
                              final val = (inv['shares'] as num).toDouble() *
                                  (inv['current_price'] as num).toDouble();
                              final pct = _totalValue > 0
                                  ? (val / _totalValue * 100)
                                  : 0.0;
                              final colors = [
                                const Color(0xFF3B7EF6),
                                const Color(0xFF10B981),
                                const Color(0xFFF59E0B),
                                const Color(0xFF8B5CF6),
                                const Color(0xFFEF4444)
                              ];
                              final color = colors[
                                  _investments.indexOf(inv) % colors.length];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Row(children: [
                                  Container(
                                      width: 10,
                                      height: 10,
                                      decoration: BoxDecoration(
                                          color: color,
                                          borderRadius:
                                              BorderRadius.circular(3))),
                                  const SizedBox(width: 8),
                                  Expanded(
                                      child: Text(inv['symbol'] ?? '',
                                          style: TextStyle(
                                              color: colorScheme.onSurface,
                                              fontFamily: 'Cairo',
                                              fontWeight: FontWeight.w700,
                                              fontSize: 13))),
                                  Text('${pct.toStringAsFixed(1)}%',
                                      style: TextStyle(
                                          color: colorScheme.onSurfaceVariant,
                                          fontFamily: 'Cairo',
                                          fontSize: 12)),
                                  const SizedBox(width: 8),
                                  Text('\$${val.toStringAsFixed(0)}',
                                      style: TextStyle(
                                          color: colorScheme.onSurface,
                                          fontFamily: 'monospace',
                                          fontWeight: FontWeight.w900,
                                          fontSize: 13)),
                                ]),
                              );
                            }),
                          ]),
                    ),
                    const SizedBox(height: 16),
                  ],

                    GestureDetector(
                      onTap: () =>
                          setState(() => _showSimulator = !_showSimulator),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                              color:
                                  colorScheme.secondary.withValues(alpha: 0.3)),
                        ),
                        child: Row(children: [
                        const Text('🚀', style: TextStyle(fontSize: 20)),
                        const SizedBox(width: 10),
                        Expanded(
                            child: Text('wealthSimulator',
                                style: TextStyle(
                                    color: colorScheme.onSurface,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'Cairo',
                                    fontSize: 14))),
                        Icon(
                            _showSimulator
                                ? Icons.keyboard_arrow_up
                                : Icons.keyboard_arrow_down,
                            color: colorScheme.onSurfaceVariant),
                      ]),
                    ),
                  ),

                  if (_showSimulator) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        _slider(
                            'monthlyInvestment',
                            '\$${_monthly.toStringAsFixed(0)}',
                            _monthly,
                            10,
                            1000,
                            (v) => setState(() => _monthly = v)),
                        _slider(
                            'duration',
                            '${_years.toInt()} ${'year'}',
                            _years.toDouble(),
                            1,
                            30,
                            (v) => setState(() => _years = v.toInt())),
                        _slider('annualReturn', '${_rate.toStringAsFixed(0)}%',
                            _rate, 1, 20, (v) => setState(() => _rate = v)),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                              color: colorScheme.secondary
                                  .withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                  color: colorScheme.secondary
                                      .withValues(alpha: 0.3))),
                          child: Column(children: [
                            Text('بعد $_years سنة',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontFamily: 'Cairo',
                                    fontSize: 12)),
                            Text('\$${fv.toStringAsFixed(0)}',
                                style: TextStyle(
                                    color: colorScheme.secondary,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 28,
                                    fontFamily: 'Cairo')),
                            Text(
                                'استثمرت: \$${totalInvested.toStringAsFixed(0)} | ربح: \$${(fv - totalInvested).toStringAsFixed(0)}',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 11,
                                    fontFamily: 'Cairo')),
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
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        const Text('📈', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        Text('لا توجد استثمارات بعد',
                            style: TextStyle(
                                color: colorScheme.onSurfaceVariant,
                                fontFamily: 'Cairo',
                                fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                            onPressed: _showAddDialog,
                            child: const Text('أضف استثمارك الأول',
                                style: TextStyle(fontFamily: 'Cairo'))),
                      ]),
                    )
                  else ...[
                    Align(
                        alignment: Alignment.centerRight,
                        child: Text('محفظتي (${_investments.length})',
                            style: TextStyle(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 15))),
                    const SizedBox(height: 10),
                    ..._investments.map((inv) => _invCard(inv)),
                  ],

                  // Halal Note
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                            color: const Color(0xFF10B981)
                                .withValues(alpha: 0.15))),
                    child: Row(children: [
                      const Text('🕌', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Text(
                              'تأكد من استثمارك في صناديق حلال مثل SPUS أو HLAL',
                              style: TextStyle(
                                  color: colorScheme.onSurfaceVariant,
                                  fontFamily: 'Cairo',
                                  fontSize: 12))),
                    ]),
                  ),
                ]),
              ),
            ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(children: [
      Text(value,
          style: TextStyle(
              color: color,
              fontWeight: FontWeight.w900,
              fontFamily: 'Cairo',
              fontSize: 16)),
      Text(label,
          style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 11)),
    ]);
  }

  Widget _slider(String label, String value, double v, double min, double max,
      ValueChanged<double> onChanged) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label,
            style: TextStyle(
                color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 12)),
        Text(value,
            style: TextStyle(
                color: colorScheme.onSurface,
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w700,
                fontSize: 12)),
      ]),
      Slider(
          value: v,
          min: min,
          max: max,
          activeColor: colorScheme.secondary,
          inactiveColor: colorScheme.outlineVariant,
          onChanged: onChanged),
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

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: colorScheme.outlineVariant)),
      child: Column(children: [
        Row(children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12)),
            child: Center(
                child: Text(inv['symbol']?.toString().substring(0, 1) ?? '?',
                    style: TextStyle(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                        fontSize: 18))),
          ),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Row(children: [
                  Text(inv['symbol'] ?? '',
                      style: TextStyle(
                          color: colorScheme.onSurface,
                          fontWeight: FontWeight.w900,
                          fontFamily: 'Cairo',
                          fontSize: 14)),
                  if (isHalal) ...[
                    const SizedBox(width: 6),
                    const Text('🕌', style: TextStyle(fontSize: 12))
                  ],
                ]),
                Text(
                    '${shares.toStringAsFixed(4)} سهم • \$${currentPrice.toStringAsFixed(2)}',
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 11,
                        fontFamily: 'Cairo')),
              ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('\$${value.toStringAsFixed(2)}',
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'Cairo')),
            Text('${gain >= 0 ? '+' : ''}${gainPct.toStringAsFixed(1)}%',
                style: TextStyle(
                    color: gain >= 0
                        ? const Color(0xFF10B981)
                        : const Color(0xFFEF4444),
                    fontSize: 12,
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => _showAddDialog(existing: inv),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color:
                              colorScheme.primary.withValues(alpha: 0.2))),
                  child: Icon(Icons.edit,
                      color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => _deleteInvestment(inv['id'].toString()),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: colorScheme.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color:
                              colorScheme.error.withValues(alpha: 0.2))),
                  child: Icon(Icons.close,
                      color: colorScheme.error, size: 14))),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: cost > 0 ? (value / (cost * 2)).clamp(0.0, 1.0) : 0,
            backgroundColor: colorScheme.outlineVariant,
            valueColor: AlwaysStoppedAnimation(
                gain >= 0 ? const Color(0xFF10B981) : colorScheme.error),
            minHeight: 4,
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
              child: OutlinedButton(
            onPressed: () =>
                _showTxHistory(inv['id'].toString(), inv['symbol']),
            style: OutlinedButton.styleFrom(
                foregroundColor: colorScheme.onSurfaceVariant,
                side: BorderSide(color: colorScheme.outlineVariant),
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
            child: const Text('سجل المعاملات',
                style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          )),
          const SizedBox(width: 8),
          Expanded(
              child: OutlinedButton(
            onPressed: () => setState(() => _showBuyFormId =
                _showBuyFormId == inv['id'].toString()
                    ? null
                    : inv['id'].toString()),
            style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF10B981),
                side:
                    BorderSide(color: const Color(0xFF10B981).withOpacity(0.3)),
                padding: const EdgeInsets.symmetric(vertical: 8),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8))),
            child: const Text('+ تسجيل شراء',
                style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 11,
                    fontWeight: FontWeight.w700)),
          )),
        ]),
        if (_showBuyFormId == inv['id'].toString()) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              Row(children: [
                Expanded(
                    child: _miniField(_buySharesCtrl, 'عدد الأسهم',
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_buyPriceCtrl, 'السعر \$',
                        const TextInputType.numberWithOptions(decimal: true))),
                const SizedBox(width: 8),
                Expanded(
                    child: _miniField(_buyCommCtrl, 'العمولة \$',
                        const TextInputType.numberWithOptions(decimal: true))),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _savingBuy ? null : () => _recordBuy(inv),
                    style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8))),
                    child: _savingBuy
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('تسجيل',
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w900,
                                fontSize: 12)),
                  )),
            ]),
          ),
        ],
      ]),
    );
  }

  TextField _miniField(
          TextEditingController ctrl, String hint, TextInputType type) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.center,
      style: TextStyle(
          color: colorScheme.onSurface, fontFamily: 'Cairo', fontSize: 12),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(
            color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo', fontSize: 10),
        filled: true,
        fillColor: colorScheme.surface,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      ),
    );
  }
}
