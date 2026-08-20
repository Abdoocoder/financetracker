import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class TransactionFilters extends StatelessWidget {
  final String currentFilter;
  final String currentSearch;
  final Function(String) onSearchChanged;
  final Function(String) onFilterChanged;
  final VoidCallback onShowDatePicker;
  final ColorScheme colorScheme;
  final int filterMonth;
  final int filterYear;
  final void Function(int month, int year) onMonthYearChanged;

  const TransactionFilters({
    super.key,
    required this.currentFilter,
    required this.currentSearch,
    required this.onSearchChanged,
    required this.onFilterChanged,
    required this.onShowDatePicker,
    required this.colorScheme,
    required this.filterMonth,
    required this.filterYear,
    required this.onMonthYearChanged,
  });

  void _goPrev(BuildContext context) {
    if (filterMonth == 1) {
      onMonthYearChanged(12, filterYear - 1);
    } else {
      onMonthYearChanged(filterMonth - 1, filterYear);
    }
  }

  void _goNext(BuildContext context) {
    final now = DateTime.now();
    if (filterMonth == now.month && filterYear == now.year) return;
    if (filterMonth == 12) {
      onMonthYearChanged(1, filterYear + 1);
    } else {
      onMonthYearChanged(filterMonth + 1, filterYear);
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isCurrentMonth = filterMonth == now.month && filterYear == now.year;

    const monthKeys = [
      'month_jan', 'month_feb', 'month_mar', 'month_apr',
      'month_may', 'month_jun', 'month_jul', 'month_aug',
      'month_sep', 'month_oct', 'month_nov', 'month_dec',
    ];
    final monthLabel = '${monthKeys[filterMonth - 1].tr()} $filterYear';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Column(
        children: [
          // ── Month Navigator ──
          Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colorScheme.outlineVariant),
            ),
            child: Row(children: [
              _NavButton(
                icon: Icons.chevron_right,
                onTap: () => _goPrev(context),
                colorScheme: colorScheme,
              ),
              Expanded(
                child: GestureDetector(
                  onTap: onShowDatePicker,
                  child: Center(
                    child: Text(
                      monthLabel,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ),
                ),
              ),
              _NavButton(
                icon: Icons.chevron_left,
                onTap: isCurrentMonth ? null : () => _goNext(context),
                colorScheme: colorScheme,
                disabled: isCurrentMonth,
              ),
            ]),
          ),

          Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: currentSearch,
                  onChanged: onSearchChanged,
                  style: TextStyle(color: colorScheme.onSurface),
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
                fontSize: 12,
                fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final ColorScheme colorScheme;
  final bool disabled;

  const _NavButton({
    required this.icon,
    required this.onTap,
    required this.colorScheme,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 22,
          color: disabled
              ? colorScheme.onSurfaceVariant.withValues(alpha: 0.3)
              : colorScheme.onSurface,
        ),
      ),
    );
  }
}
