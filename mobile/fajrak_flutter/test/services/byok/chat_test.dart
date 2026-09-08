import 'dart:async';
import 'dart:convert';

import 'package:fajrak/services/byok/chat.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

Map<String, dynamic> _decode(Object? body) =>
    body is Map<String, dynamic>
        ? body
        : jsonDecode(body as String) as Map<String, dynamic>;

void main() {
  final system = 'You are a helpful assistant.';
  final msgs = [
    ChatMsg(role: 'user', content: 'Hello'),
    ChatMsg(role: 'assistant', content: 'Hi there'),
  ];

  group('buildChatBody', () {
    test('openai shape (openai / nvidia-nim / openrouter / ollama)', () {
      final body = _decode(buildChatBody('openai', system, msgs, 'gpt-5.4-mini', true));
      expect(body['model'], 'gpt-5.4-mini');
      expect(body['temperature'], 0.2);
      expect(body['stream'], true);
      expect(body['messages'], [
        {'role': 'system', 'content': system},
        {'role': 'user', 'content': 'Hello'},
        {'role': 'assistant', 'content': 'Hi there'},
      ]);
    });

    test('anthropic shape includes system, max_tokens, no merged system message', () {
      final body = _decode(buildChatBody('anthropic', system, msgs, 'claude-sonnet-4-6', false));
      expect(body['model'], 'claude-sonnet-4-6');
      expect(body['system'], system);
      expect(body['max_tokens'], 1024);
      expect(body['temperature'], 0.2);
      expect(body['stream'], false);
      expect(body['messages'], [
        {'role': 'user', 'content': 'Hello'},
        {'role': 'assistant', 'content': 'Hi there'},
      ]);
    });

    test('gemini shape maps assistant->model and wraps parts', () {
      final body = _decode(buildChatBody('gemini', system, msgs, 'gemini-2.5-pro', true));
      expect(body['model'], 'gemini-2.5-pro');
      expect(body['system_instruction'], {'parts': [{'text': system}]});
      expect(body['generationConfig'], {'temperature': 0.2});
      expect(body['contents'], [
        {'role': 'user', 'parts': [{'text': 'Hello'}]},
        {'role': 'model', 'parts': [{'text': 'Hi there'}]},
      ]);
    });
  });

  group('extractDelta', () {
    test('anthropic content_block_delta -> text', () {
      final d = extractDelta('anthropic', {
        'type': 'content_block_delta',
        'delta': {'text': 'Hello'},
      });
      expect(d, 'Hello');
    });

    test('anthropic non-delta frame -> empty', () {
      expect(extractDelta('anthropic', {'type': 'message_start'}), '');
    });

    test('gemini -> first candidate first part text', () {
      final d = extractDelta('gemini', {
        'candidates': [
          {'content': {'parts': [{'text': 'World'}]}},
        ],
      });
      expect(d, 'World');
    });

    test('openai-compatible chooses delta then message', () {
      final viaDelta = extractDelta('openai', {
        'choices': [{'delta': {'content': 'A'}}],
      });
      expect(viaDelta, 'A');

      final viaMessage = extractDelta('nvidia-nim', {
        'choices': [{'message': {'content': 'B'}}],
      });
      expect(viaMessage, 'B');
    });

    test('missing fragments -> empty string', () {
      expect(extractDelta('openai', {'choices': []}), '');
      expect(extractDelta('gemini', {'candidates': []}), '');
      expect(extractDelta('anthropic', {'type': 'content_block_delta'}), '');
    });
  });

  group('readStream', () {
    final openaiFrame =
        'data: ${jsonEncode({'choices': [{'delta': {'content': 'tok'}}]})}\n\n';
    final done = 'data: [DONE]\n\n';

    test('accumulates deltas across chunk-split boundaries', () async {
      final body = openaiFrame + done;
      final streamed = http.StreamedResponse(
        Stream.fromIterable([utf8.encode(body)]),
        200,
      );

      final out = <String>[];
      await readStream(streamed, 'openai', out.add);
      expect(out, ['tok']);
    });

    test('tolerates malformed frames and splits mid-frame', () async {
      // Two "tok" frames interleaved with a malformed frame, split mid-line.
      final a = 'data: {"choices":[{"delta":{"content":"t';
      final b = 'o"}}]}\n\njunk\n\ndata: [DONE]';
      final streamed = http.StreamedResponse(
        Stream.fromIterable([
          utf8.encode(a),
          utf8.encode(b),
        ]),
        200,
      );

      final out = <String>[];
      await readStream(streamed, 'openai', out.add);
      expect(out, ['to']);
    });

    test('silent-stall (S1): >20s gap throws a TimeoutException', () async {
      final streamed = http.StreamedResponse(
        // First event immediately, then a 25s gap, then a late event.
        Stream.periodic(const Duration(seconds: 25), (_) => utf8.encode('x')),
        200,
      );
      final out = <String>[];

      await expectLater(
        readStream(
          streamed,
          'openai',
          out.add,
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<TimeoutException>()),
      );
    });

    test('stop flag swallows a racing TimeoutException (S1)', () async {
      final streamed = http.StreamedResponse(
        Stream.periodic(const Duration(seconds: 25), (_) => utf8.encode('x')),
        200,
      );
      var stopped = false;
      // Stop fires before the stall timeout: the timeout must be swallowed.
      Timer(const Duration(milliseconds: 10), () => stopped = true);
      final out = <String>[];

      await expectLater(
        readStream(
          streamed,
          'openai',
          out.add,
          isStopped: () => stopped,
          stallTimeout: const Duration(milliseconds: 200),
        ),
        completes,
      );
    });
  });
}
