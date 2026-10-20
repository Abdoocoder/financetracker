import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class AlertFilterTabs extends StatelessWidget {
  final String currentFilter;
  final int totalCount;
  final int unreadCount;
  final int warningCount;
  final int achievementCount;
  final int motivationCount;
  final Function(String) onFilterChanged;
  final ColorScheme colorScheme;

  const AlertFilterTabs({
    super.key,
    required this.currentFilter,
    required this.totalCount,
    required this.unreadCount,
    required this.warningCount,
    required this.achievementCount,
    required this.motivationCount,
    required this.onFilterChanged,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _filterTab('all', 'alerts_filter_all'.tr(), totalCount),
          _filterTab('unread', 'alerts_filter_unread'.tr(), unreadCount),
          _filterTab('warning', 'alerts_filter_warning'.tr(), warningCount),
          _filterTab('achievement', 'alerts_filter_achievement'.tr(), achievementCount),
          _filterTab('motivation', 'alerts_filter_motivation'.tr(), motivationCount),
        ],
      ),
    );
  }

  Widget _filterTab(String key, String label, int count) {
    final isSelected = currentFilter == key;
    final hasCount = count > 0;

    return Padding(
      padding: const EdgeInsets.only(left: 8),
      child: GestureDetector(
        onTap: () => onFilterChanged(key),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? colorScheme.primary : colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? colorScheme.primary
                  : colorScheme.outlineVariant,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : colorScheme.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (hasCount) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.white.withValues(alpha: 0.2)
                        : colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    count.toString(),
                    style: TextStyle(
                      color: isSelected ? Colors.white : colorScheme.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}