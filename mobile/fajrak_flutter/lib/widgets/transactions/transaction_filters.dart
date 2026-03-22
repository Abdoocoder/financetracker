import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class TransactionFilters extends StatelessWidget {
  final String currentFilter;
  final String currentSearch;
  final Function(String) onSearchChanged;
  final Function(String) onFilterChanged;
  final VoidCallback onShowDatePicker;
  final ColorScheme colorScheme;

  const TransactionFilters({
    super.key,
    required this.currentFilter,
    required this.currentSearch,
    required this.onSearchChanged,
    required this.onFilterChanged,
    required this.onShowDatePicker,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: currentSearch,
                  onChanged: onSearchChanged,
                  style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                  decoration: InputDecoration(
                    hintText: 'search_hint'.tr(),
                    prefixIcon: Icon(Icons.search, color: colorScheme.onSurfaceVariant),
                    filled: true,
                    fillColor: colorScheme.surface,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: colorScheme.outlineVariant)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: onShowDatePicker,
                icon: Icon(Icons.calendar_month, color: colorScheme.primary),
                style: IconButton.styleFrom(
                  backgroundColor: colorScheme.surface,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: colorScheme.outlineVariant)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _filterChip('all', 'trans_all'.tr()),
                const SizedBox(width: 8),
                _filterChip('income', 'trans_income'.tr()),
                const SizedBox(width: 8),
                _filterChip('expense', 'trans_expense'.tr()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String value, String label) {
    final selected = currentFilter == value;
    return GestureDetector(
      onTap: () => onFilterChanged(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? colorScheme.primary : colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? colorScheme.primary : colorScheme.outlineVariant),
        ),
        child: Text(label,
            style: TextStyle(
                color: selected ? Colors.white : colorScheme.onSurfaceVariant,
                fontFamily: 'Cairo',
                fontSize: 12,
                fontWeight: FontWeight.bold)),
      ),
    );
  }
}
