import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/notification_settings.dart';
import '../../utils/error_handler.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() => _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen> {
  bool _loading = true;
  List<NotificationPreference> _preferences = [];
  final _supabase = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final response = await _supabase
          .from('notification_preferences')
          .select()
          .eq('user_id', user.id);

      setState(() {
        _preferences = (response as List)
            .map((json) => NotificationPreference.fromJson(json))
            .toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context);
    }
  }

  Future<void> _updatePreference(NotificationPreference pref, {bool? enabled, bool? mask}) async {
    try {
      final updatedPref = NotificationPreference(
        userId: pref.userId,
        category: pref.category,
        enabled: enabled ?? pref.enabled,
        priority: pref.priority,
        quietStart: pref.quietStart,
        quietEnd: pref.quietEnd,
        maskSensitiveData: mask ?? pref.maskSensitiveData,
      );

      await _supabase
          .from('notification_preferences')
          .upsert(updatedPref.toJson(), onConflict: 'user_id,category');

      setState(() {
        int index = _preferences.indexWhere((p) => p.category == pref.category);
        if (index != -1) _preferences[index] = updatedPref;
      });
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'إعدادات الإشعارات',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildHeader('الفئات المتاحة'),
                ..._preferences.map((pref) => _buildPrefTile(pref)),
                const Divider(height: 40),
                _buildHeader('الخصوصية والأمان'),
                _buildPrivacyTile(),
                const SizedBox(height: 40),
                _buildInfoCard(),
              ],
            ),
    );
  }

  Widget _buildHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildPrefTile(NotificationPreference pref) {
    String label = _getCategoryLabel(pref.category);
    IconData icon = _getCategoryIcon(pref.category);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: SwitchListTile(
        secondary: Icon(icon, color: Theme.of(context).colorScheme.primary),
        title: Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: Text('تلقي تنبيهات متعلقة بـ $label', style: const TextStyle(fontSize: 11)),
        value: pref.enabled,
        onChanged: (val) => _updatePreference(pref, enabled: val),
      ),
    );
  }

  Widget _buildPrivacyTile() {
    // Using the first pref as a proxy for the general privacy setting 
    // In migration, all categories have mask_sensitive_data.
    if (_preferences.isEmpty) return const SizedBox();
    final pref = _preferences.first;

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: SwitchListTile(
        secondary: const Icon(Icons.privacy_tip, color: Colors.orange),
        title: const Text('إخفاء البيانات الحساسة', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        subtitle: const Text('إخفاء المبالغ المالية من الإشعارات في شاشة القفل', style: TextStyle(fontSize: 11)),
        value: pref.maskSensitiveData,
        onChanged: (val) {
          for (var p in _preferences) {
            _updatePreference(p, mask: val);
          }
        },
      ),
    );
  }

  Widget _buildInfoCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'هذه الإعدادات تساعدك على البقاء على اطلاع بوضعك المالي دون إزعاج.',
              style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onPrimaryContainer),
            ),
          ),
        ],
      ),
    );
  }

  String _getCategoryLabel(NotificationCategory cat) {
    switch (cat) {
      case NotificationCategory.budgetAlert: return 'تنبيهات الميزانية';
      case NotificationCategory.debtReminder: return 'تذكير الديون';
      case NotificationCategory.savingGoal: return 'أهداف الادخار';
      case NotificationCategory.systemUpdate: return 'تحديثات النظام';
      case NotificationCategory.securityAlert: return 'تنبيهات الأمان';
    }
  }

  IconData _getCategoryIcon(NotificationCategory cat) {
    switch (cat) {
      case NotificationCategory.budgetAlert: return Icons.account_balance_wallet;
      case NotificationCategory.debtReminder: return Icons.event_repeat;
      case NotificationCategory.savingGoal: return Icons.stars;
      case NotificationCategory.systemUpdate: return Icons.system_update;
      case NotificationCategory.securityAlert: return Icons.security;
    }
  }
}
