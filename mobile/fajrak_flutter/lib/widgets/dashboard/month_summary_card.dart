import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MonthSummaryCard extends StatefulWidget {
  final double prevIncome;
  final double prevExpenses;
  final String currency;
  final String prevMonthName;

  const MonthSummaryCard({
    super.key,
    required this.prevIncome,
    required this.prevExpenses,
    required this.currency,
    required this.prevMonthName,
  });

  @override
  State<MonthSummaryCard> createState() => _MonthSummaryCardState();
}

class _MonthSummaryCardState extends State<MonthSummaryCard> {
  bool _dismissed = true; // default true until async check completes

  @override
  void initState() {
    super.initState();
    _checkDismissed();
  }

  Future<void> _checkDismissed() async {
    final now = DateTime.now();
    if (now.day > 7) return; // only show first 7 days of month
    final prev = DateTime(now.year, now.month - 1);
    final key = 'month_summary_dismissed_${prev.year}-${prev.month.toString().padLeft(2, '0')}';
    final prefs = await SharedPreferences.getInstance();
    if (mounted) setState(() => _dismissed = prefs.getBool(key) ?? false);
  }

  Future<void> _dismiss() async {
    final now = DateTime.now();
    final prev = DateTime(now.year, now.month - 1);
    final key = 'month_summary_dismissed_${prev.year}-${prev.month.toString().padLeft(2, '0')}';
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(key, true);
    if (mounted) setState(() => _dismissed = true);
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    if (_dismissed || now.day > 7) return const SizedBox.shrink();
    if (widget.prevIncome == 0 && widget.prevExpenses == 0) return const SizedBox.shrink();

    final cs = Theme.of(context).colorScheme;
    final prevSaved = widget.prevIncome - widget.prevExpenses;
    final isPositive = prevSaved >= 0;
    final savingsRate = widget.prevIncome > 0
        ? (prevSaved / widget.prevIncome * 100).round()
        : 0;

    final green = AppColors.success;
    final red = AppColors.error;
    final accentColor = isPositive ? green : red;

    String fmt(double n) {
      final abs = n.abs();
      return abs % 1 == 0 ? abs.toStringAsFixed(0) : abs.toStringAsFixed(1);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            accentColor.withValues(alpha: 0.08),
            accentColor.withValues(alpha: 0.04),
          ],
        ),
        border: Border.all(color: accentColor.withValues(alpha: 0.2)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // ── Header ──
          Row(children: [
            const Text('📊', style: TextStyle(fontSize: 18)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'month_summary_title'.tr(args: [widget.prevMonthName]),
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: cs.onSurface,
                ),
              ),
            ),
            GestureDetector(
              onTap: _dismiss,
              child: Icon(Icons.close, size: 18, color: cs.onSurfaceVariant),
            ),
          ]),

          const SizedBox(height: 12),

          // ── Stats Row ──
          Row(children: [
            _StatBox(
              label: 'month_summary_income'.tr(),
              value: '+${fmt(widget.prevIncome)}',
              currency: widget.currency,
              color: green,
            ),
            const SizedBox(width: 8),
            _StatBox(
              label: 'month_summary_expenses'.tr(),
              value: '-${fmt(widget.prevExpenses)}',
              currency: widget.currency,
              color: red,
            ),
            const SizedBox(width: 8),
            _StatBox(
              label: 'month_summary_saved'.tr(),
              value: '${isPositive ? '+' : '-'}${fmt(prevSaved)}',
              currency: widget.currency,
              color: accentColor,
            ),
          ]),

          const SizedBox(height: 12),

          // ── Footer ──
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${isPositive ? '✅' : '⚠️'} ${isPositive ? 'month_summary_positive'.tr() : 'month_summary_negative'.tr()}'
                '${widget.prevIncome > 0 ? ' · $savingsRate% ${'month_summary_rate'.tr()}' : ''}',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: accentColor,
                ),
              ),
            ),
          ]),
        ]),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final String currency;
  final Color color;

  const _StatBox({
    required this.label,
    required this.value,
    required this.currency,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(children: [
          Text(label,
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: cs.onSurfaceVariant),
              textAlign: TextAlign.center),
          const SizedBox(height: 4),
          FittedBox(
            child: Text(value,
                style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: color)),
          ),
          Text(currency,
              style: TextStyle(
                  fontSize: 11,
                  color: cs.onSurfaceVariant)),
        ]),
      ),
    );
  }
}
