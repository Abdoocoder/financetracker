import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DebtCelebrationDialog extends StatelessWidget {
  final String name;

  const DebtCelebrationDialog({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF0F1629),
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 8),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF10B981).withValues(alpha: 0.1),
            border: Border.all(
                color: const Color(0xFF10B981).withValues(alpha: 0.4), width: 2),
            boxShadow: [
              BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.3),
                  blurRadius: 20,
                  spreadRadius: 5)
            ],
          ),
          child: const Center(child: Icon(Icons.celebration, size: 40, color: Color(0xFF10B981))),
        ),
        const SizedBox(height: 16),
        Text('debts_celebration_title'.tr(),
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                fontFamily: 'Cairo')),
        const SizedBox(height: 8),
        Text('"$name"',
            style: const TextStyle(
                color: Color(0xFF10B981),
                fontWeight: FontWeight.w700,
                fontFamily: 'Cairo',
                fontSize: 16)),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(12)),
          child: Text(
            'debts_celebration_msg'.tr(),
            textAlign: TextAlign.center,
            style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontFamily: 'Cairo',
                fontSize: 12,
                height: 1.6),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              onPressed: () => Navigator.pop(context),
              child: Text('debts_celebration_btn'.tr(),
                  style: const TextStyle(
                      fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
            )),
        const SizedBox(height: 8),
      ]),
    );
  }
}
