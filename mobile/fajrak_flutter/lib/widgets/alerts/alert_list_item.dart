import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';

class AlertListItem extends StatelessWidget {
  final Map<String, dynamic> alert;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final ColorScheme colorScheme;

  const AlertListItem({
    super.key,
    required this.alert,
    required this.color,
    required this.icon,
    required this.onTap,
    required this.onDelete,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    final isRead = alert['is_read'] as bool? ?? true;
    final date = (alert['created_at'] as String?)?.split('T')[0] ?? '';

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? colorScheme.surface : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: isRead
                  ? colorScheme.outlineVariant
                  : color.withValues(alpha: 0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                        child: Text(alert['title'] as String? ?? '',
                            style: TextStyle(
                                color: isRead
                                    ? colorScheme.onSurfaceVariant
                                    : colorScheme.onSurface,
                                fontWeight: isRead ? FontWeight.w700 : FontWeight.w900,
                                fontSize: 14))),
                    if (!isRead)
                      Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                    color: color.withValues(alpha: 0.5), blurRadius: 8)
                              ])),
                  ]),
                  const SizedBox(height: 4),
                  Text(alert['message'] as String? ?? '',
                      style: TextStyle(
                          color: isRead
                              ? colorScheme.onSurfaceVariant.withValues(alpha: 0.7)
                              : colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          height: 1.6)),
                  const SizedBox(height: 8),
                  Text(date,
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 10)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 16),
              color: AppColors.error.withValues(alpha: 0.7),
              tooltip: 'tooltip_dismiss_alert'.tr(),
              onPressed: onDelete,
            )
          ],
        ),
      ),
    );
  }
}
