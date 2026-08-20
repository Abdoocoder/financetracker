import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/dashboard_layout_provider.dart';

/// Opens the dashboard customizer bottom sheet.
void showDashboardCustomizer(BuildContext context) {
  showModalBottomSheet(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const _DashboardCustomizerSheet(),
  );
}

class _DashboardCustomizerSheet extends StatelessWidget {
  const _DashboardCustomizerSheet();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isAr = context.locale.languageCode == 'ar';

    return Consumer<DashboardLayoutProvider>(
      builder: (ctx, provider, _) {
        final visible = provider.visibleOptionalCount;
        final total = provider.totalOptionalCount;

        return Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(color: colorScheme.outlineVariant),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── drag handle ──
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // ── header ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: isAr ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          Text(
                            'dash_customize_title'.tr(),
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'dash_customize_subtitle'.tr(
                              namedArgs: {'visible': visible.toString(), 'total': total.toString()},
                            ),
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Reset button
                    TextButton(
                      onPressed: () {
                        provider.reset();
                      },
                      child: Text(
                        'dash_customize_reset'.tr(),
                        style: TextStyle(
                          fontSize: 13,
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // ── card list ──
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.55,
                ),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  shrinkWrap: true,
                  itemCount: kDashCards.length,
                  itemBuilder: (_, i) {
                    final cfg = kDashCards[i];
                    final on = provider.isVisible(cfg.id);
                    return _CardToggleTile(
                      cfg: cfg,
                      isOn: on,
                      colorScheme: colorScheme,
                      isAr: isAr,
                      onTap: () => provider.toggle(cfg.id),
                    );
                  },
                ),
              ),

              // ── done button ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: Text(
                      'dash_customize_done'.tr(),
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CardToggleTile extends StatelessWidget {
  final DashCardConfig cfg;
  final bool isOn;
  final ColorScheme colorScheme;
  final bool isAr;
  final VoidCallback onTap;

  const _CardToggleTile({
    required this.cfg,
    required this.isOn,
    required this.colorScheme,
    required this.isAr,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final label = cfg.labelKey.tr();
    final isRequired = cfg.required;

    return InkWell(
      onTap: isRequired ? null : onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Row(
          children: [
            // Status dot
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isOn ? colorScheme.primary : colorScheme.outlineVariant,
              ),
            ),
            const SizedBox(width: 12),

            // Label
            Expanded(
              child: Row(
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isOn ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (isRequired) ...[
                    const SizedBox(width: 6),
                    Text(
                      '(${'dash_customize_required'.tr()})',
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Toggle switch
            if (!isRequired)
              Switch.adaptive(
                value: isOn,
                onChanged: (_) => onTap(),
                activeThumbColor: Colors.white,
                activeTrackColor: colorScheme.primary,
              ),
            if (isRequired)
              Icon(Icons.lock_outline_rounded,
                  size: 18, color: colorScheme.outlineVariant),
          ],
        ),
      ),
    );
  }
}
