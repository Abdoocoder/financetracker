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
  const system = 'You are a helpful assistant.';
  final msgs = [
    const ChatMsg(role: 'user', content: 'Hello'),
    const ChatMsg(role: 'assistant', content: 'Hi there'),
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
    const done = 'data: [DONE]\n\n';

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
      const a = 'data: {"choices":[{"delta":{"content":"t';
      const b = 'o"}}]}\n\njunk\n\ndata: [DONE]';
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

  group('AgentEvent.fromJson', () {
    test('delta carries text only', () {
      final e = AgentEvent.fromJson({'type': 'delta', 'text': 'مرحبا'})!;
      expect(e.type, 'delta');
      expect(e.text, 'مرحبا');
      expect(e.tool, isNull);
      expect(e.ok, isFalse);
    });

    test('trace carries tool + status', () {
      final running =
          AgentEvent.fromJson({'type': 'trace', 'tool': 'get_budget', 'status': 'running'})!;
      expect(running.tool, 'get_budget');
      expect(running.status, 'running');

      final done = AgentEvent.fromJson(
          {'type': 'trace', 'tool': 'get_budget', 'status': 'done'})!;
      expect(done.status, 'done');
    });

    test('tool_result carries ok=true only for a real true', () {
      final ok =
          AgentEvent.fromJson({'type': 'tool_result', 'tool': 't', 'ok': true})!;
      expect(ok.ok, isTrue);

      final failed = AgentEvent.fromJson(
          {'type': 'tool_result', 'tool': 't', 'ok': 'nope'})!;
      expect(failed.ok, isFalse);
    });

    test('confirmation_required keeps the tool args', () {
      final e = AgentEvent.fromJson({
        'type': 'confirmation_required',
        'tool': 'create_transaction',
        'args': {'amount': 120.5, 'category': 'food'},
      })!;
      expect(e.tool, 'create_transaction');
      expect(e.args['amount'], 120.5);
      expect(e.args['category'], 'food');
    });

    test('missing / non-map args default to an empty map', () {
      final missing =
          AgentEvent.fromJson({'type': 'confirmation_required', 'tool': 't'})!;
      expect(missing.args, isEmpty);

      final wrongType = AgentEvent.fromJson({
        'type': 'confirmation_required',
        'tool': 't',
        'args': ['nope'],
      })!;
      expect(wrongType.args, isEmpty);
    });

    test('error carries code + message', () {
      final e = AgentEvent.fromJson({
        'type': 'error',
        'code': 'rate_limited',
        'message': 'slow down',
      })!;
      expect(e.code, 'rate_limited');
      expect(e.message, 'slow down');
    });

    test('unknown / malformed shapes return null', () {
      expect(AgentEvent.fromJson({}), isNull);
      expect(AgentEvent.fromJson({'type': 42}), isNull);
      // Unknown event types still parse — the client ignores what it cannot
      // render, matching web `parseAgentEvent`.
      expect(AgentEvent.fromJson({'type': 'mystery'}), isNotNull);
    });
  });

  group('readAgentStream', () {
    String frame(Map<String, dynamic> json) => 'data: ${jsonEncode(json)}\n\n';

    test('emits every event in order', () async {
      final body = frame({'type': 'trace', 'tool': 'get_budget', 'status': 'running'}) +
          frame({'type': 'delta', 'text': 'ميزانيتك'}) +
          frame({'type': 'tool_result', 'tool': 'get_budget', 'ok': true}) +
          frame({'type': 'done'});
      final streamed = http.StreamedResponse(
        Stream.fromIterable([utf8.encode(body)]),
        200,
      );

      final events = <AgentEvent>[];
      await readAgentStream(streamed, events.add);

      expect(events.map((e) => e.type).toList(),
          ['trace', 'delta', 'tool_result', 'done']);
      expect(events[1].text, 'ميزانيتك');
      expect(events[2].ok, isTrue);
    });

    test('tolerates malformed frames and splits mid-frame', () async {
      const a = 'data: {"type":"delta","text":"t';
      const b = 'ok"}\n\njunk\n\ndata: {"type":"done"}\n\n';
      final streamed = http.StreamedResponse(
        Stream.fromIterable([utf8.encode(a), utf8.encode(b)]),
        200,
      );

      final events = <AgentEvent>[];
      await readAgentStream(streamed, events.add);

      expect(events.map((e) => e.type).toList(), ['delta', 'done']);
      expect(events.first.text, 'tok');
    });

    test('ignores non-data lines and blank payloads', () async {
      const body = ': keep-alive\n\ndata: \n\nevent: ping\n\n'
          'data: {"type":"done"}\n\n';
      final streamed = http.StreamedResponse(
        Stream.fromIterable([utf8.encode(body)]),
        200,
      );

      final events = <AgentEvent>[];
      await readAgentStream(streamed, events.add);

      expect(events.map((e) => e.type).toList(), ['done']);
    });

    test('non-200 throws ClientException', () async {
      final streamed = http.StreamedResponse(
        Stream.fromIterable([utf8.encode('')]),
        500,
      );

      await expectLater(
        readAgentStream(streamed, (_) {}),
        throwsA(isA<http.ClientException>()),
      );
    });

    test('silent stall throws TimeoutException', () async {
      final streamed = http.StreamedResponse(
        Stream.periodic(const Duration(seconds: 25), (_) => utf8.encode('x')),
        200,
      );

      await expectLater(
        readAgentStream(
          streamed,
          (_) {},
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<TimeoutException>()),
      );
    });

    test('stop flag swallows a racing TimeoutException', () async {
      final streamed = http.StreamedResponse(
        Stream.periodic(const Duration(seconds: 25), (_) => utf8.encode('x')),
        200,
      );
      var stopped = false;
      Timer(const Duration(milliseconds: 10), () => stopped = true);

      await expectLater(
        readAgentStream(
          streamed,
          (_) {},
          isStopped: () => stopped,
          stallTimeout: const Duration(milliseconds: 200),
        ),
        completes,
      );
    });
  });
}
