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

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final data = await Supabase.instance.client.from('alerts').select('*').eq('user_id', user.id).order('created_at', ascending: false);
    await Supabase.instance.client.from('alerts').update({'is_read': true}).eq('user_id', user.id).eq('is_read', false);
    setState(() { _alerts = List<Map<String, dynamic>>.from(data); _loading = false; });
  }

  IconData _getIcon(String? type) {
    switch (type) {
      case 'warning': return Icons.warning_outlined;
      case 'achievement': return Icons.emoji_events_outlined;
      case 'motivation': return Icons.lightbulb_outlined;
      default: return Icons.notifications_outlined;
    }
  }

  Color _getColor(String? type) {
    switch (type) {
      case 'warning': return const Color(0xFFF59E0B);
      case 'achievement': return const Color(0xFF10B981);
      case 'motivation': return const Color(0xFF8B5CF6);
      default: return const Color(0xFF3B7EF6);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(backgroundColor: const Color(0xFF070B14), title: const Text('التنبيهات', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)), iconTheme: const IconThemeData(color: Colors.white)),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B7EF6)))
          : _alerts.isEmpty
              ? const Center(child: Text('لا توجد تنبيهات', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 16)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _alerts.length,
                  itemBuilder: (context, i) {
                    final alert = _alerts[i];
                    final color = _getColor(alert['type'] as String?);
                    final isRead = alert['is_read'] as bool? ?? true;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isRead ? const Color(0xFF0F1629) : color.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isRead ? const Color(0xFF1E293B) : color.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 40, height: 40,
                            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                            child: Icon(_getIcon(alert['type'] as String?), color: color, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(alert['title'] as String? ?? '', style: TextStyle(color: Colors.white, fontWeight: isRead ? FontWeight.w600 : FontWeight.w900, fontFamily: 'Cairo', fontSize: 14)),
                                const SizedBox(height: 4),
                                Text(alert['message'] as String? ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 12)),
                              ],
                            ),
                          ),
                          if (!isRead)
                            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
