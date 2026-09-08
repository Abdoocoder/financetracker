import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Verifies the easy_localization asset files (assets/i18n/{ar,en}.json):
///
/// * parse as valid JSON
/// * expose the exact same key set in Arabic and English (no missing
///   translation), covering the BYOK chat / key-management feature
/// * resolve every key to a non-empty string
/// * match the exact wording for the BYOK chat + key-manager keys
class I18n {
  const I18n._();

  static const List<String> byokChatKeys = [
    'chat_title',
    'chat_subtitle',
    'chat_provider',
    'chat_model',
    'chat_auto_model',
    'chat_key',
    'chat_key_none',
    'chat_key_select',
    'chat_ollama_no_key',
    'chat_setup_keys',
    'chat_setup_keys_hint',
    'chat_input_placeholder',
    'chat_send',
    'chat_stop',
    'chat_clear',
    'chat_greeting',
    'chat_thinking',
    'chat_error_generic',
    'chat_error_no_key',
    'chat_error_insecure',
    'chat_error_ollama_cors',
    'chat_error_unauthorized',
    'chat_error_vault',
    'chat_context_label',
    'chat_context_included',
    'chat_financial_context',
    'chat_error_rate_limit',
    'chat_error_timeout',
  ];

  static const List<String> byokSettingsKeys = [
    'settings_byok_keys_local',
    'settings_byok_keys_not_local',
    'settings_byok_keys_no_local',
    'settings_byok_keys_vault_unavailable',
  ];

  static const String moreAiChatKey = 'more_ai_chat';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late Map<String, dynamic> en;
  late Map<String, dynamic> ar;

  setUp(() async {
    const assets = 'assets/i18n';
    en = jsonDecode(await rootBundle.loadString('$assets/en.json'))
        as Map<String, dynamic>;
    ar = jsonDecode(await rootBundle.loadString('$assets/ar.json'))
        as Map<String, dynamic>;
  });

  test('en.json and ar.json parse and share an identical key set', () {
    expect(en, isNotEmpty);
    expect(ar, isNotEmpty);
    final enKeys = en.keys.toSet();
    final arKeys = ar.keys.toSet();
    expect(enKeys.difference(arKeys), isEmpty,
        reason: 'keys present in en.json but missing from ar.json');
    expect(arKeys.difference(enKeys), isEmpty,
        reason: 'keys present in ar.json but missing from en.json');
    expect(enKeys.length, arKeys.length);
  });

  group('BYOK chat keys', () {
    for (final key in I18n.byokChatKeys) {
      test('$key resolves to a non-empty string in both locales', () {
        expect(en[key], isA<String>());
        expect(ar[key], isA<String>());
        expect((en[key]! as String).trim(), isNotEmpty,
            reason: 'en.$key is empty');
        expect((ar[key]! as String).trim(), isNotEmpty,
            reason: 'ar.$key is empty');
      });
    }

    test('en.chat_send matches web source', () => expect(en['chat_send'], 'Send'));
    test('ar.chat_send matches web source', () => expect(ar['chat_send'], 'إرسال'));
    test('more_ai_chat resolves in both locales', () {
      expect(en[I18n.moreAiChatKey], 'AI Chat');
      expect((ar[I18n.moreAiChatKey]! as String).trim(), isNotEmpty);
    });

    test('web chat keys match verbatim (spot checks)', () {
      expect(en['chat_title'], 'AI Assistant');
      expect(en['chat_greeting'],
          startsWith('Hi 👋 I am your Fajrak assistant.'));
      expect(ar['chat_title'], isNotEmpty);
      expect(en['chat_financial_context'],
          contains('trust it over general knowledge when figures clash'));
      expect(ar['chat_financial_context'], contains('المعرفة العامة'));
    });

    test('mobile-only error keys resolve', () {
      expect(en['chat_error_rate_limit'],
          contains('wait a minute and try again'));
      expect(en['chat_error_timeout'], contains('check your network'));
      expect((ar['chat_error_rate_limit']! as String).trim(), isNotEmpty);
      expect((ar['chat_error_timeout']! as String).trim(), isNotEmpty);
    });

    test('chat_error_insecure is adapted for mobile (app, not page)', () {
      expect(en['chat_error_insecure'], contains('This app is served over '));
      expect(ar['chat_error_insecure'], contains('هذا التطبيق يُعرض عبر '));
    });
  });

  group('BYOK settings keys', () {
    for (final key in I18n.byokSettingsKeys) {
      test('$key resolves to a non-empty string in both locales', () {
        expect(en[key], isA<String>());
        expect(ar[key], isA<String>());
        expect((en[key]! as String).trim(), isNotEmpty,
            reason: 'en.$key is empty');
        expect((ar[key]! as String).trim(), isNotEmpty,
            reason: 'ar.$key is empty');
      });
    }

    test('storage-state wording is device-local on mobile', () {
      expect(en['settings_byok_keys_local'], 'Key stored on this device');
      expect(en['settings_byok_keys_not_local'], 'Not stored on this device');
      expect(en['settings_byok_keys_no_local'],
          contains('Re-add it here to test'));
      expect(en['settings_byok_keys_vault_unavailable'],
          contains('on this device'));
    });
  });

  }