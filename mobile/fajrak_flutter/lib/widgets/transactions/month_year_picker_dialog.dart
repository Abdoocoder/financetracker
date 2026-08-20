import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class MonthYearPickerDialog extends StatefulWidget {
  final int? initialMonth;
  final int? initialYear;
  final Function(int?, int?) onApplied;

  const MonthYearPickerDialog({
    super.key,
    this.initialMonth,
    this.initialYear,
    required this.onApplied,
  });

  @override
  State<MonthYearPickerDialog> createState() => _MonthYearPickerDialogState();
}

class _MonthYearPickerDialogState extends State<MonthYearPickerDialog> {
  int? _selectedMonth;
  int? _selectedYear;

  @override
  void initState() {
    super.initState();
    _selectedMonth = widget.initialMonth ?? DateTime.now().month;
    _selectedYear = widget.initialYear ?? DateTime.now().year;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('filter_date'.tr(),
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<int>(
                  dropdownColor: const Color(0xFF1E293B),
                  initialValue: _selectedMonth,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                      labelText: 'month'.tr(),
                      filled: true,
                      fillColor: const Color(0xFF1E293B)),
                  items: List.generate(
                      12,
                      (i) => DropdownMenuItem(
                          value: i + 1, child: Text('${i + 1}'))),
                  onChanged: (v) => setState(() => _selectedMonth = v),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: DropdownButtonFormField<int>(
                  dropdownColor: const Color(0xFF1E293B),
                  initialValue: _selectedYear,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                      labelText: 'year'.tr(),
                      filled: true,
                      fillColor: const Color(0xFF1E293B)),
                  items: List.generate(5, (i) {
                    final year = DateTime.now().year - i;
                    return DropdownMenuItem(value: year, child: Text('$year'));
                  }),
                  onChanged: (v) => setState(() => _selectedYear = v),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () {
                    widget.onApplied(null, null);
                    Navigator.pop(context);
                  },
                  child: Text('cancel_filter'.tr(),
                      style: const TextStyle(
                          color: Color(0xFFEF4444))),
                ),
              ),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    widget.onApplied(_selectedMonth, _selectedYear);
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3B7EF6)),
                  child: Text('apply'.tr(),
                      style: const TextStyle(
                          color: Colors.white)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
