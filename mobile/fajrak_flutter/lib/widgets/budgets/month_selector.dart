import 'package:flutter/material.dart';

class MonthSelector extends StatelessWidget {
  final int selectedMonth;
  final List<String> monthLabels;
  final Function(int) onMonthSelected;
  final ColorScheme colorScheme;

  const MonthSelector({
    super.key,
    required this.selectedMonth,
    required this.monthLabels,
    required this.onMonthSelected,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
        height: 40,
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          itemCount: 12,
          itemBuilder: (_, i) => GestureDetector(
            onTap: () => onMonthSelected(i + 1),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selectedMonth == i + 1
                    ? colorScheme.primary
                    : colorScheme.surface,
                borderRadius: BorderRadius.circular(100),
                border: Border.all(
                    color: selectedMonth == i + 1
                        ? colorScheme.primary
                        : colorScheme.outlineVariant),
              ),
              child: Text(monthLabels[i],
                  style: TextStyle(
                      color: selectedMonth == i + 1
                          ? Colors.white
                          : colorScheme.onSurfaceVariant,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
            ),
          ),
        ));
  }
}
