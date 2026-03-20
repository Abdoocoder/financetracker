import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
  }

  Future<void> _markAllRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
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
    }
  }

  Future<void> _markRead(String id) async {
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true}).eq('id', id);
    if (mounted) {
      setState(() {
        final idx = _alerts.indexWhere((a) => a['id'].toString() == id);
        if (idx != -1) _alerts[idx]['is_read'] = true;
      });
    }
  }

  Future<void> _deleteAll() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      await Supabase.instance.client
          .from('alerts')
          .delete()
          .eq('user_id', user.id);
      if (mounted) setState(() => _alerts.clear());
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Delete All Alerts');
    }
  }

  Future<void> _deleteAlert(String id) async {
    try {
      await Supabase.instance.client.from('alerts').delete().eq('id', id);
      if (mounted) {
        setState(() => _alerts.removeWhere((a) => a['id'].toString() == id));
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Delete Single Alert');
    }
  }

  Future<void> _generateAlerts() async {
    setState(() => _generating = true);
    // Since we don't have the web API URL, we simulate or show error for now
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم إرسال طلب التوليد بنجاح',
              style: TextStyle(fontFamily: 'Cairo'))));
      setState(() => _generating = false);
      _load();
    }
  }

  void _navigateAlert(Map<String, dynamic> alert) {
    if (alert['is_read'] == false) _markRead(alert['id'].toString());
    final title = (alert['title'] ?? '').toString().toLowerCase();
    final msg = (alert['message'] ?? '').toString().toLowerCase();

    // Attempt navigation based on text (very basic routing)
    if (title.contains('دين') || msg.contains('دين') || title.contains('قسط')) {
      Navigator.pushNamed(context, '/debts');
    } else if (title.contains('ميزانية') || msg.contains('ميزانية'))
      Navigator.pushNamed(context, '/budgets');
    else if (title.contains('عدد الأهداف') || msg.contains('عدد الأهداف'))
      Navigator.pushNamed(context, '/goals');
    else if (title.contains('استثمار') || msg.contains('استثمار'))
      Navigator.pushNamed(context, '/investments');
    else if (title.contains('معاملة') ||
        msg.contains('معاملة') ||
        msg.contains('مصاريف'))
      Navigator.pushNamed(context, '/transactions');
    else if (title.contains('درس') || msg.contains('تعلم'))
      Navigator.pushNamed(context, '/learn');
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
        return const Color(0xFFF59E0B);
      case 'achievement':
        return const Color(0xFF10B981);
      case 'motivation':
        return const Color(0xFF8B5CF6);
      default:
        return const Color(0xFF3B7EF6);
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _alerts.where((a) => a['is_read'] == false).length;
    final filtered = _alerts.where((a) {
      if (_filter == 'unread') return a['is_read'] == false;
      if (_filter == 'warning') return a['type'] == 'warning';
      if (_filter == 'achievement') return a['type'] == 'achievement';
      if (_filter == 'motivation') return a['type'] == 'motivation';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
          backgroundColor: const Color(0xFF070B14),
          title: Text('التنبيهات',
              style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w900,
                  color: Colors.white)),
          iconTheme: const IconThemeData(color: Colors.white)),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B7EF6),
              backgroundColor: const Color(0xFF1E293B),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Actions
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(children: [
                              Text('${_alerts.length} تنبيه',
                                  style: const TextStyle(
                                      color: Color(0xFF94A3B8),
                                      fontFamily: 'Cairo',
                                      fontSize: 13)),
                              if (unreadCount > 0) ...[
                                const SizedBox(width: 8),
                                Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                        color: const Color(0xFFEF4444)
                                            .withOpacity(0.1),
                                        borderRadius:
                                            BorderRadius.circular(12)),
                                    child: Text('$unreadCount غير مقروء',
                                        style: const TextStyle(
                                            color: Color(0xFFEF4444),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                            fontFamily: 'Cairo'))),
                              ]
                            ]),
                            Row(children: [
                              if (unreadCount > 0)
                                TextButton(
                                    onPressed: _markAllRead,
                                    child: const Text('تحديد الكل كمقروء',
                                        style: TextStyle(
                                            color: Color(0xFF3B7EF6),
                                            fontFamily: 'Cairo',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w900))),
                              if (_alerts.isNotEmpty)
                                TextButton(
                                    onPressed: _deleteAll,
                                    child: const Text('حذف الكل',
                                        style: TextStyle(
                                            color: Color(0xFFEF4444),
                                            fontFamily: 'Cairo',
                                            fontSize: 12,
                                            fontWeight: FontWeight.w900))),
                            ]),
                          ]),
                      const SizedBox(height: 16),

                      // AI Generator Card
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                            gradient: LinearGradient(colors: [
                              const Color(0xFF3B7EF6).withOpacity(0.08),
                              const Color(0xFF8B5CF6).withOpacity(0.08)
                            ]),
                            border: Border.all(
                                color:
                                    const Color(0xFF3B7EF6).withOpacity(0.2)),
                            borderRadius: BorderRadius.circular(16)),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                        gradient: const LinearGradient(colors: [
                                          Color(0xFF3B7EF6),
                                          Color(0xFF8B5CF6)
                                        ]),
                                        borderRadius: BorderRadius.circular(12),
                                        boxShadow: [
                                          BoxShadow(
                                              color: const Color(0xFF3B7EF6)
                                                  .withOpacity(0.4),
                                              blurRadius: 16)
                                        ]),
                                    child: const Center(
                                        child: Text('🤖',
                                            style: TextStyle(fontSize: 20)))),
                                const SizedBox(width: 12),
                                const Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      Text('المساعد المالي الذكي',
                                          style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                              fontFamily: 'Cairo',
                                              fontSize: 14)),
                                      Text('تحليل محفظتك وتوليد تنبيهات مخصصة',
                                          style: TextStyle(
                                              color: Color(0xFF94A3B8),
                                              fontFamily: 'Cairo',
                                              fontSize: 12)),
                                    ])),
                              ]),
                              const SizedBox(height: 16),
                              SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    onPressed:
                                        _generating ? null : _generateAlerts,
                                    style: ElevatedButton.styleFrom(
                                        backgroundColor:
                                            const Color(0xFF3B7EF6),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 12),
                                        shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(12))),
                                    child: _generating
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                color: Colors.white))
                                        : const Text('✨ توليد تنبيهات جديدة',
                                            style: TextStyle(
                                                fontFamily: 'Cairo',
                                                fontWeight: FontWeight.w900)),
                                  )),
                            ]),
                      ),
                      const SizedBox(height: 20),

                      // Filters
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(children: [
                          _filterTab('all', 'الكل (${_alerts.length})'),
                          _filterTab('unread', 'غير مقروء ($unreadCount)'),
                          _filterTab('warning', '⚠️ تحذيرات'),
                          _filterTab('achievement', '🏆 إنجازات'),
                          _filterTab('motivation', '💡 نصائح'),
                        ]),
                      ),
                      const SizedBox(height: 16),

                      // Alerts List
                      if (filtered.isEmpty)
                        Center(
                            child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Column(children: [
                            Text(
                                _filter == 'all'
                                    ? '🔔'
                                    : _filter == 'warning'
                                        ? '⚠️'
                                        : _filter == 'achievement'
                                            ? '🏆'
                                            : '💡',
                                style: const TextStyle(fontSize: 40)),
                            const SizedBox(height: 12),
                            const Text('لا توجد تنبيهات في هذه الفئة',
                                style: TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontFamily: 'Cairo',
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
                            final color = _getColor(alert['type'] as String?);
                            final isRead = alert['is_read'] as bool? ?? true;
                            final date = (alert['created_at'] as String?)
                                    ?.split('T')[0] ??
                                '';
                            return GestureDetector(
                              onTap: () => _navigateAlert(alert),
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isRead
                                      ? const Color(0xFF0F1629)
                                      : color.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(
                                      color: isRead
                                          ? const Color(0xFF1E293B)
                                          : color.withOpacity(0.3)),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                          color: color.withOpacity(0.1),
                                          borderRadius:
                                              BorderRadius.circular(10)),
                                      child: Icon(
                                          _getIcon(alert['type'] as String?),
                                          color: color,
                                          size: 20),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(children: [
                                            Expanded(
                                                child: Text(
                                                    alert['title'] as String? ??
                                                        '',
                                                    style: TextStyle(
                                                        color: isRead
                                                            ? const Color(
                                                                0xFF94A3B8)
                                                            : Colors.white,
                                                        fontWeight: isRead
                                                            ? FontWeight.w700
                                                            : FontWeight.w900,
                                                        fontFamily: 'Cairo',
                                                        fontSize: 14))),
                                            if (!isRead)
                                              Container(
                                                  width: 8,
                                                  height: 8,
                                                  decoration: BoxDecoration(
                                                      color: color,
                                                      shape: BoxShape.circle,
                                                      boxShadow: [
                                                        BoxShadow(
                                                            color: color
                                                                .withOpacity(
                                                                    0.5),
                                                            blurRadius: 8)
                                                      ])),
                                          ]),
                                          const SizedBox(height: 4),
                                          Text(
                                              alert['message'] as String? ?? '',
                                              style: TextStyle(
                                                  color: isRead
                                                      ? const Color(0xFF64748B)
                                                      : const Color(0xFF94A3B8),
                                                  fontFamily: 'Cairo',
                                                  fontSize: 12,
                                                  height: 1.6)),
                                          const SizedBox(height: 8),
                                          Text(date,
                                              style: const TextStyle(
                                                  color: Color(0xFF64748B),
                                                  fontFamily: 'Cairo',
                                                  fontSize: 10)),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.close, size: 16),
                                      color: const Color(0xFFEF4444)
                                          .withOpacity(0.7),
                                      onPressed: () =>
                                          _deleteAlert(alert['id'].toString()),
                                    )
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                    ]),
              ),
            ),
    );
  }

  Widget _filterTab(String key, String label) => Padding(
        padding: const EdgeInsets.only(left: 8),
        child: GestureDetector(
          onTap: () => setState(() => _filter = key),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: _filter == key
                  ? const Color(0xFF3B7EF6)
                  : const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(label,
                style: TextStyle(
                    color:
                        _filter == key ? Colors.white : const Color(0xFF94A3B8),
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          ),
        ),
      );
}
