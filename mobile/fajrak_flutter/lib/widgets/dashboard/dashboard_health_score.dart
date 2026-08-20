import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class DashboardHealthScore extends StatefulWidget {
  final int score;
  final ColorScheme colorScheme;

  const DashboardHealthScore({
    super.key,
    required this.score,
    required this.colorScheme,
  });

  @override
  State<DashboardHealthScore> createState() => _DashboardHealthScoreState();
}

class _DashboardHealthScoreState extends State<DashboardHealthScore> {
  List<FlSpot> _spots = [];

  @override
  void initState() {
    super.initState();
    // Defer until after the first frame so the dashboard renders before this
    // extra query fires — otherwise it competes with the main render on slow devices.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadHistory();
    });
  }

  Future<void> _loadHistory() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client
        .from('health_score_history')
        .select('recorded_at, score')
        .eq('user_id', user.id)
        .order('recorded_at', ascending: true)
        .limit(30);
    final list = data as List;
    if (list.isEmpty) return;
    if (mounted) {
      setState(() {
        _spots = list.asMap().entries.map((e) =>
          FlSpot(e.key.toDouble(), (e.value['score'] as num).toDouble())
        ).toList();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.score >= 80 ? AppColors.success : widget.score >= 60 ? widget.colorScheme.primary : widget.score >= 40 ? AppColors.warning : AppColors.error;
    final label = widget.score >= 80 ? 'health_excellent'.tr() : widget.score >= 60 ? 'health_good'.tr() : widget.score >= 40 ? 'health_fair'.tr() : 'health_poor'.tr();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(children: [
        Row(children: [
          SizedBox(width: 64, height: 64, child: Stack(alignment: Alignment.center, children: [
            CircularProgressIndicator(value: widget.score / 100, color: color, backgroundColor: widget.colorScheme.outlineVariant, strokeWidth: 6),
            Text('${widget.score}', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 18)),
          ])),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('health_score'.tr(), style: TextStyle(color: widget.colorScheme.onSurfaceVariant, fontSize: 11)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)),
            Text('dash_points_per_100'.tr(), style: TextStyle(color: widget.colorScheme.onSurfaceVariant, fontSize: 11)),
          ])),
        ]),
        // Mini sparkline chart if history is available
        if (_spots.length >= 3) ...[
          const SizedBox(height: 12),
          SizedBox(height: 48, child: LineChart(
            LineChartData(
              gridData: const FlGridData(show: false),
              titlesData: const FlTitlesData(show: false),
              borderData: FlBorderData(show: false),
              lineTouchData: const LineTouchData(enabled: false),
              minY: 0, maxY: 100,
              lineBarsData: [LineChartBarData(
                spots: _spots,
                isCurved: true,
                color: color,
                barWidth: 2,
                dotData: const FlDotData(show: false),
                belowBarData: BarAreaData(
                  show: true,
                  color: color.withValues(alpha: 0.1),
                ),
              )],
            ),
          )),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text('health_history_trend'.tr(), style: TextStyle(fontSize: 10, color: widget.colorScheme.onSurfaceVariant)),
          ]),
        ],
      ]),
    );
  }
}
