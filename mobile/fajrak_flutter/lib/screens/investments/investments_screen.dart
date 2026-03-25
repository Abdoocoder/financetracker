import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

import '../../widgets/investments/portfolio_summary_card.dart';
import '../../widgets/investments/portfolio_chart_card.dart';
import '../../widgets/investments/wealth_simulator_card.dart';
import '../../widgets/investments/investment_list_item.dart';
import '../../widgets/investments/add_investment_dialog.dart';
import '../../services/investments_service.dart';

class InvestmentsScreen extends StatefulWidget {
  const InvestmentsScreen({super.key});
  @override
  State<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends State<InvestmentsScreen> {
  List<Map<String, dynamic>> _investments = [];
  bool _loading = true;
  bool _showInUsd = true;
  static const _jodRate = 0.709;
  String _currency = 'JOD';

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Investments');
    _load();
  }

  Future<void> _load({bool refreshPrices = false}) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final results = await Future.wait([
        Supabase.instance.client.from('investments').select('*').eq('user_id', user.id),
        Supabase.instance.client.from('profiles').select('currency').eq('id', user.id).single(),
      ]);
      final data = results[0] as List;
      final profile = results[1] as Map<String, dynamic>;
      if (mounted) setState(() => _currency = profile['currency'] as String? ?? 'JOD');
      
      var investments = List<Map<String, dynamic>>.from(data);

      if (refreshPrices) {
        for (var i = 0; i < investments.length; i++) {
          final symbol = investments[i]['symbol'] as String?;
          if (symbol != null) {
            final newPrice = await InvestmentsService.fetchPrice(symbol);
            if (newPrice != null) {
              investments[i]['current_price'] = newPrice;
              // Update in DB
              await Supabase.instance.client
                  .from('investments')
                  .update({'current_price': newPrice})
                  .eq('id', investments[i]['id']);
            }
          }
        }
      }

      if (mounted) {
        setState(() {
          _investments = investments;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ErrorHandler.handle(e,
            context: context, developerMessage: 'Investments Load');
      }
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

  Future<void> _deleteInvestment(String id) async {
    final confirm = await showDialog<bool>(
        context: context,
        builder: (_) {
          final theme = Theme.of(context);
          final colorScheme = theme.colorScheme;
          return AlertDialog(
            backgroundColor: colorScheme.surface,
            title: Text('inv_delete_title'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurface, fontFamily: 'Cairo')),
            content: Text('confirm_delete'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo')),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: Text('cancel'.tr(),
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontFamily: 'Cairo'))),
              TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: Text('delete'.tr(),
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

  void _showAddDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F1629),
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => AddInvestmentDialog(onSaved: () => _load()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surface,
        title: Text('inv_title'.tr(),
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
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
                _showInUsd ? 'inv_currency_usd'.tr() : 'inv_currency_jod'.tr(),
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
            tooltip: 'inv_refresh'.tr(),
            onPressed: () async {
              setState(() => _loading = true);
              await _load(refreshPrices: true);
            },
          ),
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              onPressed: _showAddDialog),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: colorScheme.primary))
            : RefreshIndicator(
              onRefresh: () => _load(refreshPrices: true),
              color: colorScheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  PortfolioSummaryCard(
                    totalValue: _totalValue,
                    totalCost: _totalCost,
                    showInUsd: _showInUsd,
                    jodRate: _jodRate,
                    assetsCount: _investments.length,
                    halalCount:
                        _investments.where((i) => i['is_halal'] == true).length,
                  ),
                  const SizedBox(height: 16),
                  PortfolioChartCard(
                    investments: _investments,
                    totalValue: _totalValue,
                  ),
                  const SizedBox(height: 16),
                  WealthSimulatorCard(currency: _currency),
                  const SizedBox(height: 16),
                  if (_investments.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      width: double.infinity,
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border:
                              Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        const Text('📈', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        Text('inv_empty'.tr(),
                            style: TextStyle(
                                color: colorScheme.onSurfaceVariant,
                                fontFamily: 'Cairo',
                                fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                            onPressed: _showAddDialog,
                            child: Text('inv_add_first'.tr(),
                                style: const TextStyle(fontFamily: 'Cairo'))),
                      ]),
                    )
                  else ...[
                    Align(
                        alignment: Alignment.centerRight,
                        child: Text('inv_portfolio_count'.tr(args: [_investments.length.toString()]),
                            style: TextStyle(
                                color: colorScheme.onSurface,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 15))),
                    const SizedBox(height: 10),
                    ..._investments.map((inv) => InvestmentListItem(
                          key: ValueKey(inv['id']),
                          inv: inv,
                          onDelete: _deleteInvestment,
                          onChanged: _load,
                        )),
                  ],
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
                              'inv_halal_tip'.tr(),
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
}
