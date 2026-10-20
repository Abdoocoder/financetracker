import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class AlertActions extends StatelessWidget {
  final int unreadCount;
  final bool hasAlerts;
  final VoidCallback onMarkAllRead;
  final VoidCallback onDeleteAll;
  final ColorScheme colorScheme;

  const AlertActions({
    super.key,
    required this.unreadCount,
    required this.hasAlerts,
    required this.onMarkAllRead,
    required this.onDeleteAll,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    if (!hasAlerts) return const SizedBox.shrink();

    return PopupMenuButton<String>(
      icon: Icon(Icons.more_vert, color: colorScheme.onSurfaceVariant, size: 20),
      tooltip: 'more_options'.tr(),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (context) => [
        if (unreadCount > 0)
          PopupMenuItem<String>(
            value: 'mark_all_read',
            child: Row(
              children: [
                Icon(Icons.done_all, size: 18, color: colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  'alerts_mark_all_read'.tr(),
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        PopupMenuItem<String>(
          value: 'delete_all',
          child: Row(
            children: [
              Icon(Icons.delete_sweep_outlined, size: 18, color: AppColors.error),
              const SizedBox(width: 12),
              Text(
                'alerts_delete_all'.tr(),
                style: const TextStyle(
                  color: AppColors.error,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
      onSelected: (value) {
        if (value == 'mark_all_read') onMarkAllRead();
        if (value == 'delete_all') onDeleteAll();
      },
    );
  }
}