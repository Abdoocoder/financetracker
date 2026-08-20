import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class AlertHeader extends StatelessWidget {
  final int totalCount;
  final int unreadCount;
  final ColorScheme colorScheme;

  const AlertHeader({
    super.key,
    required this.totalCount,
    required this.unreadCount,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(children: [
          Text('alerts_count'.tr(args: [totalCount.toString()]),
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 13)),
          if (unreadCount > 0) ...[
            const SizedBox(width: 8),
            Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12)),
                child: Text('alerts_unread_count'.tr(args: [unreadCount.toString()]),
                    style: const TextStyle(
                        color: AppColors.error,
                        fontSize: 10,
                        fontWeight: FontWeight.w900))),
          ]
        ]),
      ],
    );
  }
}
