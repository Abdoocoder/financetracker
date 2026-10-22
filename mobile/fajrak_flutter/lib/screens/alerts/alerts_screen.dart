import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

import '../../app_state.dart';
import '../../services/alerts_service.dart';
import '../../services/analytics_service.dart';
import '../../utils/error_handler.dart';
import '../../widgets/alerts/ai_generator_card.dart';
import '../../widgets/alerts/alert_actions.dart';
import '../../widgets/alerts/alert_filter_tabs.dart';
import '../../widgets/alerts/alert_header.dart';
import '../../widgets/alerts/alert_list_item.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key, this.service});

  // Data-access seam for tests. Defaults to the real AlertsService; tests
  // inject a fake subclass.
  final AlertsService? service;

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;
  String _filter = 'all';
  bool _generating = false;

  /// Data-access seam: the real service in production, a fake in tests.
  late final AlertsService _service = widget.service ?? AlertsService();

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Alerts');
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await _service.fetchAlerts();
      if (mounted) {
        setState(() => _alerts = data);
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Load Alerts');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    try {
      await _service.markAllRead();
      if (mounted) {
        setState(() {
          for (var a in _alerts) {
            a['is_read'] = true;
          }
        });
        context.read<AppState>().loadUnreadAlerts();
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Mark All Read');
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await _service.markRead(id);
      if (mounted) {
        setState(() {
          final idx = _alerts.indexWhere((a) => a['id'].toString() == id);
          if (idx != -1) _alerts[idx]['is_read'] = true;
        });
        context.read<AppState>().decrementUnreadAlerts();
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Mark Read');
    }
  }

  Future<void> _deleteAll() async {
    try {
      await _service.deleteAll();
      if (mounted) {
        setState(() => _alerts.clear());
        context.read<AppState>().clearUnreadAlerts();
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Delete All Alerts');
    }
  }

  Future<void> _deleteAlert(String id) async {
    try {
      await _service.deleteAlert(id);
      if (mounted) {
        setState(() => _alerts.removeWhere((a) => a['id'].toString() == id));
        context.read<AppState>().loadUnreadAlerts();
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Delete Alert');
    }
  }

  Future<void> _generateAlerts() async {
    setState(() => _generating = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('No session');

      final response = await http.post(
        Uri.parse('https://fajrak.com/api/alerts'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
        },
      );

      if (mounted) {
        if (response.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('alerts_generate_success'.tr(),
                  style: const TextStyle())));
          _load();
          context.read<AppState>().loadUnreadAlerts();
        } else {
          throw Exception('Failed to generate alerts: ${response.statusCode}');
        }
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Generate Alerts Error');
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _navigateAlert(Map<String, dynamic> alert) {
    if (alert['is_read'] == false) _markRead(alert['id'].toString());
    final title = (alert['title'] ?? '').toString().toLowerCase();
    final msg = (alert['message'] ?? '').toString().toLowerCase();

    if (title.contains('دين') || msg.contains('دين') || title.contains('قسط')) {
      Navigator.pushNamed(context, '/debts');
    } else if (title.contains('ميزانية') || msg.contains('ميزانية')) {
      Navigator.pushNamed(context, '/budgets');
    } else if (title.contains('عدد الأهداف') || msg.contains('عدد الأهداف')) {
      Navigator.pushNamed(context, '/goals');
    } else if (title.contains('استثمار') || msg.contains('استثمار')) {
      Navigator.pushNamed(context, '/investments');
    } else if (title.contains('معاملة') ||
        msg.contains('معاملة') ||
        msg.contains('مصاريف')) {
      Navigator.pushNamed(context, '/transactions');
    } else if (title.contains('درس') || msg.contains('تعلم')) {
      Navigator.pushNamed(context, '/learn');
    }
  }

  void _navigateToAddTransaction() {
    Navigator.pushNamed(context, '/transactions/add');
  }

  IconData _getIcon(String? type) {
    switch (type) {
      case 'warning':
        return Icons.warning_outlined;
      case 'achievement':
        return Icons.emoji_events_outlined;
      case 'motivation':
        return Icons.lightbulb_outlined;
      case 'ai':
        return Icons.smart_toy;
      default:
        return Icons.notifications_outlined;
    }
  }

  Color _getColor(String? type) {
    switch (type) {
      case 'warning':
        return AppColors.warning;
      case 'achievement':
        return AppColors.success;
      case 'motivation':
        return AppColors.purple;
      case 'ai':
        return AppColors.primary;
      default:
        return AppColors.primary;
    }
  }

  AlertActionType _getActionType(Map<String, dynamic> alert) {
    final title = (alert['title'] ?? '').toString().toLowerCase();
    final msg = (alert['message'] ?? '').toString().toLowerCase();
    final type = (alert['type'] ?? '').toString().toLowerCase();

    // Budget/warning alerts -> View Details
    if (type == 'warning' ||
        title.contains('ميزانية') ||
        msg.contains('ميزانية') ||
        title.contains('تجاوز') ||
        msg.contains('تجاوز') ||
        title.contains('حد') ||
        msg.contains('حد')) {
      return AlertActionType.viewDetails;
    }

    // Reminder alerts (debt, transaction recording) -> Add Transaction
    if (title.contains('تذكير') ||
        msg.contains('تذكير') ||
        title.contains('سجل') ||
        msg.contains('سجل') ||
        title.contains('معاملة') ||
        msg.contains('معاملة') ||
        title.contains('قسط') ||
        msg.contains('قسط') ||
        title.contains('دين') ||
        msg.contains('دين')) {
      return AlertActionType.addTransaction;
    }

    return AlertActionType.none;
  }

  void _handleActionTap(AlertActionType actionType, Map<String, dynamic> alert) {
    switch (actionType) {
      case AlertActionType.viewDetails:
        _navigateAlert(alert);
        break;
      case AlertActionType.addTransaction:
        _navigateToAddTransaction();
        break;
      case AlertActionType.none:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final unreadCount = _alerts.where((a) => a['is_read'] == false).length;

    // Calculate counts per filter type
    final warningCount = _alerts.where((a) => a['type'] == 'warning').length;
    final achievementCount = _alerts.where((a) => a['type'] == 'achievement').length;
    final motivationCount = _alerts.where((a) => a['type'] == 'motivation').length;

    final filtered = _alerts.where((a) {
      if (_filter == 'unread') return a['is_read'] == false;
      if (_filter == 'warning') return a['type'] == 'warning';
      if (_filter == 'achievement') return a['type'] == 'achievement';
      if (_filter == 'motivation') return a['type'] == 'motivation';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('alerts_title'.tr(),
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
        actions: [
          AlertActions(
            unreadCount: unreadCount,
            hasAlerts: _alerts.isNotEmpty,
            onMarkAllRead: _markAllRead,
            onDeleteAll: _deleteAll,
            colorScheme: colorScheme,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: colorScheme.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              backgroundColor: colorScheme.surface,
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  // AI Generator Compact Banner
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: AIGeneratorCard(
                        generating: _generating,
                        onGenerate: _generateAlerts,
                        colorScheme: colorScheme,
                        compact: true,
                      ),
                    ),
                  ),
                  // Filter Tabs with badges
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                      child: AlertFilterTabs(
                        currentFilter: _filter,
                        totalCount: _alerts.length,
                        unreadCount: unreadCount,
                        warningCount: warningCount,
                        achievementCount: achievementCount,
                        motivationCount: motivationCount,
                        onFilterChanged: (v) => setState(() => _filter = v),
                        colorScheme: colorScheme,
                      ),
                    ),
                  ),
                  // Unread indicator (only shows when there are unread)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: AlertHeader(
                        unreadCount: unreadCount,
                        colorScheme: colorScheme,
                      ),
                    ),
                  ),
                  // Alert List
                  if (filtered.isEmpty)
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _filter == 'all'
                                    ? Icons.notifications_none
                                    : _filter == 'warning'
                                        ? Icons.warning_amber_outlined
                                        : _filter == 'achievement'
                                            ? Icons.emoji_events_outlined
                                            : Icons.lightbulb_outline,
                                size: 48,
                                color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
                              const SizedBox(height: 16),
                              Text(
                                'alerts_empty'.tr(),
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final alert = filtered[index];
                          final actionType = _getActionType(alert);
                          return AlertListItem(
                            alert: alert,
                            color: _getColor(alert['type'] as String?),
                            icon: _getIcon(alert['type'] as String?),
                            onTap: () => _navigateAlert(alert),
                            onDelete: () => _deleteAlert(alert['id'].toString()),
                            colorScheme: colorScheme,
                            actionType: actionType,
                            onActionTap: () => _handleActionTap(actionType, alert),
                          );
                        },
                        childCount: filtered.length,
                      ),
                    ),
                  // Bottom padding for FAB space if needed
                  const SliverToBoxAdapter(child: SizedBox(height: 80)),
                ],
              ),
            ),
      // FAB for AI Generator (alternative to banner)
      floatingActionButton: _alerts.isNotEmpty
          ? null
          : AIGeneratorFAB(
              generating: _generating,
              onGenerate: _generateAlerts,
              colorScheme: colorScheme,
            ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}