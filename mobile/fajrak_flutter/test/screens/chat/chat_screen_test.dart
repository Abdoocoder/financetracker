import 'dart:async';
import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/screens/chat/chat_screen.dart';
import 'package:fajrak/services/byok/byok_service.dart';
import 'package:fajrak/services/byok/chat.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// بتحميل ملفات الترجمة من القرص مرة واحدة في `setUp` (منطقة async حقيقية)
/// وتعيدها بشكل متزامن — فلن يعتمد التطبيق على `rootBundle.loadString`
/// داخل منطقة FakeAsync الخاصة بـ `testWidgets` حيث لا يكتمل الـ IO الحقيقي.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);

  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

/// Fake chat service — subclass of `ByokService` whose ctor runs no IO.
/// Deltas are emitted synchronously, then the future stays pending until
/// [release] completes so tests can observe the streaming/stop states.
class _FakeByokService extends ByokService {
  _FakeByokService();

  int chatCalls = 0;
  String? capturedProviderId;
  String? capturedKeyId;
  List<ChatMsg>? capturedMessages;
  String? capturedModel;
  bool stopWasRequested = false;
  String errorCode = '';
  Completer<void>? release;
  final List<String> deltas = ['Sure', '!'];

  @override
  Future<void> chat({
    required String providerId,
    String? keyId,
    String systemPrompt = '',
    required List<ChatMsg> messages,
    String? model,
    void Function(String)? onDelta,
    bool Function()? isStopped,
    bool stream = true,
    Duration stallTimeout = const Duration(seconds: 20),
  }) async {
    chatCalls++;
    capturedProviderId = providerId;
    capturedKeyId = keyId;
    capturedMessages = messages;
    capturedModel = model;
    if (errorCode.isNotEmpty) {
      throw ByokChatException(errorCode);
    }
    if (deltas.isNotEmpty) {
      onDelta?.call(deltas.first);
    }
    if (release != null) {
      await release!.future;
    }
    for (final d in deltas.skip(1)) {
      onDelta?.call(d);
    }
    stopWasRequested = isStopped?.call() ?? false;
  }
}

Widget _app(Widget child) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: const Locale('en'),
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        home: child,
      ),
    ),
  );
}

Future<void> _pumpApp(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(_app(child));
  for (var i = 0; i < 20; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
  await tester.pumpAndSettle();
}

ChatScreen _screen(_FakeByokService service,
    {List<ChatKeyRow> keys = const <ChatKeyRow>[]}) {
  return ChatScreen(
    service: service,
    keysLoader: () async => keys,
    contextLoader: () async => const ChatFinancialData(),
  );
}

IconButton _sendIcon(WidgetTester tester) => tester.widget<IconButton>(
      find.ancestor(
        of: find.byIcon(Icons.send_rounded),
        matching: find.byType(IconButton),
      ),
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    final en = jsonDecode(await rootBundle.loadString('assets/i18n/en.json'))
        as Map<String, dynamic>;
    final ar = jsonDecode(await rootBundle.loadString('assets/i18n/ar.json'))
        as Map<String, dynamic>;
    _translations = {'en': en, 'ar': ar};
  });

  testWidgets('renders greeting, default provider and disabled send',
      (tester) async {
    final service = _FakeByokService();
    await _pumpApp(tester, _screen(service));

    expect(find.textContaining('Fajrak assistant'), findsOneWidget);
    expect(find.text('Financial context'), findsOneWidget);
    expect(find.text('Ollama runs locally — no key needed'), findsOneWidget);
    expect(find.text('Ollama (Local Engine)'), findsWidgets);
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
    expect(_sendIcon(tester).onPressed, isNull);

    await tester.enterText(find.byType(TextField).last, 'Hi');
    await tester.pump();
    expect(_sendIcon(tester).onPressed, isNotNull);
  });

  testWidgets('sends message, streams a reply and commits it as assistant bubble',
      (tester) async {
    final service = _FakeByokService()..release = Completer<void>();
    await _pumpApp(tester, _screen(service));

    await tester.enterText(find.byType(TextField).last, 'How is my balance?');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();

    expect(find.text('How is my balance?'), findsOneWidget);
    expect(service.chatCalls, 1);
    expect(service.capturedProviderId, 'ollama');
    expect(service.capturedKeyId, isNull);
    expect(service.capturedMessages!.last.content, 'How is my balance?');
    expect(find.text('Sure'), findsOneWidget);

    service.release!.complete();
    await tester.pump();
    expect(find.text('Sure!'), findsOneWidget);
    expect(find.textContaining('Fajrak assistant'), findsNothing);
  });

  testWidgets('maps a no-key error to the chat error banner', (tester) async {
    final service = _FakeByokService()
      ..errorCode = 'no-key'
      ..release = Completer<void>();
    await _pumpApp(tester, _screen(service));

    await tester.enterText(find.byType(TextField).last, 'Hello');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();
    service.release!.complete();
    await tester.pump();

    expect(
      find.textContaining('No API key is stored for this provider'),
      findsOneWidget,
    );
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
  });

  testWidgets('proxy provider without keys shows the setup hint and disables send',
      (tester) async {
    final service = _FakeByokService();
    await _pumpApp(tester, _screen(service));

    // Tap the provider dropdown by finding the InputDecorator with label "Provider"
    // then tapping the DropdownButton inside it
    final providerDropdown = find.descendant(
      of: find.byWidgetPredicate((w) =>
          w is InputDecorator &&
          w.decoration.labelText == 'Provider'),
      matching: find.byType(DropdownButton<String>),
    );
    await tester.tap(providerDropdown);
    await tester.pumpAndSettle();
    await tester.tap(find.text('OpenAI').last);
    await tester.pumpAndSettle();

    expect(
      find.textContaining('You need a saved API key to chat with OpenAI.'),
      findsOneWidget,
    );
    expect(find.text('Add BYOK keys'), findsOneWidget);
    expect(_sendIcon(tester).onPressed, isNull);
  });

  testWidgets('proxy provider with a saved key auto-selects it and enables send',
      (tester) async {
    final service = _FakeByokService()..release = Completer<void>();
    await _pumpApp(
      tester,
      _screen(service, keys: const [
        ChatKeyRow(id: 'k-openai', providerId: 'openai', keyName: 'My OpenAI'),
      ]),
    );

    final providerDropdown = find.descendant(
      of: find.byWidgetPredicate((w) =>
          w is InputDecorator &&
          w.decoration.labelText == 'Provider'),
      matching: find.byType(DropdownButton<String>),
    );
    await tester.tap(providerDropdown);
    await tester.pumpAndSettle();
    await tester.tap(find.text('OpenAI').last);
    await tester.pumpAndSettle();

    // A key exists for this provider, so the "add a key" hint must not show.
    expect(find.text('Add BYOK keys'), findsNothing);

    // Regression: send used to stay disabled forever because _keyId was
    // never auto-selected.
    expect(_sendIcon(tester).onPressed, isNull);

    await tester.enterText(find.byType(TextField).last, 'How is my balance?');
    await tester.pump();
    expect(_sendIcon(tester).onPressed, isNotNull);

    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();

    expect(service.chatCalls, 1);
    expect(service.capturedProviderId, 'openai');
    expect(service.capturedKeyId, 'k-openai');

    service.release!.complete();
    await tester.pump();
    expect(find.text('Sure!'), findsOneWidget);
  });

  testWidgets('switching provider reselects that provider key and disables send',
      (tester) async {
    final service = _FakeByokService();
    await _pumpApp(
      tester,
      _screen(service, keys: const [
        ChatKeyRow(id: 'k-openai', providerId: 'openai', keyName: 'My OpenAI'),
        ChatKeyRow(id: 'k-gemini', providerId: 'gemini', keyName: 'My Gemini'),
      ]),
    );

    Future<void> selectProvider(String label) async {
      final providerDropdown = find.descendant(
        of: find.byWidgetPredicate((w) =>
            w is InputDecorator &&
            w.decoration.labelText == 'Provider'),
        matching: find.byType(DropdownButton<String>),
      );
      await tester.tap(providerDropdown);
      await tester.pumpAndSettle();
      await tester.tap(find.text(label).last);
      await tester.pumpAndSettle();
    }

    await selectProvider('OpenAI');
    await tester.enterText(find.byType(TextField).last, 'Hi');
    await tester.pump();
    expect(_sendIcon(tester).onPressed, isNotNull);

    // A different provider key must be picked, and the stale one cleared.
    await selectProvider('Gemini');
    expect(_sendIcon(tester).onPressed, isNotNull);

    await tester.enterText(find.byType(TextField).last, 'Hi again');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();

    expect(service.capturedProviderId, 'gemini');
    expect(service.capturedKeyId, 'k-gemini');
  });

  testWidgets('keys from another provider are never used as keyId',
      (tester) async {
    final service = _FakeByokService();
    await _pumpApp(
      tester,
      _screen(service, keys: const [
        ChatKeyRow(id: 'k-gemini', providerId: 'gemini', keyName: 'My Gemini'),
      ]),
    );

    final providerDropdown = find.descendant(
      of: find.byWidgetPredicate((w) =>
          w is InputDecorator &&
          w.decoration.labelText == 'Provider'),
      matching: find.byType(DropdownButton<String>),
    );
    await tester.tap(providerDropdown);
    await tester.pumpAndSettle();
    await tester.tap(find.text('OpenAI').last);
    await tester.pumpAndSettle();

    // OpenAI has no key of its own: must show the hint and stay disabled
    // rather than borrowing the Gemini key.
    expect(find.text('Add BYOK keys'), findsOneWidget);
    await tester.enterText(find.byType(TextField).last, 'Hi');
    await tester.pump();
    expect(_sendIcon(tester).onPressed, isNull);
  });

  testWidgets('stop button keeps the partial reply when the user cancels',
      (tester) async {
    final service = _FakeByokService()..release = Completer<void>();
    await _pumpApp(tester, _screen(service));

    await tester.enterText(find.byType(TextField).last, 'Stop me');
    await tester.pump();
    await tester.tap(find.byIcon(Icons.send_rounded));
    await tester.pump();

    expect(find.byIcon(Icons.stop_rounded), findsOneWidget);
    expect(find.byIcon(Icons.send_rounded), findsNothing);

    await tester.tap(find.byIcon(Icons.stop_rounded));
    await tester.pump();

    service.release!.complete();
    await tester.pump();

    expect(service.stopWasRequested, isTrue);
    expect(find.text('Sure!'), findsOneWidget);
    expect(find.byIcon(Icons.send_rounded), findsOneWidget);
    expect(find.byIcon(Icons.stop_rounded), findsNothing);
  });
}