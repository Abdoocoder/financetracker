import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

import '../../app_state.dart';
import '../../services/analytics_service.dart';
import '../../utils/error_handler.dart';
import '../../widgets/alerts/ai_generator_card.dart';
import '../../widgets/alerts/alert_actions.dart';
import '../../widgets/alerts/alert_filter_tabs.dart';
import '../../widgets/alerts/alert_header.dart';
import '../../widgets/alerts/alert_list_item.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  List<Map<String, dynamic>> _alerts = [];
  bool _loading = true;
  String _filter = 'all';
  bool _generating = false;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Alerts');
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final data = await Supabase.instance.client
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);
      if (mounted) {
        setState(() {
          _alerts = List<Map<String, dynamic>>.from(data);
          _loading = false;
        });
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Load Alerts');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAllRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      await Supabase.instance.client
          .from('alerts')
          .update({'is_read': true})
          .eq('user_id', user.id)
          .eq('is_read', false);
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
      await Supabase.instance.client
          .from('alerts')
          .update({'is_read': true}).eq('id', id);
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
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      await Supabase.instance.client.from('alerts').delete().eq('user_id', user.id);
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
      await Supabase.instance.client.from('alerts').delete().eq('id', id);
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

  IconData _getIcon(String? type) {
    switch (type) {
      case 'warning':
        return Icons.warning_outlined;
      case 'achievement':
        return Icons.emoji_events_outlined;
      case 'motivation':
        return Icons.lightbulb_outlined;
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
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final unreadCount = _alerts.where((a) => a['is_read'] == false).length;
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
          iconTheme: IconThemeData(color: colorScheme.onSurface)),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: colorScheme.primary))
          : RefreshIndicator(
              onRefresh: _load,
              color: colorScheme.primary,
              backgroundColor: colorScheme.surface,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          AlertHeader(
                            totalCount: _alerts.length,
                            unreadCount: unreadCount,
                            colorScheme: colorScheme,
                          ),
                          AlertActions(
                            unreadCount: unreadCount,
                            hasAlerts: _alerts.isNotEmpty,
                            onMarkAllRead: _markAllRead,
                            onDeleteAll: _deleteAll,
                            colorScheme: colorScheme,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      AIGeneratorCard(
                        generating: _generating,
                        onGenerate: _generateAlerts,
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(height: 20),
                      AlertFilterTabs(
                        currentFilter: _filter,
                        totalCount: _alerts.length,
                        unreadCount: unreadCount,
                        onFilterChanged: (v) => setState(() => _filter = v),
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(height: 16),
                      if (filtered.isEmpty)
                        Center(
                            child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(children: [
                            Icon(
                                _filter == 'all'
                                    ? Icons.notifications_none
                                    : _filter == 'warning'
                                        ? Icons.warning_amber_outlined
                                        : _filter == 'achievement'
                                            ? Icons.emoji_events_outlined
                                            : Icons.lightbulb_outline,
                                size: 40, color: colorScheme.onSurfaceVariant),
                            const SizedBox(height: 12),
                            Text('alerts_empty'.tr(),
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 14)),
                          ]),
                        ))
                      else
                        ListView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) {
                            final alert = filtered[i];
                            return AlertListItem(
                              alert: alert,
                              color: _getColor(alert['type'] as String?),
                              icon: _getIcon(alert['type'] as String?),
                              onTap: () => _navigateAlert(alert),
                              onDelete: () => _deleteAlert(alert['id'].toString()),
                              colorScheme: colorScheme,
                            );
                          },
                        ),
                    ]),
              ),
            ),
    );
  }
}
