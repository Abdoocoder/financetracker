import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

/// BYOK chat wire helpers (Feature A) — mirrors web `lib/byok/chat.ts`.
///
/// The proxy relays provider-native bytes verbatim (C2 / HOLD SCOPE), so the
/// client must speak each provider's exact request/SSE format. These pure
/// helpers build the provider-native request body and extract incremental
/// text from streamed frames.

const kTemperature = 0.2;

/// Idle (silence) timeout for a streaming response before it is treated as
/// stalled. NVIDIA NIM serves very large models (Nemotron 3 Ultra 550B) whose
/// time-to-first-token can exceed 20s, so it gets a longer idle allowance.
const kDefaultStallTimeout = Duration(seconds: 20);
const kNimStallTimeout = Duration(seconds: 90);

/// Provider-aware default idle timeout for [readStream].
Duration stallTimeoutFor(String providerId) =>
    providerId == 'nvidia-nim' ? kNimStallTimeout : kDefaultStallTimeout;

class ChatMsg {
  final String role;
  final String content;

  const ChatMsg({required this.role, required this.content});
}

/// Build the provider-native chat request body (bypass CORS thin pass-through).
Map<String, dynamic> buildChatBody(
  String providerId,
  String systemPrompt,
  List<ChatMsg> messages,
  String model,
  bool stream,
) {
  if (providerId == 'anthropic') {
    return {
      'model': model,
      'system': systemPrompt,
      'max_tokens': 1024,
      'temperature': kTemperature,
      'stream': stream,
      'messages': messages
          .map((m) => {'role': m.role, 'content': m.content})
          .toList(),
    };
  }
  if (providerId == 'gemini') {
    return {
      'model': model,
      'system_instruction': {'parts': [{'text': systemPrompt}]},
      'generationConfig': {'temperature': kTemperature},
      'contents': messages
          .map((m) => {
                'role': m.role == 'user' ? 'user' : 'model',
                'parts': [{'text': m.content}],
              })
          .toList(),
    };
  }
  // openai-compatible (openai, nvidia-nim, openrouter, ollama)
  return {
    'model': model,
    'temperature': kTemperature,
    'stream': stream,
    'messages': [
      {'role': 'system', 'content': systemPrompt},
      ...messages.map((m) => {'role': m.role, 'content': m.content}),
    ],
  };
}

/// Extract incremental text from a streamed SSE data payload.
String extractDelta(String providerId, Map<String, dynamic> parsed) {
  if (providerId == 'anthropic') {
    final type = parsed['type'];
    final delta = parsed['delta'];
    if (type == 'content_block_delta' &&
        delta is Map<String, dynamic> &&
        delta['text'] is String) {
      return delta['text'] as String;
    }
    return '';
  }
  if (providerId == 'gemini') {
    final candidates = parsed['candidates'];
    if (candidates is List && candidates.isNotEmpty) {
      final first = candidates.first;
      if (first is Map<String, dynamic>) {
        final content = first['content'];
        if (content is Map<String, dynamic>) {
          final parts = content['parts'];
          if (parts is List && parts.isNotEmpty) {
            final part = parts.first;
            if (part is Map<String, dynamic> && part['text'] is String) {
              return part['text'] as String;
            }
          }
        }
      }
    }
    return '';
  }
  // openai-compatible (openai, nvidia-nim, openrouter)
  final choices = parsed['choices'];
  if (choices is List && choices.isNotEmpty) {
    final first = choices.first;
    if (first is Map<String, dynamic>) {
      final delta = first['delta'];
      if (delta is Map<String, dynamic> && delta['content'] is String) {
        return delta['content'] as String;
      }
      final message = first['message'];
      if (message is Map<String, dynamic> && message['content'] is String) {
        return message['content'] as String;
      }
    }
  }
  return '';
}

/// Consume an SSE response body, calling [onDelta] for each text fragment.
///
/// **Silent-stall protection (S1, not in web):** any gap longer than
/// [stallTimeout] — which defaults to [stallTimeoutFor] the provider — between
/// stream events throws a [TimeoutException]. Pass a [stop] flag so a timeout
/// that races a user Stop is swallowed.
Future<void> readStream(
  http.StreamedResponse res,
  String providerId,
  void Function(String) onDelta, {
  bool Function()? isStopped,
  Duration? stallTimeout,
}) async {
  if (res.statusCode != 200) {
    throw http.ClientException('HTTP ${res.statusCode}');
  }
  final body = res.stream.timeout(stallTimeout ?? stallTimeoutFor(providerId));
  var buffer = '';
  try {
    await for (final chunk in body) {
      if (isStopped?.call() ?? false) return;
      buffer += utf8.decode(chunk, allowMalformed: true);
      final lines = buffer.split('\n');
      buffer = lines.removeLast();
      for (final raw in lines) {
        final line = raw.trim();
        if (!line.startsWith('data:')) continue;
        final data = line.substring(5).trim();
        if (data == '[DONE]') continue;
        try {
          final parsed = jsonDecode(data);
          if (parsed is Map<String, dynamic>) {
            final text = extractDelta(providerId, parsed);
            if (text.isNotEmpty) onDelta(text);
          }
        } catch (_) {
          // malformed frame — skip
        }
      }
    }
  } on TimeoutException {
    if (isStopped?.call() ?? false) return;
    rethrow;
  }
}

/// One normalized event from `/api/byok/agent` — mirrors web
/// `lib/agent/events.ts`. The server owns the tool loop, so the client only
/// renders what it receives.
///
///   delta                 incremental assistant text
///   trace                 a tool is running / finished
///   tool_result           a tool returned (ok / failed)
///   confirmation_required a write tool is paused for explicit user approval
///   error                 a stable code (see [code])
///   done                  terminal event — always last
class AgentEvent {
  final String type;
  final String? text;
  final String? tool;
  final String? status;
  final bool ok;
  final Map<String, dynamic> args;
  final String? code;
  final String? message;

  const AgentEvent({
    required this.type,
    this.text,
    this.tool,
    this.status,
    this.ok = false,
    this.args = const {},
    this.code,
    this.message,
  });

  /// Parse one JSON frame. Returns null for an unknown/malformed shape.
  static AgentEvent? fromJson(Map<String, dynamic> json) {
    final type = json['type'];
    if (type is! String) return null;
    final rawArgs = json['args'];
    return AgentEvent(
      type: type,
      text: json['text'] is String ? json['text'] as String : null,
      tool: json['tool'] is String ? json['tool'] as String : null,
      status: json['status'] is String ? json['status'] as String : null,
      ok: json['ok'] == true,
      args: rawArgs is Map<String, dynamic> ? rawArgs : const {},
      code: json['code'] is String ? json['code'] as String : null,
      message: json['message'] is String ? json['message'] as String : null,
    );
  }
}

/// Read the agent route's normalized SSE stream.
///
/// Mirrors [readStream]'s stall protection: a silence gap longer than
/// [stallTimeout] throws [TimeoutException] unless [isStopped] reports true.
Future<void> readAgentStream(
  http.StreamedResponse res,
  void Function(AgentEvent) onEvent, {
  bool Function()? isStopped,
  Duration? stallTimeout,
}) async {
  if (res.statusCode != 200) {
    throw http.ClientException('HTTP ${res.statusCode}');
  }
  final body = res.stream.timeout(stallTimeout ?? kDefaultStallTimeout);
  var buffer = '';
  try {
    await for (final chunk in body) {
      if (isStopped?.call() ?? false) return;
      buffer += utf8.decode(chunk, allowMalformed: true);
      final lines = buffer.split('\n');
      buffer = lines.removeLast();
      for (final raw in lines) {
        final line = raw.trim();
        if (!line.startsWith('data:')) continue;
        final data = line.substring(5).trim();
        if (data.isEmpty) continue;
        try {
          final parsed = jsonDecode(data);
          if (parsed is Map<String, dynamic>) {
            final event = AgentEvent.fromJson(parsed);
            if (event != null) onEvent(event);
          }
        } catch (_) {
          // malformed frame — skip
        }
      }
    }
  } on TimeoutException {
    if (isStopped?.call() ?? false) return;
    rethrow;
  }
}
