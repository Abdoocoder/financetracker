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
    return Row(children: [
      if (unreadCount > 0)
        TextButton(
            onPressed: onMarkAllRead,
            child: Text('alerts_mark_all_read'.tr(),
                style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w900))),
      if (hasAlerts)
        TextButton(
            onPressed: onDeleteAll,
            child: Text('alerts_delete_all'.tr(),
                style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 12,
                    fontWeight: FontWeight.w900))),
    ]);
  }
}
