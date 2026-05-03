import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_app_badge_control/flutter_app_badge_control.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class AppState extends ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.system;
  String? _languageCode; // null means follow system
  int _unreadAlerts = 0;
  int _transactionVersion = 0;

  ThemeMode get themeMode => _themeMode;
  int get transactionVersion => _transactionVersion;

  void notifyTransactionChanged() {
    _transactionVersion++;
    notifyListeners();
  }
  
  // For legacy support or simple checks
  bool isDarkMode(BuildContext context) {
    if (_themeMode == ThemeMode.system) {
      return MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    }
    return _themeMode == ThemeMode.dark;
  }

  String? get languageCode => _languageCode;
  int get unreadAlerts => _unreadAlerts;

  SharedPreferences? _prefs;
  Future<SharedPreferences> get _sharedPrefs async => _prefs ??= await SharedPreferences.getInstance();

  AppState() {
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = await _sharedPrefs;
    
    // Load Theme
    final themeStr = prefs.getString('themeMode') ?? 'system';
    _themeMode = _parseThemeMode(themeStr);
    
    // Load Language
    _languageCode = prefs.getString('language_code'); // null if not set
    
    notifyListeners();
  }

  ThemeMode _parseThemeMode(String theme) {
    switch (theme) {
      case 'light': return ThemeMode.light;
      case 'dark': return ThemeMode.dark;
      default: return ThemeMode.system;
    }
  }

  String _themeModeToString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light: return 'light';
      case ThemeMode.dark: return 'dark';
      default: return 'system';
    }
  }

  Future<void> setTheme(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    final prefs = await _sharedPrefs;
    await prefs.setString('themeMode', _themeModeToString(mode));
  }

  Future<void> setLanguageCode(String? code) async {
    _languageCode = code;
    notifyListeners();
    final prefs = await _sharedPrefs;
    if (code == null) {
      await prefs.remove('language_code');
    } else {
      await prefs.setString('language_code', code);
    }
  }

  Future<void> _updateBadge() async {
    if (kIsWeb) return;
    if (await FlutterAppBadgeControl.isAppBadgeSupported()) {
      if (_unreadAlerts > 0) {
        FlutterAppBadgeControl.updateBadgeCount(_unreadAlerts);
      } else {
        FlutterAppBadgeControl.removeBadge();
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
}
