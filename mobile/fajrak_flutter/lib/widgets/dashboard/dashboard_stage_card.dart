import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

class DashboardStageCard extends StatelessWidget {
  final String stage;

  const DashboardStageCard({
    super.key,
    required this.stage,
  });

  @override
  Widget build(BuildContext context) {
    final stages = {
      'awareness': (Icons.spa, 'مرحلة الوعي', const Color(0xFF8B5CF6)),
      'debt': (Icons.credit_card, 'مرحلة سداد الديون', const Color(0xFFEF4444)),
      'emergency': (Icons.shield, 'مرحلة الطوارئ', const Color(0xFFF59E0B)),
      'investing': (Icons.show_chart, 'مرحلة الاستثمار', const Color(0xFF10B981)),
      'wealth': (Icons.workspace_premium, 'مرحلة الثروة', const Color(0xFF3B7EF6)),
    };
    final s = stages[stage] ?? stages['awareness']!;
    
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: s.$3.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: s.$3.withValues(alpha: 0.25)),
      ),
      child: Row(children: [
        Icon(s.$1, size: 24, color: s.$3),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('stage'.tr(), style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
          Text('learn_stage_$stage'.tr(), style: TextStyle(color: s.$3, fontWeight: FontWeight.w900, fontSize: 14, fontFamily: 'Cairo')),
        ]),
      ]),
    );
  }
}
