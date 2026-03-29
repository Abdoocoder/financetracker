import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

double? _yearsToFIRE(double target, double current, double monthlyContrib, double annualReturn) {
  if (monthlyContrib <= 0 && current >= target) return 0;
  if (monthlyContrib <= 0) return null;
  final r = annualReturn / 100 / 12;
  double balance = current;
  for (int month = 1; month <= 600; month++) {
    balance = balance * (1 + r) + monthlyContrib;
    if (balance >= target) return (month / 12 * 10).roundToDouble() / 10;
  }
  return null;
}

class FIRECalculatorScreen extends StatefulWidget {
  const FIRECalculatorScreen({super.key});
  @override
  State<FIRECalculatorScreen> createState() => _FIRECalculatorScreenState();
}

class _FIRECalculatorScreenState extends State<FIRECalculatorScreen> {
  double _monthlyExpenses = 500;
  double _withdrawalRate = 4;
  double _annualReturn = 7;
  double _monthlyContrib = 200;
  double _currentNetWorth = 0;
  String _currency = 'JOD';
  String _mode = 'full';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('investments')
            .select('shares,current_price')
            .eq('user_id', user.id),
        Supabase.instance.client
            .from('savings_goals')
            .select('current_amount')
            .eq('user_id', user.id),
        Supabase.instance.client
            .from('debts')
            .select('remaining_amount')
            .eq('user_id', user.id)
            .eq('is_paid', false),
        Supabase.instance.client
            .from('profiles')
            .select('currency,monthly_income')
            .eq('id', user.id)
            .single(),
      ]);
      final investments = results[0] as List;
      final goals = results[1] as List;
      final debts = results[2] as List;
      final profile = results[3] as Map<String, dynamic>;
      final invValue = investments.fold(
          0.0,
          (a, i) =>
              a +
              (i['shares'] as num).toDouble() *
                  (i['current_price'] as num).toDouble());
      final goalsSaved = goals.fold(
          0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
      final totalDebt = debts.fold(
          0.0, (a, d) => a + (d['remaining_amount'] as num).toDouble());
      final income = (profile['monthly_income'] as num?)?.toDouble() ?? 0;
      if (mounted) {
        setState(() {
          _currentNetWorth =
              (invValue + goalsSaved - totalDebt).clamp(0, double.infinity);
          _currency = profile['currency'] as String? ?? 'JOD';
          if (income > 0) {
            _monthlyExpenses = (income * 0.7).roundToDouble();
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e,
            context: context, developerMessage: 'FIRE Calc Load');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final modeMultiplier = _mode == 'lean' ? 0.7 : _mode == 'fat' ? 1.5 : 1.0;
    final annualExpenses = _monthlyExpenses * 12 * modeMultiplier;
    final fireNumber = annualExpenses / (_withdrawalRate / 100);
    final progress = ((_currentNetWorth / fireNumber) * 100).clamp(0.0, 100.0);
    final years = _yearsToFIRE(fireNumber, _currentNetWorth, _monthlyContrib, _annualReturn);
    final color = progress >= 75 ? const Color(0xFF10B981) : progress >= 40 ? const Color(0xFFF59E0B) : cs.primary;

    String fmt(double n) => NumberFormat('#,##0', 'en').format(n);

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text('fire_title'.tr()), backgroundColor: cs.surface),
        body: Center(child: CircularProgressIndicator(color: cs.primary)),
      );
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('fire_title'.tr(), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: cs.onSurface)),
        backgroundColor: cs.surface,
        elevation: 0,
        iconTheme: IconThemeData(color: cs.onSurface),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Mode toggle
          Container(
            decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: cs.outlineVariant)),
            child: Row(children: ['lean', 'full', 'fat'].map((m) {
              final active = _mode == m;
              final label = m == 'lean' ? 'lean_fire'.tr() : m == 'full' ? 'full_fire'.tr() : 'fat_fire'.tr();
              return Expanded(child: GestureDetector(
                onTap: () => setState(() => _mode = m),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: active ? cs.primary : Colors.transparent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(label, textAlign: TextAlign.center,
                    style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 12,
                      color: active ? Colors.white : cs.onSurfaceVariant)),
                ),
              ));
            }).toList()),
          ),
          const SizedBox(height: 16),

          // FIRE Number Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: cs.outlineVariant)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('fire_number_label'.tr(), style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: cs.onSurfaceVariant)),
              const SizedBox(height: 4),
              Row(children: [
                Text(fmt(fireNumber), style: TextStyle(fontFamily: 'Cairo', fontSize: 32, fontWeight: FontWeight.w900, color: color)),
                const SizedBox(width: 6),
                Text(_currency, style: TextStyle(fontFamily: 'Cairo', fontSize: 14, color: cs.onSurfaceVariant)),
              ]),
              const SizedBox(height: 16),
              // Progress
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('fire_progress'.tr(), style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: cs.onSurfaceVariant)),
                Text('${progress.toStringAsFixed(1)}%', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: color)),
              ]),
              const SizedBox(height: 6),
              ClipRRect(borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(value: progress / 100, backgroundColor: cs.surfaceContainerHighest,
                  valueColor: AlwaysStoppedAnimation(color), minHeight: 8)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _StatBox(label: 'current_net_worth'.tr(), value: fmt(_currentNetWorth), currency: _currency, color: const Color(0xFF10B981), cs: cs)),
                const SizedBox(width: 10),
                Expanded(child: _StatBox(label: 'remaining'.tr(), value: fmt((fireNumber - _currentNetWorth).clamp(0, double.infinity)), currency: _currency, color: const Color(0xFFEF4444), cs: cs)),
              ]),
              const SizedBox(height: 14),
              Container(
                width: double.infinity, padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: years != null && years <= 10 ? const Color(0xFF10B981).withValues(alpha: 0.08) : cs.primary.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: years != null && years <= 10 ? const Color(0xFF10B981).withValues(alpha: 0.2) : cs.primary.withValues(alpha: 0.15)),
                ),
                child: years == null
                  ? Text('fire_increase_contrib'.tr(), textAlign: TextAlign.center,
                      style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w700, fontSize: 13, color: Color(0xFFEF4444)))
                  : years == 0
                    ? Text('fire_already_there'.tr(), textAlign: TextAlign.center,
                        style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF10B981)))
                    : Column(children: [
                        Text('fire_time_label'.tr(), style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: cs.onSurfaceVariant)),
                        const SizedBox(height: 4),
                        Text('$years ${'fire_years'.tr()}', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 26, color: years <= 10 ? const Color(0xFF10B981) : cs.primary)),
                      ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // Sliders
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: cs.outlineVariant)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('settings'.tr(), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w800, fontSize: 13, color: cs.onSurface)),
              const SizedBox(height: 16),
              _Slider(label: '${'monthly_expenses'.tr()} ($_currency)', value: _monthlyExpenses, min: 100, max: 5000, divisions: 98, onChanged: (v) => setState(() => _monthlyExpenses = v)),
              _Slider(label: '${'monthly_contrib'.tr()} ($_currency)', value: _monthlyContrib, min: 0, max: 3000, divisions: 60, onChanged: (v) => setState(() => _monthlyContrib = v)),
              _Slider(label: '${'annual_return'.tr()} (%)', value: _annualReturn, min: 1, max: 20, divisions: 38, onChanged: (v) => setState(() => _annualReturn = v)),
              _Slider(label: '${'withdrawal_rate'.tr()} (%)', value: _withdrawalRate, min: 2, max: 8, divisions: 12, onChanged: (v) => setState(() => _withdrawalRate = v)),
            ]),
          ),
          const SizedBox(height: 80),
        ]),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label, value, currency;
  final Color color;
  final ColorScheme cs;
  const _StatBox({required this.label, required this.value, required this.currency, required this.color, required this.cs});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(12)),
    child: Column(children: [
      Text(label, style: TextStyle(fontFamily: 'Cairo', fontSize: 10, color: cs.onSurfaceVariant), textAlign: TextAlign.center),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontFamily: 'Cairo', fontSize: 18, fontWeight: FontWeight.w900, color: color)),
    ]),
  );
}

class _Slider extends StatelessWidget {
  final String label;
  final double value, min, max;
  final int divisions;
  final ValueChanged<double> onChanged;
  const _Slider({required this.label, required this.value, required this.min, required this.max, required this.divisions, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(child: Text(label, style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: cs.onSurfaceVariant))),
        Text(value.toStringAsFixed(value % 1 == 0 ? 0 : 1), style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 13, color: cs.onSurface)),
      ]),
      Slider(value: value, min: min, max: max, divisions: divisions, activeColor: cs.primary, onChanged: onChanged),
    ]));
  }
}
