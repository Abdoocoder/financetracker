import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppState extends ChangeNotifier {
  bool _isDarkMode = true;
  Locale _locale = const Locale('ar');
  int _unreadAlerts = 0;

  bool get isDarkMode => _isDarkMode;
  Locale get locale => _locale;
  int get unreadAlerts => _unreadAlerts;

  AppState() {
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    _isDarkMode = prefs.getBool('darkMode') ?? true;
    final lang = prefs.getString('language_code') ?? 'ar';
    _locale = Locale(lang);
    notifyListeners();
  }

  Future<void> loadUnreadAlerts() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      final res = await Supabase.instance.client
          .from('alerts')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .count();
      _unreadAlerts = res.count;
      notifyListeners();
    } catch (_) {}
  }

  void decrementUnreadAlerts() {
    if (_unreadAlerts > 0) {
      _unreadAlerts--;
      notifyListeners();
    }
  }

  void clearUnreadAlerts() {
    _unreadAlerts = 0;
    notifyListeners();
  }

  Future<void> setTheme(bool isDark) async {
    _isDarkMode = isDark;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('darkMode', isDark);
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language_code', locale.languageCode);
  }
}
