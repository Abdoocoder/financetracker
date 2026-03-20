import 'package:flutter/material.dart';

class ChallengesCard extends StatelessWidget {
  final String currency;

  const ChallengesCard({
    super.key,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('🎯 تحديات الادخار', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
              Text('عرض الكل', style: TextStyle(color: Color(0xFF3B7EF6), fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
            ],
          ),
          const SizedBox(height: 16),
          _buildChallengeItem('تحدي الامتناع عن القهوة والكافيهات', '☕', 0.6, 'وفرت 60 من 100 $currency'),
          const SizedBox(height: 12),
          _buildChallengeItem('أسبوع بلا أي تسوق إلكتروني', '🛍️', 0.2, 'يوم 1 من 7', color: const Color(0xFF8B5CF6)),
        ],
      ),
    );
  }

  Widget _buildChallengeItem(String title, String icon, double progress, String subtitle, {Color color = const Color(0xFF10B981)}) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(child: Text(icon, style: const TextStyle(fontSize: 18))),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: const Color(0xFF1E293B),
                  color: color,
                  minHeight: 6,
                ),
              ),
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'Cairo')),
            ],
          ),
        ),
      ],
    );
  }
}
