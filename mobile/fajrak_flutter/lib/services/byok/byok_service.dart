import 'dart:async';
import 'dart:convert';

import 'package:fajrak/services/byok/chat.dart';
import 'package:fajrak/services/byok/envelope.dart';
import 'package:fajrak/services/byok/providers.dart';
import 'package:fajrak/services/byok/vault.dart';
import 'package:fajrak/services/llm_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

export 'package:fajrak/services/byok/vault.dart';

/// BYOK chat service (Feature A) — proxy envelope path (anthropic/openai/etc.)
/// and direct-to-ollama bypass (C2 / HOLD SCOPE).
///
/// Proxy path: reads the provider key from the device vault, wraps it in a
/// BYOK [Envelope], and POSTs `{providerId, keyId, env, payload, body, stream}`
/// to `{proxyBaseUrl}/api/byok/proxy` authenticated with the user's session JWT
/// (AD-1: server never holds the key; the proxy decrypts, calls the provider,
/// and streams the response back verbatim).
///
/// clientDirect path: bypasses the proxy entirely and streams straight to the
/// local engine (ollama) — no vault read, no JWT, no envelope (C2).
class ByokService {
  ByokService({
    http.Client? httpClient,
    SecureStore? secureStore,
    Future<String?> Function()? tokenProvider,
    String? proxyBaseUrl,
    String? publicKeyPem,
    String? kekId,
  })  : _http = httpClient ?? http.Client(),
        _vault = ByokVault(secureStore),
        _tokenProvider = tokenProvider ?? _sessionToken,
        _proxyBaseUrl = proxyBaseUrl ?? defaultProxyBaseUrl(),
        _publicKeyPem = publicKeyPem,
        _kekId = kekId;

  static const Duration _defaultStallTimeout = Duration(seconds: 20);
  static const String _fallbackProxyBaseUrl = 'https://fajrak.com';

  final http.Client _http;
  final ByokVault _vault;
  final Future<String?> Function() _tokenProvider;
  final String _proxyBaseUrl;
  final String? _publicKeyPem;
  final String? _kekId;

  /// Default proxy base URL — `PROXY_BASE_URL` from the environment, or
  /// `https://fajrak.com` when unset (D8).
  static String defaultProxyBaseUrl() {
    try {
      final configured = dotenv.env['PROXY_BASE_URL'];
      return (configured != null && configured.trim().isNotEmpty)
          ? configured
          : _fallbackProxyBaseUrl;
    } on NotInitializedError {
      return _fallbackProxyBaseUrl;
    }
  }

  static Future<String?> _sessionToken() async =>
      Supabase.instance.client.auth.currentSession?.accessToken;

  /// Stream a provider chat completion.
  ///
  /// Throws [ByokChatException] with a stable [ByokChatException.code]:
  /// `no-key`, `unauthorized`, `rate-limit`, `ollama-cors`, `generic`,
  /// `timeout`. A silence gap over [stallTimeout] surfaces as `timeout` unless
  /// [isStopped] reports true (then it is swallowed silently, T5.3).
  Future<void> chat({
    required String providerId,
    String? keyId,
    String systemPrompt = '',
    required List<ChatMsg> messages,
    String? model,
    void Function(String)? onDelta,
    bool Function()? isStopped,
    bool stream = true,
    Duration stallTimeout = _defaultStallTimeout,
  }) async {
    final provider = getProvider(providerId);
    if (provider == null) {
      throw const ByokChatException('generic');
    }
    final resolvedKeyId = keyId ?? provider.id;
    final resolvedModel = model ?? provider.defaultModel;

    if (provider.isClientDirect) {
      await _streamClientDirect(
        provider,
        keyId: resolvedKeyId,
        systemPrompt: systemPrompt,
        messages: messages,
        model: resolvedModel,
        onDelta: onDelta,
        isStopped: isStopped,
        stream: stream,
        stallTimeout: stallTimeout,
      );
      return;
    }

    await _streamViaProxy(
      provider,
      keyId: resolvedKeyId,
      systemPrompt: systemPrompt,
      messages: messages,
      model: resolvedModel,
      onDelta: onDelta,
      isStopped: isStopped,
      stream: stream,
      stallTimeout: stallTimeout,
    );
  }

  Future<void> _streamViaProxy(
    ByokProvider provider, {
    required String keyId,
    required String systemPrompt,
    required List<ChatMsg> messages,
    required String model,
    void Function(String)? onDelta,
    bool Function()? isStopped,
    required bool stream,
    required Duration stallTimeout,
  }) async {
    final rawKey = await _vault.getProviderKey(keyId);
    if (rawKey == null || rawKey.isEmpty) {
      throw const ByokChatException('no-key');
    }

    final envelope = await buildEnvelope(
      rawKey,
      keyId: _kekId,
      publicKeyPem: _publicKeyPem,
    );

    final token = await _tokenProvider();
    if (token == null || token.isEmpty) {
      throw const ByokChatException('unauthorized');
    }

    final bodyB64 = base64Encode(
      utf8.encode(
        jsonEncode(
          buildChatBody(provider.id, systemPrompt, messages, model, stream),
        ),
      ),
    );

    final headers = <String, String>{};
    final authHeaderName = provider.authHeaderName.toLowerCase();
    for (final entry in provider.defaultHeaders.entries) {
      if (entry.key.toLowerCase() != authHeaderName) {
        headers[entry.key] = entry.value;
      }
    }

    final proxyBody = <String, dynamic>{
      'providerId': provider.id,
      'keyId': envelope.keyId,
      'env': envelope.env,
      'payload': envelope.payload,
      'body': bodyB64,
      'stream': stream,
    };
    if (headers.isNotEmpty) {
      proxyBody['headers'] = headers;
    }

    final base = _proxyBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final request = http.Request('POST', Uri.parse('$base/api/byok/proxy'))
      ..headers['content-type'] = 'application/json'
      ..headers['authorization'] = 'Bearer $token'
      ..body = jsonEncode(proxyBody);

    http.StreamedResponse res;
    try {
      res = await _http.send(request);
    } on TimeoutException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('timeout');
    }

    final errorCode = _mapProxyStatus(res.statusCode);
    if (errorCode != null) {
      throw ByokChatException(errorCode);
    }

    try {
      await readStream(
        res,
        provider.id,
        onDelta ?? (_) {},
        isStopped: isStopped,
        stallTimeout: stallTimeout,
      );
    } on TimeoutException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('timeout');
    } on http.ClientException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('generic');
    }
  }

  Future<void> _streamClientDirect(
    ByokProvider provider, {
    required String keyId,
    required String systemPrompt,
    required List<ChatMsg> messages,
    required String model,
    void Function(String)? onDelta,
    bool Function()? isStopped,
    required bool stream,
    required Duration stallTimeout,
  }) async {
    final body =
        buildChatBody(provider.id, systemPrompt, messages, model, stream);

    final uri = Uri.parse(
      provider.baseUrl.endsWith('/v1')
          ? '${provider.baseUrl}/chat/completions'
          : provider.baseUrl,
    );
    final request = http.Request('POST', uri)
      ..headers['content-type'] = 'application/json'
      ..body = jsonEncode(body);

    if (provider.auth != ByokAuth.none) {
      final rawKey = await _vault.getProviderKey(keyId);
      if (rawKey == null || rawKey.isEmpty) {
        throw const ByokChatException('no-key');
      }
      request.headers[provider.authHeaderName] = rawKey;
    }

    http.StreamedResponse res;
    try {
      res = await _http.send(request);
    } on TimeoutException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('timeout');
    }

    if (res.statusCode != 200) {
      throw const ByokChatException('ollama-cors');
    }

    try {
      await readStream(
        res,
        provider.id,
        onDelta ?? (_) {},
        isStopped: isStopped,
        stallTimeout: stallTimeout,
      );
    } on TimeoutException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('timeout');
    } on http.ClientException {
      if (isStopped?.call() ?? false) return;
      throw const ByokChatException('generic');
    }
  }

  /// Map a proxy HTTP status to an error code, or null for 200.
  String? _mapProxyStatus(int status) {
    if (status == 200) return null;
    if (status == 401 || status == 403) return 'unauthorized';
    if (status == 429) return 'rate-limit';
    return 'generic';
  }
}

/// Stable error code for [ByokService.chat] failures so the UI can
/// internationalise each case without string matching.
class ByokChatException implements Exception {
  const ByokChatException(this.code);

  final String code;

  @override
  String toString() => 'ByokChatException($code)';
}