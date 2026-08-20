import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class AlertFilterTabs extends StatelessWidget {
  final String currentFilter;
  final int totalCount;
  final int unreadCount;
  final Function(String) onFilterChanged;
  final ColorScheme colorScheme;

  const AlertFilterTabs({
    super.key,
    required this.currentFilter,
    required this.totalCount,
    required this.unreadCount,
    required this.onFilterChanged,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(children: [
        _filterTab('all', '${'alerts_filter_all'.tr()} ($totalCount)'),
        _filterTab('unread', '${'alerts_filter_unread'.tr()} ($unreadCount)'),
        _filterTab('warning', 'alerts_filter_warning'.tr()),
        _filterTab('achievement', 'alerts_filter_achievement'.tr()),
        _filterTab('motivation', 'alerts_filter_motivation'.tr()),
      ]),
    );
  }

  Widget _filterTab(String key, String label) => Padding(
        padding: const EdgeInsets.only(left: 8),
        child: GestureDetector(
          onTap: () => onFilterChanged(key),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: currentFilter == key ? colorScheme.primary : colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: currentFilter == key
                      ? colorScheme.primary
                      : colorScheme.outlineVariant),
            ),
            child: Text(label,
                style: TextStyle(
                    color: currentFilter == key ? Colors.white : colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          ),
        ),
      );
}
