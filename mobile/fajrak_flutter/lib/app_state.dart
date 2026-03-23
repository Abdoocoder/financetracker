import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_app_badger/flutter_app_badger.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AppState extends ChangeNotifier {
  bool _isDarkMode = true;
  Locale _locale = const Locale('ar');
  int _unreadAlerts = 0;

  bool get isDarkMode => _isDarkMode;
  Locale get locale => _locale;
  int get unreadAlerts => _unreadAlerts;

  SharedPreferences? _prefs;
  Future<SharedPreferences> get _sharedPrefs async => _prefs ??= await SharedPreferences.getInstance();

  AppState() {
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await _sharedPrefs;
    _isDarkMode = prefs.getBool('darkMode') ?? true;
    final lang = prefs.getString('language_code') ?? 'ar';
    _locale = Locale(lang);
    notifyListeners();
  }

  Future<void> _updateBadge() async {
    if (kIsWeb) return;
    if (await FlutterAppBadger.isAppBadgeSupported()) {
      if (_unreadAlerts > 0) {
        FlutterAppBadger.updateBadgeCount(_unreadAlerts);
      } else {
        FlutterAppBadger.removeBadge();
      }
    }
  }

  Future<void> loadUnreadAlerts() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      final res = await Supabase.instance.client
          .from('alerts')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_read', false);
      _unreadAlerts = res.length;
      _updateBadge();
      notifyListeners();
    } catch (_) {}
  }

  void decrementUnreadAlerts() {
    if (_unreadAlerts > 0) {
      _unreadAlerts--;
      _updateBadge();
      notifyListeners();
    }
  }

  void clearUnreadAlerts() {
    _unreadAlerts = 0;
    _updateBadge();
    notifyListeners();
  }

  Future<void> setTheme(bool isDark) async {
    _isDarkMode = isDark;
    notifyListeners();
    final prefs = await _sharedPrefs;
    await prefs.setBool('darkMode', isDark);
  }

  Future<void> setLocale(Locale locale) async {
    _locale = locale;
    notifyListeners();
    final prefs = await _sharedPrefs;
    await prefs.setString('language_code', locale.languageCode);
  }
}
