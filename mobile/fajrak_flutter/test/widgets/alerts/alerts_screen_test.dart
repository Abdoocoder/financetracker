import 'dart:convert';

// `hide TextDirection`: easy_localization re-exports package:intl, whose
// `TextDirection` class (LTR/RTL) shadows dart:ui's enum (ltr/rtl) that
// `Directionality.of()` returns.
import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import 'package:fajrak/app_state.dart';
import 'package:fajrak/screens/alerts/alerts_screen.dart';
import 'package:fajrak/services/alerts_service.dart';
import 'package:fajrak/widgets/alerts/ai_generator_card.dart';
import 'package:fajrak/widgets/alerts/alert_filter_tabs.dart';
import 'package:fajrak/widgets/alerts/alert_list_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Same loader as gamification_card_test.dart: reads the real i18n JSON once
/// (real async zone) and serves it synchronously to the fake-async test zone.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

/// Fake service — subclass of [AlertsService] whose constructor performs no IO.
/// Records every mutation the screen asks the backend to perform.
class _FakeAlertsService extends AlertsService {
  _FakeAlertsService({List<Map<String, dynamic>>? alerts})
      : _alerts = alerts ?? <Map<String, dynamic>>[];

  final List<Map<String, dynamic>> _alerts;

  final List<String> markedRead = [];
  final List<String> deleted = [];
  bool markAllReadCalled = false;
  bool deleteAllCalled = false;

  @override
  Future<List<Map<String, dynamic>>> fetchAlerts() async =>
      List<Map<String, dynamic>>.from(_alerts);

  @override
  Future<void> markRead(String id) async => markedRead.add(id);

  @override
  Future<void> markAllRead() async => markAllReadCalled = true;

  @override
  Future<void> deleteAlert(String id) async => deleted.add(id);

  @override
  Future<void> deleteAll() async => deleteAllCalled = true;
}

/// Builds one alert row. `isRead` maps to the `is_read` column.
Map<String, dynamic> _alert({
  required String id,
  required String title,
  String type = 'motivation',
  String message = '',
  bool isRead = true,
}) =>
    {
      'id': id,
      'title': title,
      'message': message,
      'type': type,
      'is_read': isRead,
      'created_at': '2026-10-20T10:00:00.000Z',
    };

Widget _app(Widget child, {Locale locale = const Locale('en')}) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: locale,
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => ChangeNotifierProvider<AppState>(
        create: (_) => AppState(),
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
          theme: ThemeData(useMaterial3: true),
          home: child,
        ),
      ),
    ),
  );
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    final en = jsonDecode(await rootBundle.loadString('assets/i18n/en.json'))
        as Map<String, dynamic>;
    final ar = jsonDecode(await rootBundle.loadString('assets/i18n/ar.json'))
        as Map<String, dynamic>;
    _translations = {'en': en, 'ar': ar};
    SharedPreferences.setMockInitialValues({});

    // Offline Supabase: `initialize` performs no network IO; `currentUser` is
    // null, so AnalyticsService.logEvent() returns before touching the network.
    await Supabase.initialize(
      url: 'https://alerts-test.supabase.co',
      publishableKey: 'test-publishable-key',
      authOptions: const FlutterAuthClientOptions(
        persistSession: false,
        detectSessionInUri: false,
      ),
    );

    // AppState._updateBadge() calls flutter_app_badge_control; without a mock
    // handler the MissingPluginException surfaces as an unhandled async error
    // and fails the test.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('flutter_app_badge_control'),
      (call) async => true,
    );
  });

  group('AlertsScreen - UI/UX Overhaul', () {
    // replaces the stub: 'Header shows only filter tabs with badges, no
    // redundant counters'
    testWidgets('Filter tabs carry the counts; no separate unread counter pill',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning', isRead: false),
        _alert(id: 'a2', title: 'Nice work', type: 'achievement'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(AlertFilterTabs), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlertFilterTabs),
          matching: find.text('1'),
        ),
        findsNWidgets(3),
        reason: 'fixture = 1 unread warning + 1 read achievement -> the '
            'unread, warning and achievement badges all show 1',
      );
      expect(
        find.descendant(
          of: find.byType(AlertFilterTabs),
          matching: find.text('2'),
        ),
        findsOneWidget,
        reason: 'the "all" tab shows the total (2)',
      );
    });

    // replaces the stub: 'Notification cards use Dismissible for
    // swipe-to-delete'
    testWidgets('Swiping an alert to the left deletes it', (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(Dismissible), findsOneWidget,
          reason: 'each alert row must be swipeable so it can be deleted');

      await tester.drag(find.byType(Dismissible), const Offset(-600, 0));
      await tester.pumpAndSettle();

      expect(fake.deleted, ['a1'],
          reason: 'the swipe must reach the backend delete for that row');
    });

    // replaces the stub: 'Notification cards show type-specific icons
    // (warning/achievement/motivation/AI)'
    testWidgets('Each alert type renders its own icon', (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'w', title: 'W', type: 'warning'),
        _alert(id: 'c', title: 'C', type: 'achievement'),
        _alert(id: 'm', title: 'M', type: 'motivation'),
        _alert(id: 'i', title: 'I', type: 'ai'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.warning_outlined), findsOneWidget);
      expect(find.byIcon(Icons.emoji_events_outlined), findsOneWidget);
      expect(find.byIcon(Icons.lightbulb_outlined), findsOneWidget);
      expect(find.byIcon(Icons.smart_toy), findsNWidgets(2),
          reason: 'the AI alert row AND the AI generator banner both use the '
              'robot icon');
    });

    // replaces the stub: 'Notification cards have actionable buttons based on
    // type'
    testWidgets('Action buttons appear only for actionable alert types',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'w', title: 'Budget warning', type: 'warning'),
        _alert(id: 'r', title: 'تذكير: أضف معاملة', type: 'reminder'),
        _alert(id: 'c', title: 'Nice work', type: 'achievement'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.text('View Details'), findsOneWidget,
          reason: 'warning alerts get the "view details" action');
      expect(find.text('Add Transaction'), findsOneWidget,
          reason: 'reminder alerts get the "add transaction" action');
      expect(
        find.descendant(
          of: find.byType(AlertListItem).at(2),
          matching: find.byType(TextButton),
        ),
        findsNothing,
        reason: 'an achievement alert has no action button',
      );
    });

    // replaces the stub: 'AI Generator card is compact banner, not large card'
    testWidgets('AI generator is a compact banner, never a floating button',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(AIGeneratorCard), findsOneWidget,
          reason: 'the banner is the single entry point for AI alert generation');

      // The empty state is the case where the duplicate CTA used to appear.
      // The distinct key forces a fresh State (and a fresh `initState`), so
      // the second pump really re-runs the load instead of reusing the first.
      final empty = _FakeAlertsService();
      await tester.pumpWidget(
        _app(AlertsScreen(key: const ValueKey('empty'), service: empty)),
      );
      await tester.pumpAndSettle();

      expect(find.byType(AIGeneratorCard), findsOneWidget,
          reason: 'the banner stays visible when there are no alerts');
    });

    // replaces the stub: 'SliverList/SliverChildBuilderDelegate is used for
    // efficient rendering'
    testWidgets('Alert list is rendered through SliverList, not a Column',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'One'),
        _alert(id: 'a2', title: 'Two'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(SliverList), findsOneWidget);
      final sliver = tester.widget<SliverList>(find.byType(SliverList));
      expect(sliver.delegate, isA<SliverChildBuilderDelegate>());
      expect((sliver.delegate as SliverChildBuilderDelegate).childCount, 2,
          reason: 'the delegate builds one row per alert');
    });

    // replaces the stub: 'RTL text alignment for Arabic content'
    testWidgets('Arabic alert text follows the reading direction',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'تجاوزت ميزانية البنزين'),
      ]);

      await tester.pumpWidget(
          _app(AlertsScreen(service: fake), locale: const Locale('ar')));
      await tester.pumpAndSettle();

      final title = tester.widget<Text>(find.text('تجاوزت ميزانية البنزين'));
      expect(title.textAlign, TextAlign.start,
          reason: 'the row must not hardcode left alignment');
      expect(
        Directionality.of(tester.element(find.text('تجاوزت ميزانية البنزين'))),
        TextDirection.rtl,
        reason: 'the Arabic locale must resolve to an RTL direction',
      );
    });

    // replaces the stub: 'Read/Unread state updates without full list rebuild'
    testWidgets('Marking an alert read updates the row without rebuilding the list',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning', isRead: false),
        _alert(id: 'a2', title: 'Nice work', type: 'achievement'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      final elementBefore =
          tester.element(find.byType(AlertListItem).at(0));
      expect(find.byKey(const Key('alert-unread-dot')), findsOneWidget,
          reason: 'an unread alert shows the unread dot');

      await tester.tap(find.text('Budget warning'));
      await tester.pumpAndSettle();

      expect(fake.markedRead, ['a1'],
          reason: 'tapping an unread alert must persist the read flag');
      expect(find.byKey(const Key('alert-unread-dot')), findsNothing,
          reason: 'the unread dot must disappear once the alert is read');
      expect(
        identical(elementBefore, tester.element(find.byType(AlertListItem).at(0))),
        isTrue,
        reason: 'the list must not be torn down and rebuilt when one row '
            'changes',
      );
    });
  });
}
