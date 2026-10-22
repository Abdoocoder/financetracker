import 'package:supabase_flutter/supabase_flutter.dart';

/// Data access for the Alerts screen.
///
/// Every method talks to Supabase directly; RLS (golden rule 1) scopes the
/// rows to `auth.uid()`. The class uses instance methods (not static ones) so
/// tests can inject a fake subclass — same pattern as `ByokService`.
class AlertsService {
  /// Loads the user's alerts, newest first.
  Future<List<Map<String, dynamic>>> fetchAlerts() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return [];
    final data = await Supabase.instance.client
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data);
  }

  Future<void> markRead(String id) async {
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('id', id);
  }

  Future<void> markAllRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('user_id', user.id)
        .eq('is_read', false);
  }

  Future<void> deleteAlert(String id) async {
    await Supabase.instance.client.from('alerts').delete().eq('id', id);
  }

  Future<void> deleteAll() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client.from('alerts').delete().eq('user_id', user.id);
  }
}
