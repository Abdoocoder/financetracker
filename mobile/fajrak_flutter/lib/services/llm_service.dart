import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// عميل BYOK المحلي (Flutter) — اتّصال مباشر بـ Ollama على الجهاز دون وكيل.
///
/// وفق AD-3 (Zero-Server Storage): مفتاح المزوّد يُخزَّن على الجهاز فقط عبر
/// حاوية تخزين آمن (Keychain / Android Keystore) ولا يغادر الجهاز أبداً.
/// على أي جهاز يدعم HTTPS (أو بدون Ollama محلي) يستخدم الويب الوكيل بدلاً من
/// هذا العميل — هذا الملف مخصص حصرياً لمسار `clientDirect` المحلي (Ollama).
class LlmService {
  LlmService({http.Client? httpClient, SecureStore? secureStore})
      : _http = httpClient ?? http.Client(),
        _secureStore = secureStore ?? SecureKeyStore();

  final http.Client _http;
  final SecureStore _secureStore;

  /// مسار Ollama الافتراضي حسب المنصة:
  /// - محاكي Android: `10.0.2.2` يصل إلى localhost للمضيف.
  /// - الجهاز / الويب: `localhost` (على الجهاز الحقيقي يُعدَّل يدوياً إلى IP الشبكة).
  static String defaultOllamaBaseUrl({bool isAndroidEmulator = false}) =>
      isAndroidEmulator ? 'http://10.0.2.2:11434/v1' : 'http://localhost:11434/v1';

  static const String _keyStoragePrefix = 'llm_key_';

  /// حفظ مفتاح المزوّد على جهاز المستخدم فقط (AD-3).
  Future<void> saveProviderKey({
    required String providerId,
    required String apiKey,
  }) async {
    await _secureStore.write(key: '$_keyStoragePrefix$providerId', value: apiKey);
  }

  /// جلب مفتاح مزوّد مخزّن على الجهاز (إن وُجد).
  Future<String?> providerKey(String providerId) async =>
      _secureStore.read(key: '$_keyStoragePrefix$providerId');

  /// حذف مفتاح المزوّد (عند الإزالة/التسجيل).
  Future<void> deleteProviderKey(String providerId) async {
    await _secureStore.delete(key: '$_keyStoragePrefix$providerId');
  }

  /// استعلام مالي لمرة واحدة عبر Ollama (OpenAI-compatible `/v1/chat/completions`).
  ///
  /// يُعيد نص `choices[0].message.content`. إذا لم يُعدّ أي اختيار → null.
  Future<String?> queryFinancialInsight({
    required String providerBaseUrl,
    required String model,
    required String prompt,
    String? providerId,
  }) async {
    final apiKey = providerId == null ? null : await providerKey(providerId);
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (apiKey != null && apiKey.isNotEmpty) headers['Authorization'] = 'Bearer $apiKey';

    final messages = [
      {
        'role': 'system',
        'content':
            'أنت مساعد مالي لـ فجرك. أجب بالعربية بإيجاز، وبدون اقتراح أدوات ربوّية.',
      },
      {'role': 'user', 'content': prompt},
    ];

    final body = json.encode({
      'model': model,
      'messages': messages,
      'temperature': 0.2,
      'stream': false,
    });

    final uri = Uri.parse('$providerBaseUrl/chat/completions');
    final response = await send(uri, headers, body);
    if (response.statusCode != 200) {
      debugPrint('LlmService error ${response.statusCode}: ${response.body}');
      return null;
    }
    final data = json.decode(response.body) as Map<String, dynamic>;
    final choices = data['choices'] as List<dynamic>? ?? const [];
    if (choices.isEmpty) return null;
    final message = (choices.first as Map<String, dynamic>)['message'] as Map<String, dynamic>?;
    return message?['content'] as String?;
  }

  /// نقطة حقن HTTP قابلة للاختبار / الاستبدال (CustomHttpClientAdapter البديل).
  @visibleForTesting
  Future<http.Response> send(Uri uri, Map<String, String> headers, String body) =>
      _http.post(uri, headers: headers, body: body);
}

/// واجهة تخزين آمن ملخّصة بحيث يمكن استبدالها في الاختبارات.
abstract class SecureStore {
  Future<void> write({required String key, required String value});
  Future<String?> read({required String key});
  Future<void> delete({required String key});
}

/// التنفيذ الافتراضي يحوّل إلى `flutter_secure_storage` (Keychain/Keystore).
/// المفتاح لا يغادر الجهاز أبداً (AD-3: Zero-Server Storage).
class SecureKeyStore implements SecureStore {
  SecureKeyStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<void> write({required String key, required String value}) async {
    await _storage.write(key: key, value: value, aOptions: AndroidOptions());
  }

  @override
  Future<String?> read({required String key}) async {
    return _storage.read(key: key, aOptions: AndroidOptions());
  }

  @override
  Future<void> delete({required String key}) async {
    await _storage.delete(key: key, aOptions: AndroidOptions());
  }
}
