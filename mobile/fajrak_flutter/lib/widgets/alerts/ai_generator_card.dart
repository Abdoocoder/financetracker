import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class AIGeneratorCard extends StatelessWidget {
  final bool generating;
  final VoidCallback onGenerate;
  final ColorScheme colorScheme;

  const AIGeneratorCard({
    super.key,
    required this.generating,
    required this.onGenerate,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            colorScheme.primary.withValues(alpha: 0.08),
            colorScheme.secondary.withValues(alpha: 0.08)
          ]),
          border: Border.all(color: colorScheme.primary.withValues(alpha: 0.2)),
          borderRadius: BorderRadius.circular(16)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                  gradient: LinearGradient(
                      colors: [colorScheme.primary, colorScheme.secondary]),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                        color: colorScheme.primary.withValues(alpha: 0.4),
                        blurRadius: 16)
                  ]),
              child: const Center(child: Icon(Icons.smart_toy, size: 20, color: Colors.white))),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text('alerts_ai_title'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w900,
                        fontSize: 14)),
                Text('alerts_ai_subtitle'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 12)),
              ])),
        ]),
        const SizedBox(height: 16),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: generating ? null : onGenerate,
              style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              child: generating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Text('alerts_ai_generate'.tr(),
                      style: const TextStyle(
                          fontWeight: FontWeight.w900)),
            )),
      ]),
    );
  }
}
