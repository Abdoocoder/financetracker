import 'dart:async';
import 'dart:convert';

import 'package:fajrak/services/byok/chat.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

/// A 200 streamed response whose body never emits and never closes — models a
/// provider that accepts the request and then goes silent.
http.StreamedResponse _silentStream() =>
    http.StreamedResponse(StreamController<List<int>>().stream, 200);

/// A 200 streamed response that emits one SSE frame after [delay], then closes.
http.StreamedResponse _delayedFrame(Duration delay, String frame) {
  final controller = StreamController<List<int>>();
  Timer(delay, () {
    if (controller.hasListener) controller.add(utf8.encode(frame));
    controller.close();
  });
  return http.StreamedResponse(controller.stream, 200);
}

String _openaiDelta(String text) =>
    'data: ${jsonEncode({'choices': [{'delta': {'content': text}}]})}\n\n'
    'data: [DONE]\n\n';

void main() {
  group('stallTimeoutFor provider mapping', () {
    test('nvidia-nim uses the 90s idle allowance', () {
      expect(stallTimeoutFor('nvidia-nim'), const Duration(seconds: 90));
    });

    test('other providers keep the 20s default', () {
      expect(stallTimeoutFor('openai'), const Duration(seconds: 20));
      expect(stallTimeoutFor('anthropic'), const Duration(seconds: 20));
      expect(stallTimeoutFor('ollama'), const Duration(seconds: 20));
    });

    test('the exported constants match the production values', () {
      expect(kDefaultStallTimeout, const Duration(seconds: 20));
      expect(kNimStallTimeout, const Duration(seconds: 90));
    });
  });

  group('readStream idle timeout', () {
    test('an explicit stallTimeout overrides the provider-aware default',
        () async {
      // nvidia-nim's default is 90s. If the explicit 50ms did not win this
      // would hang until the default test timeout (~30s) instead of throwing
      // quickly — so a quick TimeoutException proves the override wins.
      await expectLater(
        readStream(
          _silentStream(),
          'nvidia-nim',
          (_) {},
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<TimeoutException>()),
      );
    });

    test('a slow stream within the idle budget is not treated as stalled',
        () async {
      final deltas = <String>[];
      await readStream(
        _delayedFrame(const Duration(milliseconds: 50), _openaiDelta('hi')),
        'openai',
        deltas.add,
        // Millisecond-scale stand-ins for the production 20s/90s budgets.
        // Waiting the real durations out in a unit test is impractical, so the
        // *behaviour* is asserted here and the real provider values are pinned
        // exactly by the mapping group above.
        stallTimeout: const Duration(milliseconds: 200),
      );
      expect(deltas, ['hi']);
    });

    test('a stream slower than the idle budget throws TimeoutException',
        () async {
      await expectLater(
        readStream(
          _delayedFrame(const Duration(milliseconds: 200), _openaiDelta('late')),
          'openai',
          (_) {},
          stallTimeout: const Duration(milliseconds: 50),
        ),
        throwsA(isA<TimeoutException>()),
      );
    });
  });
}
