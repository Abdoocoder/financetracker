import 'package:flutter/material.dart';

class BudgetListItem extends StatelessWidget {
  final Map<String, dynamic> budget;
  final double spent;
  final String currency;
  final List<Map<String, dynamic>> localizedCategories;
  final ColorScheme colorScheme;
  final Function(Map<String, dynamic>) onEdit;
  final Function(String) onDelete;

  const BudgetListItem({
    super.key,
    required this.budget,
    required this.spent,
    required this.currency,
    required this.localizedCategories,
    required this.colorScheme,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final cat = localizedCategories.firstWhere(
        (c) => c['key'] == budget['category'],
        orElse: () => {'key': budget['category'], 'icon': '📝'});
    final limit = (budget['monthly_limit'] as num).toDouble();
    final pct = limit > 0 ? (spent / limit).clamp(0.0, 1.0) : 0.0;
    final over = spent > limit;
    final warn = !over && pct > 0.8;
    final color = over
        ? const Color(0xFFEF4444)
        : warn
            ? const Color(0xFFF59E0B)
            : const Color(0xFF10B981);
    final remaining = (limit - spent).clamp(0.0, double.infinity);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: over
                  ? colorScheme.error.withValues(alpha: 0.3)
                  : warn
                      ? Colors.orange.withValues(alpha: 0.2)
                      : colorScheme.outlineVariant)),
      child: Column(children: [
        Row(children: [
          Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12)),
              child: Center(
                  child: Text(cat['icon'] as String,
                      style: const TextStyle(fontSize: 22)))),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(budget['category'] as String,
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w800,
                        fontSize: 14)),
                Text(
                    '${spent.toStringAsFixed(0)} / ${limit.toStringAsFixed(0)} $currency${over ? ' ⚠️ تجاوزت!' : warn ? ' 🔶 اقتربت' : ''}',
                    style: TextStyle(
                        color: color,
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700)),
              ])),
          Text('${(pct * 100).round()}%',
              style: TextStyle(
                  color:
                      over ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7),
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  fontFamily: 'Cairo')),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => onEdit(budget),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: colorScheme.primary.withValues(alpha: 0.2))),
                  child: Icon(Icons.edit,
                      color: colorScheme.primary, size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => onDelete(budget['id'].toString()),
              child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.2))),
                  child: const Icon(Icons.close,
                      color: Color(0xFFEF4444), size: 14))),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
                value: pct,
                backgroundColor: colorScheme.outlineVariant,
                color: color,
                minHeight: 8)),
        const SizedBox(height: 6),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            const Text('متبقي: ',
                style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 11,
                    fontFamily: 'Cairo')),
            Text('${remaining.toStringAsFixed(0)} $currency',
                style: TextStyle(
                    color: over
                        ? const Color(0xFFFCA5A5)
                        : const Color(0xFF6EE7B7),
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                    fontFamily: 'Cairo'))
          ]),
          Text('الحد: ${limit.toStringAsFixed(0)} $currency',
              style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 11,
                  fontFamily: 'Cairo')),
        ]),
      ]),
    );
  }
}
