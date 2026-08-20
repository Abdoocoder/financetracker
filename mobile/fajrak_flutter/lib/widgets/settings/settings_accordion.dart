import 'package:flutter/material.dart';

class SettingsAccordion extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? badge;
  final Widget child;
  final bool initiallyExpanded;

  const SettingsAccordion({
    super.key,
    required this.icon,
    required this.title,
    this.badge,
    required this.child,
    this.initiallyExpanded = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: theme.copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: initiallyExpanded,
          backgroundColor: Colors.transparent,
          collapsedBackgroundColor: Colors.transparent,
          iconColor: colorScheme.onSurfaceVariant,
          collapsedIconColor: colorScheme.onSurfaceVariant,
          title: Row(children: [
            Icon(icon, size: 18, color: colorScheme.primary),
            const SizedBox(width: 10),
            Text(
              title,
              style: TextStyle(
                color: colorScheme.onSurface,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
            if (badge != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: colorScheme.primary.withValues(alpha: 0.2),
                  ),
                ),
                child: Text(
                  badge!,
                  style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ]),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          children: [child],
        ),
      ),
    );
  }
}
