import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

import '../../widgets/goals/goal_list_item.dart';
import '../../widgets/goals/goal_summary_cards.dart';
import '../../widgets/goals/overall_progress_card.dart';
import '../../widgets/goals/add_goal_dialog.dart';
import '../../widgets/goals/add_amount_dialog.dart';
import '../../widgets/common/skeleton_loader.dart';

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  List<Map<String, dynamic>> _goals = [];
  bool _loading = true;
  bool _saving = false;
  String _currency = 'JOD';

  static final _goalIcons = [
    Icons.track_changes, Icons.directions_car, Icons.home, Icons.diamond, Icons.diamond_outlined,
    Icons.flight, Icons.laptop, Icons.phone_android, Icons.school, Icons.workspace_premium,
    Icons.public, Icons.cast_for_education, Icons.work, Icons.fitness_center, Icons.favorite,
    Icons.eco, Icons.rocket_launch, Icons.star, Icons.energy_savings_leaf, Icons.bar_chart,
    Icons.calendar_today, Icons.account_balance_wallet, Icons.card_giftcard, Icons.shield, Icons.bolt,
    Icons.local_fire_department, Icons.lightbulb, Icons.inventory_2, Icons.attach_money, Icons.beach_access,
  ];

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Goals');
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final results = await Future.wait<dynamic>([
        Supabase.instance.client
            .from('profiles')
            .select('currency')
            .eq('id', user.id)
            .single(),
        Supabase.instance.client
            .from('savings_goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at'),
      ]);
      if (mounted) {
        setState(() {
          _currency = (results[0] as Map)['currency'] as String? ?? 'JOD';
          _goals = List<Map<String, dynamic>>.from(results[1] as List);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'Goals Load');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddGoalDialog(
        existing: existing,
        goalIcons: _goalIcons,
        onSaved: _load,
      ),
    );
  }

  void _showAddAmountDialog(Map<String, dynamic> goal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => AddAmountDialog(
        goal: goal,
        onSaved: _load,
      ),
    );
  }

  Future<void> _deleteGoal(String id) async {
    final colorScheme = Theme.of(context).colorScheme;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: colorScheme.surface,
        title: Text('goals_delete_title'.tr(),
            style: TextStyle(color: colorScheme.onSurface)),
        content: Text('confirm_delete'.tr(),
            style: TextStyle(color: colorScheme.onSurfaceVariant)),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text('cancel'.tr(), style: const TextStyle())),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('delete'.tr(),
                  style: TextStyle(color: Theme.of(context).colorScheme.error))),
        ],
      ),
    );
    if (confirm == true) {
      if (_saving) return;
      _saving = true;
      setState(() {});
      try {
        await Supabase.instance.client.from('savings_goals').delete().eq('id', id);
        await _load();
      } finally {
        if (mounted) setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final totalTarget = _goals.fold(0.0, (a, g) => a + (g['target_amount'] as num).toDouble());
    final totalSaved = _goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
    final completed = _goals.where((g) => (g['current_amount'] as num) >= (g['target_amount'] as num)).length;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('goals_title'.tr(),
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              tooltip: 'goals_add'.tr(),
              onPressed: () => _showAddDialog())
        ],
      ),
      body: _loading
          ? const PageSkeleton()
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  GoalSummaryCards(
                    totalGoals: _goals.length,
                    completedGoals: completed,
                    totalSaved: totalSaved,
                    currency: _currency,
                    colorScheme: colorScheme,
                  ),
                  const SizedBox(height: 16),

                  if (_goals.isNotEmpty) ...[
                    OverallProgressCard(
                      totalSaved: totalSaved,
                      totalTarget: totalTarget,
                      currency: _currency,
                      colorScheme: colorScheme,
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (_goals.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        Icon(Icons.track_changes, size: 48, color: colorScheme.onSurfaceVariant),
                        const SizedBox(height: 12),
                        Text('goals_empty'.tr(),
                            style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                            onPressed: () => _showAddDialog(),
                            child: Text('goals_add_first'.tr(), style: const TextStyle())),
                      ]),
                    )
                  else
                    ..._goals.map((goal) => GoalListItem(
                      key: ValueKey(goal['id']),
                      goal: goal,
                      currency: _currency,
                      colorScheme: colorScheme,
                      onAddAmount: _showAddAmountDialog,
                      onEdit: (g) => _showAddDialog(existing: g),
                      onDelete: _deleteGoal,
                    )),
                ]),
              ),
            ),
    );
  }
}
