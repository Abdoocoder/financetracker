import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../services/currency_service.dart';

/// يفتح BottomSheet لاختيار العملة مع بحث وتجميع.
Future<void> showCurrencyPickerSheet({
  required BuildContext context,
  required String selectedCode,
  required ValueChanged<String> onSelected,
}) async {
  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _CurrencyPickerSheet(
      selectedCode: selectedCode,
      onSelected: onSelected,
    ),
  );
}

class _CurrencyPickerSheet extends StatefulWidget {
  final String selectedCode;
  final ValueChanged<String> onSelected;
  const _CurrencyPickerSheet({required this.selectedCode, required this.onSelected});

  @override
  State<_CurrencyPickerSheet> createState() => _CurrencyPickerSheetState();
}

class _CurrencyPickerSheetState extends State<_CurrencyPickerSheet> {
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final allCurrencies = CurrencyService.currencies;

    final filtered = _query.isEmpty
        ? allCurrencies
        : allCurrencies.where((c) {
            final q = _query.toLowerCase();
            return (c['labelAr'] as String).contains(_query) ||
                (c['labelEn'] as String).toLowerCase().contains(q) ||
                (c['value'] as String).toLowerCase().contains(q);
          }).toList();

    // تجميع حسب المجموعة
    final groups = <String, List<Map<String, dynamic>>>{
      'arabic': [],
      'islamic': [],
      'global': [],
    };
    for (final c in filtered) {
      final g = c['group'] as String? ?? 'global';
      groups[g]?.add(c);
    }

    final groupLabels = {'arabic': 'العربية', 'islamic': 'الإسلامية', 'global': 'العالمية'};

    return DraggableScrollableSheet(
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (_, scrollController) => Container(
        decoration: BoxDecoration(
          color: cs.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40, height: 4,
            decoration: BoxDecoration(color: cs.outlineVariant, borderRadius: BorderRadius.circular(2)),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _query = v),
                  autofocus: true,
                  style: TextStyle(color: cs.onSurface),
                  decoration: InputDecoration(
                    hintText: 'ابحث عن عملة...',
                    hintStyle: TextStyle(color: cs.onSurfaceVariant, fontSize: 14),
                    prefixIcon: Icon(Icons.search, color: cs.onSurfaceVariant, size: 20),
                    filled: true,
                    fillColor: cs.surfaceContainerHighest,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(Icons.close, color: cs.onSurfaceVariant),
                tooltip: 'tooltip_close'.tr(),
                onPressed: () => Navigator.pop(context),
              ),
            ]),
          ),
          // List
          Expanded(
            child: ListView(
              controller: scrollController,
              children: [
                for (final groupKey in ['arabic', 'islamic', 'global'])
                  if ((groups[groupKey] ?? []).isNotEmpty) ...[
                    // Group header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text(
                        groupLabels[groupKey]!,
                        style: TextStyle(
                          color: cs.onSurfaceVariant,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    for (final c in groups[groupKey]!)
                      _CurrencyTile(
                        currency: c,
                        isSelected: c['value'] == widget.selectedCode,
                        onTap: () {
                          widget.onSelected(c['value'] as String);
                          Navigator.pop(context);
                        },
                        cs: cs,
                      ),
                  ],
                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Text('لا توجد نتائج', style: TextStyle(color: cs.onSurfaceVariant)),
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ]),
      ),
    );
  }
}

class _CurrencyTile extends StatelessWidget {
  final Map<String, dynamic> currency;
  final bool isSelected;
  final VoidCallback onTap;
  final ColorScheme cs;

  const _CurrencyTile({
    required this.currency,
    required this.isSelected,
    required this.onTap,
    required this.cs,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      tileColor: isSelected ? cs.primary.withValues(alpha: 0.08) : null,
      leading: Text(
        currency['flag'] as String? ?? '🌐',
        style: const TextStyle(fontSize: 24),
      ),
      title: Text(
        currency['labelAr'] as String? ?? currency['value'] as String,
        style: TextStyle(color: cs.onSurface, fontSize: 14, fontWeight: FontWeight.w600),
      ),
      subtitle: Text(
        currency['labelEn'] as String? ?? '',
        style: TextStyle(color: cs.onSurfaceVariant, fontSize: 11),
      ),
      trailing: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: cs.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            currency['value'] as String,
            style: TextStyle(color: cs.onSurfaceVariant, fontSize: 12, fontWeight: FontWeight.w700),
          ),
        ),
        if (isSelected) ...[
          const SizedBox(width: 8),
          Icon(Icons.check_circle, color: cs.primary, size: 20),
        ],
      ]),
    );
  }
}
