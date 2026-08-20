import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
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
      'awareness': (Icons.spa, 'مرحلة الوعي', AppColors.purple),
      'debt': (Icons.credit_card, 'مرحلة سداد الديون', AppColors.error),
      'emergency': (Icons.shield, 'مرحلة الطوارئ', AppColors.warning),
      'investing': (Icons.show_chart, 'مرحلة الاستثمار', AppColors.success),
      'wealth': (Icons.workspace_premium, 'مرحلة الثروة', AppColors.primary),
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
          Text('stage'.tr(), style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
          Text('learn_stage_$stage'.tr(), style: TextStyle(color: s.$3, fontWeight: FontWeight.w900, fontSize: 14)),
        ]),
      ]),
    );
  }
}
