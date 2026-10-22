import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';

enum AlertActionType {
  viewDetails,
  addTransaction,
  none,
}

class AlertListItem extends StatelessWidget {
  final Map<String, dynamic> alert;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final ColorScheme colorScheme;
  final AlertActionType actionType;
  final VoidCallback? onActionTap;

  const AlertListItem({
    super.key,
    required this.alert,
    required this.color,
    required this.icon,
    required this.onTap,
    required this.onDelete,
    required this.colorScheme,
    this.actionType = AlertActionType.none,
    this.onActionTap,
  });

  String _getDate(String? createdAt) {
    if (createdAt == null) return '';
    try {
      final date = DateTime.parse(createdAt);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return createdAt.split('T')[0];
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRead = alert['is_read'] as bool? ?? true;
    final date = _getDate(alert['created_at'] as String?);
    final title = (alert['title'] as String? ?? '').trim();
    final message = (alert['message'] as String? ?? '').trim();

    // Don't repeat title in message
    final displayMessage = message == title ? '' : message;

    return Dismissible(
      key: ValueKey(alert['id'].toString()),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.error,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white, size: 24),
      ),
      confirmDismiss: (_) async {
        onDelete();
        return true;
      },
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isRead ? colorScheme.surface : color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isRead
                  ? colorScheme.outlineVariant
                  : color.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: TextStyle(
                              color: isRead
                                  ? colorScheme.onSurfaceVariant
                                  : colorScheme.onSurface,
                              fontWeight:
                                  isRead ? FontWeight.w700 : FontWeight.w900,
                              fontSize: 14,
                            ),
                            textAlign: TextAlign.start,
                          ),
                        ),
                        if (!isRead)
                          Container(
                            key: const Key('alert-unread-dot'),
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: color,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: color.withValues(alpha: 0.5),
                                  blurRadius: 8,
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    if (displayMessage.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        displayMessage,
                        style: TextStyle(
                          color: isRead
                              ? colorScheme.onSurfaceVariant
                                  .withValues(alpha: 0.7)
                              : colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.start,
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          date,
                          style: TextStyle(
                            color: colorScheme.onSurfaceVariant,
                            fontSize: 10,
                          ),
                        ),
                        if (actionType != AlertActionType.none &&
                            onActionTap != null)
                          TextButton(
                            onPressed: onActionTap,
                            style: TextButton.styleFrom(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: Text(
                              actionType == AlertActionType.viewDetails
                                  ? 'view_details'.tr()
                                  : 'add_transaction'.tr(),
                              style: TextStyle(
                                color: colorScheme.primary,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}