import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';

class AlertHeader extends StatelessWidget {
  final int unreadCount;
  final ColorScheme colorScheme;

  const AlertHeader({
    super.key,
    required this.unreadCount,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    if (unreadCount == 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.mark_email_unread_outlined,
            size: 14,
            color: AppColors.error,
          ),
          const SizedBox(width: 6),
          Text(
            'alerts_unread_count'.tr(args: [unreadCount.toString()]),
            style: const TextStyle(
              color: AppColors.error,
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}