import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

/// Hawl countdown tone bands — mirrors the web `hawlTone()` helper:
/// safe > 60 days, soon 8–60, urgent 1–7, overdue <= 0, below = no nisab date.
enum HawlTone { safe, soon, urgent, overdue, below }

HawlTone hawlToneFor(int? daysRemaining) {
  if (daysRemaining == null) return HawlTone.below;
  if (daysRemaining <= 0) return HawlTone.overdue;
  if (daysRemaining <= 7) return HawlTone.urgent;
  if (daysRemaining <= 60) return HawlTone.soon;
  return HawlTone.safe;
}

/// لون الشريط/البطاقة لكل حالة — مشترك بين البطاقة وشريط Zakat page.
Color hawlToneColor(HawlTone tone, ColorScheme cs) {
  switch (tone) {
    case HawlTone.safe:
      return const Color(0xFF10B981);
    case HawlTone.soon:
      return const Color(0xFFF59E0B);
    case HawlTone.urgent:
    case HawlTone.overdue:
      return const Color(0xFFEF4444);
    case HawlTone.below:
      return cs.onSurfaceVariant;
  }
}

/// Zakat Autopilot hawl card for the Dashboard.
///
/// Driven by the `sync_zakat_haul_state` RPC ([daysRemaining]): null = below
/// nisab (calculate CTA), <= 0 = due now, otherwise a countdown to the haul.
class ZakatHawlCard extends StatelessWidget {
  final int? daysRemaining;
  final double zakatDue;
  final String currency;
  final VoidCallback? onCalculateTap;

  const ZakatHawlCard({
    super.key,
    required this.daysRemaining,
    required this.zakatDue,
    required this.currency,
    this.onCalculateTap,
  });

  /// Hijri haul year length — the web card uses the same 354-day constant.
  static const int haulDays = 354;

  /// DB numerics carry at most 2 decimals; drop `.00` for whole amounts.
  static String _fmt(num n) => n % 1 == 0 ? n.toStringAsFixed(0) : '$n';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final tone = hawlToneFor(daysRemaining);
    final color = hawlToneColor(tone, cs);
    final isDark = theme.brightness == Brightness.dark;
    final dueText = 'zakat_hawl_due'
        .tr(namedArgs: {'amount': _fmt(zakatDue), 'currency': currency});
    final titleText = Text(
      'zakat_hawl_title'.tr(),
      style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 13),
    );

    final Widget body;
    switch (tone) {
      case HawlTone.below:
        body = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                _IconCircle(icon: Icons.nightlight_round, color: color, isDark: isDark),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'zakat_hawl_below_nisab'.tr(),
                    style: TextStyle(
                        color: cs.onSurface,
                        fontSize: 13,
                        fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: onCalculateTap,
                child: Text('zakat_hawl_calc_btn'.tr()),
              ),
            ),
          ],
        );
      case HawlTone.overdue:
        body = Row(
          children: [
            _IconCircle(icon: Icons.warning_amber_rounded, color: color, isDark: isDark),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  titleText,
                  const SizedBox(height: 2),
                  Text(
                    'zakat_hawl_overdue'.tr(),
                    style: TextStyle(
                        color: color, fontWeight: FontWeight.w900, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(dueText,
                      style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
                ],
              ),
            ),
          ],
        );
      case HawlTone.safe:
      case HawlTone.soon:
      case HawlTone.urgent:
        final elapsed = ((haulDays - daysRemaining!) / haulDays).clamp(0.0, 1.0);
        body = Row(
          children: [
            SizedBox(
              width: 56,
              height: 56,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Semantics(
                    value: '${(elapsed * 100).toStringAsFixed(0)}%',
                    child: CircularProgressIndicator(
                      value: elapsed,
                      strokeWidth: 5,
                      color: color,
                      backgroundColor: cs.outlineVariant,
                    ),
                  ),
                  Text(
                    '$daysRemaining',
                    style: TextStyle(
                        color: color, fontWeight: FontWeight.w900, fontSize: 16),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  titleText,
                  const SizedBox(height: 2),
                  Text(
                    'zakat_hawl_remaining'.tr(namedArgs: {'days': '$daysRemaining'}),
                    style: TextStyle(
                        color: cs.onSurface,
                        fontSize: 12,
                        fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(dueText,
                      style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11)),
                ],
              ),
            ),
          ],
        );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cs.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: isDark ? 0.3 : 0.2)),
      ),
      child: body,
    );
  }
}

class _IconCircle extends StatelessWidget {
  final IconData icon;
  final Color color;
  final bool isDark;

  const _IconCircle({required this.icon, required this.color, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 50,
      height: 50,
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.1 : 0.08),
        shape: BoxShape.circle,
      ),
      child: Center(child: Icon(icon, size: 24, color: color)),
    );
  }
}
