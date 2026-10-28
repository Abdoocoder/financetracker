import 'dart:convert';

import 'package:easy_localization/easy_localization.dart' hide TextDirection;
import 'package:fajrak/widgets/dashboard/dashboard_quick_add.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Same loader pattern as the other widget tests: reads the real i18n JSON in
/// the real async zone and serves it to the fake-async test zone.
class _MapAssetLoader extends AssetLoader {
  _MapAssetLoader(this._data);
  final Map<String, Map<String, dynamic>> _data;

  @override
  Future<Map<String, dynamic>?> load(String path, Locale locale) async {
    return _data[locale.languageCode] ?? _data[locale.toString()];
  }
}

late Map<String, Map<String, dynamic>> _translations;

Widget _app(Widget child) {
  return EasyLocalization(
    supportedLocales: const [Locale('en'), Locale('ar')],
    path: 'assets/i18n',
    startLocale: const Locale('en'),
    useOnlyLangCode: true,
    assetLoader: _MapAssetLoader(_translations),
    child: Builder(
      builder: (context) => MaterialApp(
        localizationsDelegates: context.localizationDelegates,
        supportedLocales: context.supportedLocales,
        locale: context.locale,
        theme: ThemeData(useMaterial3: true),
        home: Scaffold(body: child),
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
  });

  group('DashboardQuickAdd — deep-link focus seam', () {
    testWidgets('amount field adopts the injected focus node', (tester) async {
      // `/dashboard?quick=1` opens the Dashboard and must land the caret in the
      // amount field. MainScreen drives that through DashboardScreen.openQuickAdd,
      // which can only work if the widget accepts an external FocusNode.
      final focusNode = FocusNode();
      addTearDown(focusNode.dispose);

      await tester.pumpWidget(
        _app(
          DashboardQuickAdd(
            currency: 'JOD',
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
            focusNode: focusNode,
            onAdd: (type, amount, category,
                {originalAmount, originalCurrency, exchangeRate}) async {},
          ),
        ),
      );
      await tester.pumpAndSettle();

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.focusNode, same(focusNode),
          reason: 'the amount field must use the focus node the Dashboard owns');

      focusNode.requestFocus();
      await tester.pump();
      expect(focusNode.hasFocus, isTrue);
    });
  });
}
