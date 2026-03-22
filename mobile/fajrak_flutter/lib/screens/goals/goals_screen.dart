import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  List<Map<String, dynamic>> _goals = [];
  bool _loading = true;
  String _currency = 'JOD';

  static const _goalIcons = [
    '🎯',
    '🚗',
    '🏠',
    '💍',
    '💎',
    '✈️',
    '💻',
    '📱',
    '📚',
    '👑',
    '🌍',
    '🎓',
    '💼',
    '🏋️',
    '🤌',
    '💚',
    '🚀',
    '⭐',
    '🌱',
    '📊',
    '📅',
    '💰',
    '🎁',
    '🛡️',
    '⚡',
    '🔥',
    '💡',
    '📦',
    '🪙',
    '🏝️',
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
  }

  void _showAddDialog({Map<String, dynamic>? existing}) {
    final nameCtrl = TextEditingController(text: existing?['name'] ?? '');
    final targetCtrl = TextEditingController(
        text: existing?['target_amount']?.toString() ?? '');
    final currentCtrl = TextEditingController(
        text: existing?['current_amount']?.toString() ?? '0');
    String selectedIcon = existing?['icon'] as String? ?? '🎯';
    String deadlineDate = existing?['deadline'] as String? ?? '';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) {
          final colorScheme = Theme.of(ctx).colorScheme;
          return Padding(
            padding: EdgeInsets.only(
                bottom: MediaQuery.of(ctx).viewInsets.bottom,
                left: 20,
                right: 20,
                top: 20),
            child: SingleChildScrollView(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
              Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text(existing != null ? 'goals_edit'.tr() : 'goals_new'.tr(),
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 20),
              // Icon Picker
              Align(
                  alignment: Alignment.centerRight,
                  child: Text('goals_choose_icon'.tr(),
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant,
                          fontSize: 12,
                          fontFamily: 'Cairo'))),
              const SizedBox(height: 8),
              SizedBox(
                height: 120,
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 10,
                      mainAxisSpacing: 4,
                      crossAxisSpacing: 4),
                  itemCount: _goalIcons.length,
                  itemBuilder: (_, i) {
                    final icon = _goalIcons[i];
                    final selected = icon == selectedIcon;
                    return GestureDetector(
                      onTap: () => setS(() => selectedIcon = icon),
                      child: Container(
                        decoration: BoxDecoration(
                          color: selected
                              ? colorScheme.primary.withValues(alpha: 0.25)
                              : colorScheme.outlineVariant,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                              color: selected
                                  ? colorScheme.primary
                                  : Colors.transparent),
                        ),
                        child: Center(
                            child:
                                Text(icon, style: const TextStyle(fontSize: 18))),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),
              _field(ctx, nameCtrl, 'goals_name_hint'.tr(),
                  TextInputType.text),
              const SizedBox(height: 10),
              _field(ctx, targetCtrl, 'goals_target_amount'.tr(),
                  const TextInputType.numberWithOptions(decimal: true)),
              const SizedBox(height: 10),
              _field(ctx, currentCtrl, 'goals_current_amount'.tr(),
                  const TextInputType.numberWithOptions(decimal: true)),
              const SizedBox(height: 10),
              // Deadline Date Picker
              GestureDetector(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: deadlineDate.isNotEmpty
                        ? DateTime.tryParse(deadlineDate) ??
                            DateTime.now().add(const Duration(days: 180))
                        : DateTime.now().add(const Duration(days: 180)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365 * 10)),
                    builder: (c, child) =>
                        Theme(data: Theme.of(ctx), child: child!),
                  );
                  if (picked != null) {
                    setS(() =>
                        deadlineDate = picked.toIso8601String().split('T')[0]);
                  }
                },
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                      color: colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(10)),
                  child: Row(children: [
                    Icon(Icons.calendar_today_outlined,
                        color: colorScheme.onSurfaceVariant, size: 18),
                    const SizedBox(width: 10),
                    Text(
                      deadlineDate.isNotEmpty
                          ? 'goals_deadline_value'.tr(args: [deadlineDate])
                          : 'goals_deadline_hint'.tr(),
                      style: TextStyle(
                          color: deadlineDate.isNotEmpty
                              ? colorScheme.onSurface
                              : colorScheme.onSurfaceVariant,
                          fontFamily: 'Cairo',
                          fontSize: 13),
                    ),
                  ]),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      final user = Supabase.instance.client.auth.currentUser!;
                      HapticFeedback.mediumImpact();
                      final data = {
                        'user_id': user.id,
                        'name': nameCtrl.text,
                        'icon': selectedIcon,
                        'target_amount': double.tryParse(targetCtrl.text) ?? 0,
                        'current_amount': double.tryParse(currentCtrl.text) ?? 0,
                        'deadline': deadlineDate.isEmpty ? null : deadlineDate,
                      };
                      try {
                        if (existing != null) {
                          await Supabase.instance.client
                              .from('savings_goals')
                              .update(data)
                              .eq('id', existing['id']);
                        } else {
                          await Supabase.instance.client
                              .from('savings_goals')
                              .insert(data);
                        }
                        if (ctx.mounted) Navigator.pop(ctx);
                        await _load();
                      } catch (e) {
                        if (ctx.mounted) ErrorHandler.handle(e, context: ctx, developerMessage: 'Goals Save');
                      }
                    },
                    style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12))),
                    child: Text(existing != null ? 'goals_save_edit'.tr() : 'goals_save'.tr(),
                        style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.w900,
                            fontSize: 15)),
                  )),
              const SizedBox(height: 16),
            ])),
          );
        },
      ),
    );
  }

  void _showAddAmountDialog(Map<String, dynamic> goal) {
    final amountCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        final colorScheme = Theme.of(ctx).colorScheme;
        return Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: colorScheme.outlineVariant,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            Text('goals_add_amount_to'.tr(args: [goal['name']]),
                style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: colorScheme.onSurface,
                    fontFamily: 'Cairo')),
            const SizedBox(height: 20),
            _field(ctx, amountCtrl, 'goals_amount_to_add'.tr(),
                const TextInputType.numberWithOptions(decimal: true)),
            const SizedBox(height: 20),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final amount = double.tryParse(amountCtrl.text) ?? 0;
                    if (amount <= 0) return;
                    HapticFeedback.mediumImpact();
                    final current = (goal['current_amount'] as num).toDouble();
                    await Supabase.instance.client
                        .from('savings_goals')
                        .update({'current_amount': current + amount}).eq(
                            'id', goal['id']);
                    if (ctx.mounted) Navigator.pop(ctx);
                    await _load();
                  },
                  style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  child: Text('goals_save'.tr(),
                      style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontWeight: FontWeight.w900,
                          fontSize: 15)),
                )),
            const SizedBox(height: 16),
          ]),
        );
      },
    );
  }

  Future<void> _deleteGoal(String id) async {
    final colorScheme = Theme.of(context).colorScheme;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: colorScheme.surface,
        title: Text('goals_delete_title'.tr(),
            style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo')),
        content: Text('confirm_delete'.tr(),
            style: TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo')),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child:
                   Text('cancel'.tr(), style: const TextStyle(fontFamily: 'Cairo'))),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child:  Text('delete'.tr(),
                  style: const TextStyle(
                      color: Color(0xFFEF4444), fontFamily: 'Cairo'))),
        ],
      ),
    );
    if (confirm == true) {
      await Supabase.instance.client
          .from('savings_goals')
          .delete()
          .eq('id', id);
      await _load();
    }
  }

  TextField _field(
          BuildContext context, TextEditingController ctrl, String hint, TextInputType type) {
    final colorScheme = Theme.of(context).colorScheme;
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle:
            TextStyle(color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
        filled: true,
        fillColor: colorScheme.outlineVariant,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final totalTarget =
        _goals.fold(0.0, (a, g) => a + (g['target_amount'] as num).toDouble());
    final totalSaved =
        _goals.fold(0.0, (a, g) => a + (g['current_amount'] as num).toDouble());
    final completed = _goals
        .where(
            (g) => (g['current_amount'] as num) >= (g['target_amount'] as num))
        .length;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('goals_title'.tr(),
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          IconButton(
              icon: Icon(Icons.add, color: colorScheme.primary),
              onPressed: () => _showAddDialog())
        ],
      ),
      body: _loading
          ? Center(
              child: CircularProgressIndicator(color: colorScheme.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  // Summary
                  Row(children: [
                    Expanded(
                        child: _statCard('🎯', '${_goals.length}', 'goals_count_label'.tr(),
                            colorScheme.primary)),
                    const SizedBox(width: 8),
                    Expanded(
                        child: _statCard('✅', '$completed', 'goals_completed_label'.tr(),
                            const Color(0xFF10B981))),
                    const SizedBox(width: 8),
                    Expanded(
                        child: _statCard('💰', totalSaved.toStringAsFixed(0),
                            'goals_saved_label'.tr(), colorScheme.secondary)),
                  ]),
                  const SizedBox(height: 16),

                  // Total progress bar
                  if (_goals.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                               Text('goals_overall_progress'.tr(),
                                  style: TextStyle(
                                      color: colorScheme.onSurfaceVariant,
                                      fontFamily: 'Cairo',
                                      fontSize: 12)),
                              Text(
                                  '${totalSaved.toStringAsFixed(0)} / ${totalTarget.toStringAsFixed(0)} $_currency',
                                  style: TextStyle(
                                      color: colorScheme.onSurface,
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12)),
                            ]),
                        const SizedBox(height: 8),
                        ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: totalTarget > 0
                                  ? (totalSaved / totalTarget).clamp(0.0, 1.0)
                                  : 0,
                              backgroundColor: colorScheme.outlineVariant,
                              valueColor: AlwaysStoppedAnimation(
                                  colorScheme.secondary),
                              minHeight: 10,
                            )),
                      ]),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Goals
                  if (_goals.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: colorScheme.outlineVariant)),
                      child: Column(children: [
                        const Text('🎯', style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        Text('goals_empty'.tr(),
                            style: TextStyle(
                                color: colorScheme.onSurfaceVariant,
                                fontFamily: 'Cairo',
                                fontSize: 15)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                            onPressed: () => _showAddDialog(),
                            child:  Text('goals_add_first'.tr(),
                                style: const TextStyle(fontFamily: 'Cairo'))),
                      ]),
                    )
                  else
                    ..._goals.map((goal) {
                      final target = (goal['target_amount'] as num).toDouble();
                      final current =
                          (goal['current_amount'] as num).toDouble();
                      final progress =
                          target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;
                      final remaining = target - current;
                      final isDone = current >= target;
                      final color = isDone
                          ? const Color(0xFF10B981)
                          : progress >= 0.7
                              ? colorScheme.primary
                              : colorScheme.secondary;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: colorScheme.surface,
                          borderRadius: BorderRadius.circular(14),
                          border:
                              Border.all(color: color.withValues(alpha: 0.2)),
                        ),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                if ((goal['icon'] as String?) != null)
                                  Text(goal['icon'] as String,
                                      style: const TextStyle(fontSize: 22)),
                                if ((goal['icon'] as String?) != null)
                                  const SizedBox(width: 8),
                                Expanded(
                                    child: Text(goal['name'] ?? '',
                                        style: TextStyle(
                                            color: colorScheme.onSurface,
                                            fontWeight: FontWeight.w900,
                                            fontFamily: 'Cairo',
                                            fontSize: 15))),
                                if (isDone)
                                  const Text('✅',
                                      style: TextStyle(fontSize: 18)),
                                const SizedBox(width: 8),
                                GestureDetector(
                                    onTap: () => _showAddDialog(existing: goal),
                                    child: Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                            color: colorScheme.primary
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(7),
                                            border: Border.all(
                                                color: colorScheme.primary
                                                    .withValues(alpha: 0.2))),
                                        child: Icon(Icons.edit,
                                            color: colorScheme.primary,
                                            size: 14))),
                                const SizedBox(width: 6),
                                GestureDetector(
                                    onTap: () =>
                                        _deleteGoal(goal['id'].toString()),
                                    child: Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(
                                            color: const Color(0xFFEF4444)
                                                .withValues(alpha: 0.1),
                                            borderRadius:
                                                BorderRadius.circular(7),
                                            border: Border.all(
                                                color: const Color(0xFFEF4444)
                                                    .withValues(alpha: 0.2))),
                                        child: const Icon(Icons.close,
                                            color: Color(0xFFEF4444),
                                            size: 14))),
                              ]),
                              const SizedBox(height: 12),
                              ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: progress,
                                    backgroundColor: colorScheme.outlineVariant,
                                    valueColor: AlwaysStoppedAnimation(color),
                                    minHeight: 10,
                                  )),
                              const SizedBox(height: 8),
                              Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                     Text(
                                        'goals_progress_percent'.tr(args: [(progress * 100).toStringAsFixed(0)]),
                                        style: TextStyle(
                                            color: color,
                                            fontFamily: 'Cairo',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700)),
                                     Text(
                                        'goals_remaining_value'.tr(args: [remaining.toStringAsFixed(0), _currency]),
                                        style: TextStyle(
                                            color: colorScheme.onSurfaceVariant,
                                            fontFamily: 'Cairo',
                                            fontSize: 12)),
                                  ]),
                              if (!isDone) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                    width: double.infinity,
                                    child: OutlinedButton(
                                      onPressed: () =>
                                          _showAddAmountDialog(goal),
                                      style: OutlinedButton.styleFrom(
                                          foregroundColor: color,
                                          side: BorderSide(
                                              color:
                                                  color.withValues(alpha: 0.4)),
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 10),
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10))),
                                       child:  Text('goals_add_saving'.tr(),
                                           style: const TextStyle(
                                               fontFamily: 'Cairo',
                                               fontWeight: FontWeight.w700)),
                                    )),
                              ],
                            ]),
                      );
                    }),
                ]),
              ),
            ),
    );
  }

  Widget _statCard(String icon, String value, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2))),
      child: Column(children: [
        Text(icon, style: const TextStyle(fontSize: 20)),
        const SizedBox(height: 4),
        Text(value,
            style: TextStyle(
                color: color,
                fontWeight: FontWeight.w900,
                fontSize: 16,
                fontFamily: 'Cairo')),
        Text(label,
            style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 10, fontFamily: 'Cairo')),
      ]),
    );
  }
}
