# Alerts Screen UI/UX Overhaul — Implementation Plan

**Date:** 2026-10-22
**Status:** Awaiting approval — no production code has been written yet.
**Scope:** `mobile/fajrak_flutter` — alerts screen, alerts widgets, alerts tests.
**Replaces:** an earlier draft of this plan that was lost before it was submitted.
Every claim below was re-verified against the repo on 2026-10-22 (file:line
references included so a reviewer can check them without trusting this document).

**Amendment 1 (2026-10-22, after review)** — three changes to the draft above:

1. **Task 0 added**: a compilable skeleton (`AlertsService` stub + the `service`
   constructor parameter + the unread-dot key) so Task 1 is a **runtime** RED
   with one matcher message per test instead of a compile failure. See
   [TDD sequence](#tdd-sequence-compile--fail-with-real-assertions--make-it-pass).
2. **Task 1's RED expectations rewritten**: the expected failure of each of the
   8 tests is now spelled out, so the RED run is evidence, not a promise.
3. **Task 6's test count corrected** from 177 to **206**, plus a table of the
   stale test counts in `CLAUDE.md` / `CONTRIBUTING.md`. See
   [Correction log](#correction-log).

---

## Goal

Replace the 8 placeholder tests in
`mobile/fajrak_flutter/test/widgets/alerts/alerts_screen_test.dart` — every one of
which is currently `expect(true, isTrue)` — with real widget tests that pin the
Alerts screen's documented behaviour, and make the **smallest** production changes
needed for those tests to be meaningful.

Success criteria:

1. All 8 stub tests are gone; each is replaced by a test with a name, real
   assertions, and a `reason:` string that says what would break.
2. The TDD sequence is **compile → fail-with-real-assertions → make-it-pass**:
   - **Task 0** ships a compilable skeleton, so the test file never fails to
     build (a build failure is not a RED — it says nothing about which
     behaviour is missing).
   - **Task 1**'s RED run reports **one runtime assertion failure per test**,
     each with a matcher message naming what is missing.
   - **Tasks 2-5** turn those failures green, one production change at a time.
3. `flutter test` is green at **206 tests** (unchanged: 8 stubs out, 8 real
   tests in), `flutter analyze` reports no new issues.
4. `CHANGELOG.md` gets an entry under `[Unreleased]` (repo convention).

### TDD sequence: compile → fail-with-real-assertions → make-it-pass

| Phase | Task | What the runner prints |
|---|---|---|
| compile | 0 | `flutter analyze` clean, `flutter test` still green at 206 — the seam exists but is a stub |
| fail (real assertions) | 1 | 8 tests run, **8 fail**, each with a matcher message such as `Expected 1 widget with key alert-unread-dot, found 0` |
| pass | 2, 3, 4, 5 | each task turns a specific subset green; the full suite is green at the end of Task 5 |

A RED run that says `Could not load a test because the file failed to compile`
is **not** acceptable evidence — it is a build error dressed up as a test
result. Task 0 exists to rule that out.

Non-goal: this is **not** a redesign of the Alerts screen. Four of the eight stub
tests describe behaviour that already exists in production code
(Dismissible swipe-to-delete, type-specific icons, type-specific action buttons,
`SliverList` rendering). Those become characterization tests — they must pass, and
they must fail loudly if someone later breaks the behaviour. Only the three
genuinely-red areas (redundant counter, FAB duplication, read-state update) change
production code.

---

## Architecture

```
AlertsScreen (StatefulWidget)
  ├─ AlertsService            ← NEW seam (lib/services/alerts_service.dart)
  │    │                         created as a throwing stub in Task 0,
  │    │                         filled in with the real queries in Task 2
  │    ├─ fetchAlerts()
  │    ├─ markRead(id)
  │    ├─ markAllRead()
  │    ├─ deleteAlert(id)
  │    └─ deleteAll()
  ├─ AIGeneratorCard(compact: true)   ← stays (the banner)
  ├─ AlertFilterTabs                  ← stays (owns the per-filter count badges)
  ├─ AlertHeader                      ← REMOVED (redundant unread pill)
  ├─ SliverList + SliverChildBuilderDelegate  ← stays
  └─ AIGeneratorFAB                   ← REMOVED (duplicates the banner)
```

The seam follows the existing precedent in this repo:
`ChatScreen({service, keysLoader, contextLoader})`
(`lib/screens/chat/chat_screen.dart:44-57`) with a fake subclass in
`test/screens/chat/chat_screen_test.dart:31`. Same shape: a plain service class
with overridable instance methods, injected through the screen's constructor, and a
fake subclass in the test.

`AlertsService` is a **class with instance methods**, not a static-method service
like `AccountsService`. That is deliberate: the test fake must be able to
`extends AlertsService` and override the methods, exactly like
`_FakeByokService extends ByokService`.

### Why a service class rather than a callback bag

The screen performs five distinct data operations (load, mark one read, mark all
read, delete one, delete all). Injecting five separate callbacks would make the
constructor unreadable and would not give the fake a single place to record
"what did the screen ask the backend to do". A service class gives the test one
assertion surface (`fake.markedRead`, `fake.deleted`, …).

---

## Tech Stack

- Flutter 3.47.7 / Dart 3.13.5 (per `CONTRIBUTING.md`, verified 2026-10-18)
- `provider` (for `AppState`), `easy_localization` (i18n), `supabase_flutter` 2.18.3
- `flutter_test` only — no mocking framework (repo convention, see
  `mobile/fajrak_flutter/AGENTS.md` → "Testing Conventions")
- `shared_preferences` mock + `MethodChannel` mock for the app-badge plugin

---

## Spec — decisions already fixed (do not re-litigate)

### D1. AI generator = BANNER, not FAB

`AIGeneratorCard(compact: true)` is already rendered as the top banner
(`alerts_screen.dart:306-316`). `AIGeneratorFAB` is rendered **only when the list
is empty** (`alerts_screen.dart:403-409`), so the empty state shows a banner *and*
a FAB for the same action, while the normal state shows only the banner.
**Decision: banner only.** `AIGeneratorFAB` and the 80 px FAB spacer
(`alerts_screen.dart:398`) are deleted.

*Arabic one-liner for the UI changelog:*
> شارة الذكاء الاصطناعي فقط — إزالة زر عائم مكرر يظهر مع الشارة في حالة عدم وجود تنبيهات.

### D2. The unread counter pill is removed (`AlertHeader`)

`AlertFilterTabs` already renders a count badge for **every** filter, including
`unread` (`alert_filter_tabs.dart:33` → `_filterTab('unread', …, unreadCount)`,
badge rendered at `:73-92`). `AlertHeader` renders a second pill with the *same*
number (`alert_header.dart:19-44`, i18n `alerts_unread_count` = `"{} Unread"` /
`"{} غير مقروء"`). Both show the unread count, in the same screen, two rows apart.
**Decision: delete `AlertHeader` and its sliver** (`alerts_screen.dart:333-342`),
and delete `lib/widgets/alerts/alert_header.dart`.

This is the one user-visible change in the plan besides D1.

### D3. `ListView.builder` vs `SliverList` → **SliverList**

The screen is a `CustomScrollView` with mixed slivers (banner + tabs + list +
padding). A `ListView.builder` cannot be embedded in that structure without
becoming a `SliverToBoxAdapter` (which defeats lazy building and breaks the
scroll physics). `SliverList` + `SliverChildBuilderDelegate` is already
implemented at `alerts_screen.dart:378-396`. **Decision: keep `SliverList`** —
the stub test becomes a regression guard, not a change.

### D4. "Subtitle contains" claim → dropped, replaced with real examples

There is no `subtitle.contains(...)` branch anywhere in the Alerts code. The real
substring logic that exists is:

| Where | What it matches |
|---|---|
| `ai_generator_card.dart:87` | strips the `'✨ '` prefix from `alerts_ai_generate` |
| `ai_generator_card.dart:222` | same, in the FAB that D1 deletes |
| `alerts_screen.dart:161-175` | Arabic keyword routing in `_navigateAlert` |
| `alerts_screen.dart:219-238` | Arabic keyword routing in `_getActionType` |

Raw i18n values: `en.json:339` `"alerts_ai_generate": "✨ Generate New Alerts"`,
`ar.json:342` `"alerts_ai_generate": "✨ توليد تنبيهات جديدة"`.
The Arabic keyword routing is a known wart documented at
`docs/domain/ui-and-mobile.md:98-102` ("do not add more keyword branches without
the owner's sign-off"). **This plan adds no new keyword branches**; the routing
tests below pin the *existing* behaviour so a future refactor to typed fields is
safe.

---

## Global Constraints

These are repo rules. A reviewer should reject any task that violates them.

1. **RLS is never bypassed.** Every query stays scoped by `auth.uid()`; the
   extracted service keeps the `.eq('user_id', user.id)` clauses exactly as they
   are today (`alerts_screen.dart:44`, `:66`, `:102`).
2. **No `currentUser!`.** Keep the `final user = …currentUser; if (user == null) return;`
   guard pattern (`docs/domain/ui-and-mobile.md:95-97`).
3. **Every user-facing string goes through i18n.** This plan adds **no** new
   strings, so no `ar.json`/`en.json` parity work is required. If a string is
   added anyway, it must land in both `assets/i18n/ar.json` and
   `assets/i18n/en.json` in the same change (and the web locales too, per the
   parity rule at `docs/domain/ui-and-mobile.md:86-89`).
4. **The service must not swallow errors.** The screen's existing
   `try/catch → ErrorHandler.handle` path must stay intact; the service lets
   exceptions propagate.
5. **No Zakat / Nisab math, no hawl logic** in the mobile client (golden rule 10/11).
   Not touched by this plan.
6. **No PII to Sentry** — the new service must not log alert titles/messages.
7. **No `title.contains(...)` branches added** (`docs/domain/ui-and-mobile.md:98-102`).
8. **No network in tests.** The fake service replaces every DB call; Supabase is
   initialised with a fake URL and `persistSession: false` so no request is ever
   made; `auth.currentUser` is `null` so `AnalyticsService` short-circuits
   (`lib/services/analytics_service.dart:8-12`).
9. **Alerts mutations refresh `AppState` after the DB write**
   (`docs/domain/ui-and-mobile.md:106-109`) — `loadUnreadAlerts()` /
   `decrementUnreadAlerts()` / `clearUnreadAlerts()` stay in place.
10. **Commits are conventional** (`feat:`, `fix:`, `test:`, `chore:`, `refactor:`).

---

## Review Focus

What a reviewer should spend their attention on, in priority order:

1. **`_load()` behaviour change.** The current code returns early when
   `user == null` **before** the `try/finally` (`alerts_screen.dart:37-39`), so
   `_loading` stays `true` forever and the screen shows an infinite spinner. The
   fix must make `_loading` clear on **every** path (success, error, no user) and
   must not swallow the error path — `ErrorHandler.handle` still has to run.
   **Task 0 makes the minimal version of this fix** (move the guard inside the
   `try` — see 0d) so the RED run in Task 1 is a *runtime* RED; **Task 2**
   rewrites `_load()` around the service and moves the guard into the service
   entirely.
2. **Error propagation.** `AlertsService` methods must not catch. If they do, the
   screen's error handling dies silently and the user sees an empty list instead
   of the error toast.
3. **Deletion of the FAB must not leave the 80 px spacer** (`alerts_screen.dart:398`)
   — dead padding at the bottom of the list.
4. **Deletion of `AlertHeader` must not leave a dangling import** in
   `alerts_screen.dart`.
5. **Test isolation.** No test may reach the network. The Supabase client is
   initialised once in `setUpAll` with a fake URL; `auth.currentUser` is `null`.
   The `flutter_app_badge_control` method channel **must** be mocked, otherwise
   `AppState._updateBadge()` (`lib/app_state.dart:90-99`) produces an unhandled
   `MissingPluginException` that fails the test asynchronously.
6. **Assertions must be behavioural, not structural.** Prefer asserting what the
   user sees (badge number, icon, button label, dot presence) over asserting on
   widget types alone. The one structural assertion kept deliberately is
   `SliverList` (D3), because that is the stub's actual subject.
7. **No test asserts on internal implementation details of the fake** (e.g. how
   many times `setState` was called). The stub phrase "without full list rebuild"
   is pinned as *element preservation* (see Task 5) — the honest, measurable
   version of that claim.
8. **The RED run must be a runtime RED.** Task 0 has to land before Task 1, and
   the Task 1 output must show 8 failing tests with matcher messages — never
   "the file failed to compile". If the Task 0 stub is missing, the plan's first
   task was skipped, not a bonus.

---

## Tasks

Each task is a separate commit, except Task 5 and Task 6, which are
verification-only (their production changes land in Tasks 0 and 2). Run the
**Verify** line after each task.

---

### Task 0 — compilable skeleton: make the RED run a *runtime* RED

**Why this task exists.** Task 1's test file references `AlertsService` and
`AlertsScreen(service:)`, neither of which exists today. Without this task the
test file fails to load and the runner prints
`Could not load a test because the file failed to compile` — **zero** test
results. That is a *build* failure, not a RED: it says nothing about which
behaviour is missing, and it cannot tell us whether the eight tests are even
correct. Task 0 removes the build failure so that Task 1 produces **eight
runtime assertion failures, one per test**, each naming what is missing.

**Files:**
- NEW `mobile/fajrak_flutter/lib/services/alerts_service.dart`
- `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart`
- `mobile/fajrak_flutter/lib/widgets/alerts/alert_list_item.dart`

#### 0a. The service skeleton — five methods, no implementation

```dart
/// Data access for the Alerts screen.
///
/// The real queries land in Task 2. Until then every method throws, so the test
/// file compiles and the Task 1 RED run reports real assertion failures
/// instead of a load error.
class AlertsService {
  Future<List<Map<String, dynamic>>> fetchAlerts() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  Future<void> markRead(String id) async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  Future<void> markAllRead() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  Future<void> deleteAlert(String id) async {
    throw UnimplementedError('not implemented yet — Task 2');
  }

  Future<void> deleteAll() async {
    throw UnimplementedError('not implemented yet — Task 2');
  }
}
```

> **No Supabase import, no query, no RLS clause in this task.** The real
> queries land in Task 2, which replaces these bodies verbatim.
>
> The class must stay *overridable* — plain instance methods, no `static`, no
> `final` fields — so the test fake can `extends AlertsService`, exactly like
> `_FakeByokService extends ByokService`
> (`test/screens/chat/chat_screen_test.dart:31`).

#### 0b. Accept the parameter, do not wire it

```dart
class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key, this.service});

  final AlertsService? service;

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}
```

**Do not** touch `_load()`, `_markRead()`, `_markAllRead()`, `_deleteAlert()` or
`_deleteAll()` in this task. The screen still performs its old direct Supabase
calls; the parameter is accepted and ignored until Task 2. A public final field
that is not read yet is not an analyzer warning, so `flutter analyze` stays
clean.

#### 0c. Add the unread-dot key

`lib/widgets/alerts/alert_list_item.dart:117-131` — the unread dot already
exists; give it a stable key so a test can find it:

```dart
                          if (!isRead)
                            Container(
                              key: const Key('alert-unread-dot'),
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                ...
```

#### 0d. Move the `user == null` guard inside the `try` (infinite-spinner fix)

> **This is the one edit in Task 0 beyond the literal skeleton, and it is
> load-bearing for Task 1 — it needs the plan owner's explicit approval.**

Today `_load()` returns at `alerts_screen.dart:39`, **before** the `try/finally`,
so `_loading` stays `true` (`:26`) and the screen renders a
`CircularProgressIndicator` (`:296-297`) forever. In Task 1 the screen is still
**not** wired to the service, so `auth.currentUser` is `null` → the guard fires
→ the spinner never stops → every `pumpAndSettle()` in the RED run would block
for the framework's 10-minute timeout and fail with `pumpAndSettle timed out`
instead of a matcher message. Eight tests × 10 minutes = an 80-minute RED run
that proves nothing.

The minimal fix is to move the guard **inside** the `try`, so the existing
`finally` always runs:

```dart
  Future<void> _load() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;
      final data = await Supabase.instance.client
          .from('alerts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);
      if (mounted) {
        setState(() {
          _alerts = List<Map<String, dynamic>>.from(data);
          _loading = false;
        });
      }
    } catch (e, st) {
      if (mounted) ErrorHandler.handle(e, st: st, context: context, developerMessage: 'Load Alerts');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
```

The screen's data access is **unchanged** — still the same direct Supabase call
with the same `.eq('user_id', user.id)` RLS scope (golden rule 1). Only *when*
`_loading` is cleared changes. It is also a genuine user-facing bug fix: a
signed-out user currently stares at an infinite spinner on the Alerts screen.
Task 2 rewrites this method around the service and moves the guard into the
service entirely.

**Verify:**

```bash
cd mobile/fajrak_flutter && flutter analyze
cd mobile/fajrak_flutter && flutter test
```

**Expected:** `flutter analyze` clean (no new issues). `flutter test` still
green at **206 tests** — no test file changed in this task.

**Commit:** `test(mobile): add empty alerts service skeleton for TDD`

---

### Task 1 — RED: write the 8 real tests against the target API

**Files:** `mobile/fajrak_flutter/test/widgets/alerts/alerts_screen_test.dart`
(replaces the 8 stubs).

**Do first:** write the whole file, then run the test command and capture the
output. This is the RED evidence. Nothing in `lib/` changes in this task.

#### 1a. Test harness

Mirror the two existing precedents exactly:
`test/widgets/dashboard/gamification_card_test.dart` (i18n + SharedPreferences)
and `test/screens/chat/chat_screen_test.dart` (fake service + injected screen).

```dart
import 'dart:convert';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/app_state.dart';
import 'package:fajrak/screens/alerts/alerts_screen.dart';
import 'package:fajrak/services/alerts_service.dart';
import 'package:fajrak/widgets/alerts/ai_generator_card.dart';
import 'package:fajrak/widgets/alerts/alert_filter_tabs.dart';
import 'package:fajrak/widgets/alerts/alert_header.dart';
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

  List<Map<String, dynamic>> _alerts;

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
```

`setUpAll`:

```dart
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
```

> Note: `AlertsScreen` renders its own `Scaffold`, so the harness pumps it as
> `home: child` **without** an outer `Scaffold` (an inner `Scaffold` inside
> another `Scaffold` is legal but the outer one adds a pointless `MediaQuery`
> padding). The code above already reads `home: child`, where `child` is the
> `AlertsScreen`.
>
> Note: the `alert_header.dart` import exists only for T1's
> `find.byType(AlertHeader)` assertion. **Task 3 deletes
> `lib/widgets/alerts/alert_header.dart`, so Task 3 must also remove this
> import and that one assertion from the test file** — otherwise the test file
> stops compiling and the whole file's results are lost.

#### 1b. The 8 tests

Keep the original stub names so the mapping stays visible; replace the bodies.

**T1 — filter tabs own the counts; no second unread counter**

```dart
    testWidgets('Filter tabs carry the counts; no separate unread counter pill',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning', isRead: false),
        _alert(id: 'a2', title: 'Nice work', type: 'achievement'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(AlertFilterTabs), findsOneWidget);
      expect(find.byType(AlertHeader), findsNothing,
          reason: 'the unread count is already shown by the "unread" filter '
              'badge; a second pill is a duplicate of the same number');
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
```

> The badge counts follow from the fixture: `a1` is a `warning` and unread,
> `a2` is a read `achievement` → `all` = 2, `unread` = 1, `warning` = 1,
> `achievement` = 1, `motivation` = 0. The digit `1` therefore appears three
> times and `2` once. **If the fixture changes, recount** — the point of the
> test is that the numbers live in the tabs and nowhere else.

**T2 — swipe left deletes the alert**

```dart
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
```

**T3 — one icon per alert type**

```dart
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
```

**T4 — action buttons only where the type calls for one**

```dart
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
```

> The action-button labels come from the i18n keys `view_details`
> (`en.json:908` → "View Details", `ar.json:908` → "عرض التفاصيل") and
> `add_transaction` (`en.json:909` → "Add Transaction",
> `ar.json:909` → "إضافة معاملة"), rendered by `AlertListItem`
> (`alert_list_item.dart:170-178`). The type→action mapping lives in
> `_getActionType` (`alerts_screen.dart:212-243`).
>
> The reminder row uses the Arabic keyword branch on purpose, because that is
> the only branch that produces `addTransaction` today
> (`alerts_screen.dart:229-238`). That behaviour is exactly what
> `docs/domain/ui-and-mobile.md:98-102` warns about — this test pins it as-is
> so a future move to typed routing can be verified against a baseline.

**T5 — the AI generator is a banner, never a second floating button**

```dart
    testWidgets('AI generator is a compact banner, never a floating button',
        (tester) async {
      final fake = _FakeAlertsService(alerts: [
        _alert(id: 'a1', title: 'Budget warning', type: 'warning'),
      ]);

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(AIGeneratorCard), findsOneWidget,
          reason: 'the banner is the single entry point for AI alert generation');
      expect(find.byType(AIGeneratorFAB), findsNothing,
          reason: 'a FAB next to the banner duplicates the same action');
    });
```

and the empty state (the case where the FAB used to appear):

```dart
    testWidgets('AI generator banner is shown even when there are no alerts',
        (tester) async {
      final fake = _FakeAlertsService();

      await tester.pumpWidget(_app(AlertsScreen(service: fake)));
      await tester.pumpAndSettle();

      expect(find.byType(AIGeneratorCard), findsOneWidget);
      expect(find.byType(AIGeneratorFAB), findsNothing,
          reason: 'the empty state must not grow a second CTA for the same '
              'action');
    });
```

**T6 — the list renders through a lazily built sliver**

```dart
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
```

**T7 — Arabic rows follow the reading direction**

```dart
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
```

**T8 — marking read updates the row in place**

```dart
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
```

> `find.byKey(const Key('alert-unread-dot'))` requires the small production
> change in **Task 0 (0c)** — the key lands with the skeleton, so this assertion
> is a genuine RED in Task 1 (no row is rendered yet → the dot is nowhere to be
> found) and goes green in Task 2 once the screen is wired to the service.

#### Verify (RED run — capture the output, do not fix anything yet)

```bash
cd mobile/fajrak_flutter && flutter test test/widgets/alerts/alerts_screen_test.dart
```

**Expected: 8 tests run, 8 fail, each with a matcher message.** The file
compiles (Task 0 shipped the seam), so this is a *runtime* RED, not a load
error.

In the RED run the screen is still not wired to the fake service, so it renders
its **empty** state (Task 0's 0d fix makes `_loading` clear instead of spinning
forever). Every failure below therefore names the thing that is missing:

| Test | Expected RED message | Why |
|---|---|---|
| T1 badges | `Expected 3 widgets with text "1", found 0` | the list is empty, so every badge reads 0. The `find.byType(AlertHeader)` assertion fails too: `Expected 0 widgets, found 1` — the duplicate pill is still there |
| T2 swipe | `Expected 1 widget, found 0` (for `Dismissible`) | no row is rendered, so there is nothing to swipe |
| T3 icons | `Expected 1 widget with icon Icons.warning_outlined, found 0` | no rows → no icons |
| T4 buttons | `Expected 1 widget with text "View Details", found 0` | no rows → no action buttons |
| T5 banner (both cases) | `Expected 0 widgets, found 1` (for `AIGeneratorFAB`) | an empty list is exactly the case in which the duplicate FAB renders (`alerts_screen.dart:403-409`) |
| T6 sliver | `Expected 1 widget, found 0` (for `SliverList`) | with no alerts the screen renders the empty state (`alerts_screen.dart:344-376`), not the list |
| T7 RTL | `Bad state: No element` | the Arabic title is not rendered, so `tester.widget<Text>(...)` has nothing to read |
| T8 read state | `Expected 1 widget with key alert-unread-dot, found 0` | no row → no dot; the tap on `find.text('Budget warning')` also fails with `found 0 widgets` |

Every message names **what is missing**, which is the whole point: the failing
test tells the implementer exactly what to build. Paste the real output into the
PR description next to this table.

**If the output instead says** `Could not load a test because the file failed to
compile` **or** `pumpAndSettle timed out` — Task 0 did not land (or landed
without 0d). Go back to Task 0; do not "fix" the tests.

> The skeleton's `UnimplementedError('not implemented yet — Task 2')` bodies are
> **not** what the RED run shows: the fake overrides all five methods, so the
> stub is never called. The stub exists purely to make the file compile. A test
> that drove the *real* service would report
> `AlertsService.fetchAlerts threw UnimplementedError` — which is the message
> that would surface if the screen were wired to the real service before Task 2.

**Commit:** `test(mobile): replace alerts placeholder tests with real widget tests`

---

### Task 2 — GREEN, part 1: the `AlertsService` seam

**Files:**
- NEW `mobile/fajrak_flutter/lib/services/alerts_service.dart`
- `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart`

**Replace the Task 0 stub** with the real implementation — the queries moved
**verbatim** from the screen (`alerts_screen.dart:41-45`, `:83-85`, `:63-67`,
`:114`, `:102`):

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

/// Data access for the Alerts screen.
///
/// Every method talks to Supabase directly; RLS (golden rule 1) scopes the
/// rows to `auth.uid()`. The class uses instance methods (not static ones) so
/// tests can inject a fake subclass — same pattern as `ByokService`.
class AlertsService {
  /// Loads the user's alerts, newest first.
  Future<List<Map<String, dynamic>>> fetchAlerts() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return [];
    final data = await Supabase.instance.client
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(data);
  }

  Future<void> markRead(String id) async {
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('id', id);
  }

  Future<void> markAllRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client
        .from('alerts')
        .update({'is_read': true})
        .eq('user_id', user.id)
        .eq('is_read', false);
  }

  Future<void> deleteAlert(String id) async {
    await Supabase.instance.client.from('alerts').delete().eq('id', id);
  }

  Future<void> deleteAll() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    await Supabase.instance.client.from('alerts').delete().eq('user_id', user.id);
  }
}
```

**Wire the seam into the screen:**

1. `AlertsScreen` already has `final AlertsService? service;` in the constructor
   (added in Task 0, 0b) — **Task 2 only starts using it**.
2. Add `late final AlertsService _service = widget.service ?? AlertsService();`
   to `_AlertsScreenState`.
3. Replace the five direct Supabase calls with `_service.*`:
   `_load()` → `_service.fetchAlerts()`,
   `_markRead(id)` → `_service.markRead(id)`,
   `_markAllRead()` → `_service.markAllRead()`,
   `_deleteAlert(id)` → `_service.deleteAlert(id)`,
   `_deleteAll()` → `_service.deleteAll()`.
4. The `user == null` guards move **into the service** (they are already there
   in the code above). The screen no longer reads `currentUser` for data.
5. `_load()` becomes:

```dart
  Future<void> _load() async {
    try {
      final data = await _service.fetchAlerts();
      if (mounted) {
        setState(() => _alerts = data);
      }
    } catch (e, st) {
      if (mounted) {
        ErrorHandler.handle(e, st: st, context: context,
            developerMessage: 'Load Alerts');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
```

> This is the **infinite-spinner bug fix**: today `_load()` returns at
> `alerts_screen.dart:39` *before* the `try`, so `_loading` stays `true` and a
> signed-out user stares at a spinner forever. The `finally` now always clears
> it. Keep the `catch` → `ErrorHandler.handle` intact: the service must not
> swallow errors.
>
> Task 0's 0d already applied the minimal version of this fix (guard inside the
> `try`); this task replaces it with the service-based version, where the guard
> lives in `AlertsService.fetchAlerts()` instead.

**Verify:**

```bash
cd mobile/fajrak_flutter && flutter analyze lib/screens/alerts lib/services/alerts_service.dart
cd mobile/fajrak_flutter && flutter test test/widgets/alerts/alerts_screen_test.dart
```

**Expected:** the file compiles and the fake is now driving the screen. **T2,
T3, T4, T6, T7 and T8 turn green here** — T8 because the unread-dot key landed
in Task 0 (0c) and `_markRead` is now wired to the service. The remaining
failures are the two genuine RED areas: **T1** (the duplicate `AlertHeader`
pill) and **T5** (the duplicate FAB).

**Commit:** `refactor(mobile): extract AlertsService and fix the alerts loading spinner`

---

### Task 3 — GREEN, part 2: delete the redundant unread counter

**Files:**
- `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart` — remove the
  `AlertHeader` sliver (`:333-342`) and its import.
- DELETE `mobile/fajrak_flutter/lib/widgets/alerts/alert_header.dart`
- `mobile/fajrak_flutter/test/widgets/alerts/alerts_screen_test.dart` — remove
  the `alert_header.dart` import and T1's `find.byType(AlertHeader)` assertion
  (the class no longer exists, so the assertion cannot be written — and the
  file must keep compiling).

`AlertHeader` is referenced in exactly two places
(`alert_header.dart:5`, `alerts_screen.dart:337`) — verified by grep, so
deleting the file is safe.

> Before deleting, confirm nothing else references it:
> `grep -rn "AlertHeader" lib/ test/` → only the two hits above **plus the
> test file's import and assertion, which this task removes**.

**Verify:**

```bash
cd mobile/fajrak_flutter && flutter analyze lib/
cd mobile/fajrak_flutter && flutter test test/widgets/alerts/alerts_screen_test.dart
```

**Expected:** T1 turns green. No other test changes state.

**Commit:** `refactor(mobile): drop the duplicate unread counter from the alerts screen`

---

### Task 4 — GREEN, part 3: banner only, no FAB

**Files:**
- `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart` — remove
  `floatingActionButton:` / `floatingActionButtonLocation:` (`:402-410`) and the
  80 px bottom spacer (`:398`).
- `mobile/fajrak_flutter/lib/widgets/alerts/ai_generator_card.dart` — delete the
  `AIGeneratorFAB` class (`:193-229`).

`AIGeneratorFAB` is referenced only at `ai_generator_card.dart:193` and
`alerts_screen.dart:405` (verified by grep) — safe to delete.

The banner already renders the AI action (`AIGeneratorCard` compact mode,
`ai_generator_card.dart:26-97`), including the `generating` spinner state, so no
capability is lost.

**Verify:**

```bash
cd mobile/fajrak_flutter && flutter analyze lib/
cd mobile/fajrak_flutter && flutter test test/widgets/alerts/alerts_screen_test.dart
```

**Expected:** T5 (both cases) turns green.

**Commit:** `feat(mobile): use a single AI banner for alert generation`

---

### Task 5 — verification only: the read-state path

**Files:** none.

The two production pieces this task used to own have already landed:

- the unread-dot key — **Task 0 (0c)**,
- the `_markRead` wiring — **Task 2**.

So **T8 is already green after Task 2**, and this task exists to pin the
decision that keeps it that way:

- `_markRead` keeps mutating the single entry in place
  (`alerts_screen.dart:87-90`) and keeps calling
  `context.read<AppState>().decrementUnreadAlerts()` (`:91`).
- **Do not** refactor to a `ValueListenableBuilder` here: the measured guarantee
  this plan asserts is *element preservation* (the row is updated, not torn
  down), and the current `setState` already satisfies it. A per-item notifier
  would change `AlertListItem`'s public API for no user-visible gain — out of
  scope (see "Out of scope" #3).

**Verify:**

```bash
cd mobile/fajrak_flutter && flutter analyze lib/
cd mobile/fajrak_flutter && flutter test test/widgets/alerts/alerts_screen_test.dart
```

**Expected:** T8 is green — `fake.markedRead == ['a1']`, the dot is gone, and the
`AlertListItem` element is the *same* element as before the tap (no tear-down,
no rebuild).

**Commit:** none (verification only — the production change landed in Tasks 0
and 2).

---

### Task 6 — Full verification

```bash
cd mobile/fajrak_flutter && flutter analyze
cd mobile/fajrak_flutter && flutter test
```

**Expected:**

- `flutter analyze` → no new issues (the repo has pre-existing warnings; compare
  against `git stash`-free baseline — run `flutter analyze` on `HEAD` if unsure).
- `flutter test` → the suite is green and the total is **206 tests** — unchanged,
  because 8 stubs are replaced by 8 real tests.

> **206 is the runtime count** that `flutter test` prints
> (`00:23 +206: All tests passed!`, measured 2026-10-22). It is **32 higher** than
> the number of `test(` / `testWidgets(` declarations in the tree (174), because
> `test/i18n_keys_test.dart` generates one test per i18n key at runtime (the
> `for (final key in I18n.byokChatKeys)` / `I18n.byokSettingsKeys` loops at
> `test/i18n_keys_test.dart:85` and `:135`). Quote the **runtime** number in
> docs, never the declaration count.

> **The JSON reporter emits 248 `testStart` events, not 206** (measured
> 2026-10-22). The reporter counts the pseudo-events too, so the two numbers
> are not in conflict — 206 is the count of real tests, 248 is the count of
> `testStart` events:
>
> | Event kind | Count |
> |---|---|
> | Real tests | **206** |
> | `loading <file>` pseudo-test (one per test file) | 24 |
> | `setUpAll` | 9 |
> | `tearDownAll` | 9 |
> | **Total `testStart` events** | **248** |
>
> 206 + 24 + 9 + 9 = 248. **Nine** files carry a `setUpAll`/`tearDownAll`
> pair (`zakat_calculator_screen_test`, `byok_service_test`, `llm_service_test`,
> `alerts_screen_test`, `gamification_card_test`, `zakat_hawl_card_test`,
> `byok_keys_section_save_test`, `byok_keys_section_test`,
> `testimonial_card_test`) — not eight. Verify with:
>
> ```bash
> cd mobile/fajrak_flutter && flutter test --reporter=json 2>&1 | grep -c testStart
> ```
>
> The `flutter test` console summary (`+206: All tests passed!`) remains the
> authoritative count of real tests.

**If the count is not 206, stop and re-check Task 1** — the net change must be
zero (8 stubs out, 8 real tests in). A different number means a test was added
or dropped somewhere else.

**The three test counts quoted in the repo docs are not all current:**

| Where | Claim | Status (verified 2026-10-22) |
|---|---|---|
| `CLAUDE.md:79` | 186 | **stale** — written 2026-10-18 (`0a6899f9`), correct *that day*; 20 tests landed afterwards |
| `CONTRIBUTING.md` ("177 tests, per `CLAUDE.md`") | 177 | **stale** — written 2026-10-18 13:40 (`9a700cfb`), correct *that day*; superseded by `0a6899f9` the same evening (it quoted a number `CLAUDE.md` no longer had) |
| `PROJECT_CONTEXT.md:59` | 206 | **correct** — written 2026-10-21 (`d0dc9e9c`), matches the runtime count |

The **20 tests added after** `0a6899f9` (2026-10-18) are:

| File | Tests | Commit |
|---|---|---|
| `test/utils/sentry_service_test.dart` | 11 | `b39ef144` (2026-10-19) |
| `test/screens/zakat_calculator_screen_test.dart` | 1 | `0d5560cc` + `aba3df23` (2026-10-19) |
| `test/widgets/alerts/alerts_screen_test.dart` | 8 stubs | `8d2f28cc` (2026-10-20) |

186 + 20 = 206. Fixing the two stale numbers is a one-line docs fix, but it is
**not** part of this change (out of scope) — raise it as a separate `docs:`
commit.

Also confirm no test reached the network: the run must complete in seconds, with
no `SocketException` and no HTTP retries.

> **What `alerts_screen_test.dart` does not cover (verified 2026-10-22):** none of
> the 8 tests taps Generate and none mocks `http`, so `_generateAlerts` is never
> executed. 8/8 proves **no regression in the surrounding screen** (filter tabs,
> swipe-delete, read state, RTL); it does **not** prove the alert-generation
> wiring. That path is verified manually: `make run-proxy` in one terminal,
> `make run-web-with-proxy` in another, then DevTools → Network on a Generate
> click. Expect a real production write — see
> `docs/domain/ui-and-mobile.md:104-113`.
>
> **Baseline moved after this plan was written:** `flutter test` prints **208**
> as of 2026-10-22 — `test/services/api_base_url_test.dart` added 2 tests
> (`feat(mobile): make API origin configurable via --dart-define`). Task 6's
> expected total is therefore 208, not 206 (8 stubs → 8 real tests keeps it flat).

**Commit:** none (verification only).

---

### Task 7 — CHANGELOG entry

`CHANGELOG.md`, under `## [Unreleased]` → `### Changed` (create the section if
it does not exist):

```markdown
### Changed

- **Alerts screen (mobile)**: the AI alert generator is now a single compact
  banner — the duplicate floating button (previously shown next to the banner
  when the list was empty) and its 80 px spacer are gone. The unread counter
  pill was removed because the "unread" filter tab already shows the same
  number. The screen's data access moved into `AlertsService`, which also fixes
  a signed-out user getting an infinite spinner on the Alerts screen. The 8
  placeholder widget tests are replaced by real behavioural tests.
```

No web counterpart is needed: the change is mobile-only and adds no new strings.

**Commit:** `docs: record the alerts screen UI cleanup in the changelog`

---

## Out of scope (tracked separately, do not do in this change)

1. **Typed alert routing.** `_navigateAlert` / `_getActionType` route on Arabic
   substrings (`alerts_screen.dart:151-205`, `:207-238`), which silently fails
   for English content (`docs/domain/ui-and-mobile.md:98-102`). The durable fix is
   a typed field on the `alerts` row. This needs a migration + a web change and
   owner sign-off.
2. **The `POST {API_BASE_URL}/api/alerts` call** (`alerts_screen.dart:125-131`)
   has no test — it needs a session and a real endpoint. `docs/domain/ui-and-mobile.md:104-113`
   notes that the origin is configurable (default `https://fajrak.com`) but the
   route writes through `createAdminClient()`, so local builds still write
   production rows. Rule 13 of the repo's critical rules
   applies if a mock is ever written for it: verify against the live endpoint
   and paste the real response shape + verification date next to the fixture.
3. **Per-item `ValueListenableBuilder` read state** (a true scoped rebuild
   instead of one screen-level `setState`). Measurable only after T8's element
   assertion exists; it changes `AlertListItem`'s public API.
4. **`alerts_ai_generate_short`** (`en.json:340`, `ar.json:343`) is referenced by
   no code — dead i18n key. Removing it is a separate i18n cleanup (both
   locales, per the parity rule).

---

## Appendix — file map

| File | Change | Task |
|---|---|---|
| `mobile/fajrak_flutter/lib/services/alerts_service.dart` | NEW — throwing stub (0a) → real queries | 0, 2 |
| `mobile/fajrak_flutter/lib/screens/alerts/alerts_screen.dart` | `service` parameter (0b), guard moved inside the `try` (0d), seam + wiring (2), header removal (3), FAB removal (4) | 0, 2, 3, 4 |
| `mobile/fajrak_flutter/lib/widgets/alerts/alert_list_item.dart` | `Key('alert-unread-dot')` | 0 |
| `mobile/fajrak_flutter/test/widgets/alerts/alerts_screen_test.dart` | 8 stubs → 8 real tests + harness (1); drop the `AlertHeader` import + assertion (3) | 1, 3 |
| `mobile/fajrak_flutter/lib/widgets/alerts/alert_header.dart` | DELETED | 3 |
| `mobile/fajrak_flutter/lib/widgets/alerts/ai_generator_card.dart` | `AIGeneratorFAB` deleted | 4 |
| `CHANGELOG.md` | `[Unreleased]` entry | 7 |

## Appendix — commit list

| # | Commit | Task |
|---|---|---|
| 0 | `test(mobile): add empty alerts service skeleton for TDD` | 0 |
| 1 | `test(mobile): replace alerts placeholder tests with real widget tests` | 1 |
| 2 | `refactor(mobile): extract AlertsService and fix the alerts loading spinner` | 2 |
| 3 | `refactor(mobile): drop the duplicate unread counter from the alerts screen` | 3 |
| 4 | `feat(mobile): use a single AI banner for alert generation` | 4 |
| 5 | *(none — verification only)* | 5 |
| 6 | *(none — verification only)* | 6 |
| 7 | `docs: record the alerts screen UI cleanup in the changelog` | 7 |

---

## Correction log

Two corrections were raised against the first draft of this plan. Both are
resolved in **Amendment 1** above.

### Correction A — "the Flutter test count is wrong (177/186 vs the real number)"

**Resolved.** The real runtime count is **206** (`flutter test` →
`00:23 +206: All tests passed!`, measured 2026-10-22; cross-checked with
`flutter test --reporter=json`: 246 `testStart` events = 206 real tests + 24
`loading <file>` + 8 `(setUpAll)` + 8 `(tearDownAll)` pseudo-events).

**CLAUDE.md is stale, and the tests were added after it was written** — both are
true, and the arithmetic proves it:

| Commit | When | `test(`/`testWidgets(` declarations | Runtime count | Doc written |
|---|---|---|---|---|
| `9a700cfb` | 2026-10-18 13:40 | 145 | **177** | `CONTRIBUTING.md` "177 tests" — correct that day |
| `0a6899f9` | 2026-10-18 23:20 | 154 | **186** | `CLAUDE.md` "186 tests" — correct that day |
| `8d2f28cc` → HEAD | 2026-10-20 → now | 174 | **206** | `PROJECT_CONTEXT.md` "206 Flutter tests" — correct |

The offset between declarations and runtime is a constant **+32** at every one of
those commits, because `test/i18n_keys_test.dart` generates 32 tests at runtime
from the i18n key lists. Every number in every doc was therefore accurate on the
day it was written; `CLAUDE.md` (186) and `CONTRIBUTING.md` (177) simply went
stale when 20 tests landed on 2026-10-19/20 (see the table in Task 6). The
plan now quotes **206** and no longer repeats the stale numbers.

### Correction B — "Task 1 must be a real RED, not a compile failure"

**Resolved.** **Task 0** was added: it ships the `AlertsService` stub (all five
methods `throw UnimplementedError('not implemented yet — Task 2')`), the
`AlertsScreen({super.key, this.service})` parameter (**accepted, not wired** —
the screen keeps its old direct Supabase calls), and the
`Key('alert-unread-dot')` on the unread dot. Task 1 therefore compiles and
produces **eight runtime assertion failures**, each with a matcher message that
names what is missing (the expected messages are tabulated in Task 1).

**One addition beyond the literal spec — needs approval: Task 0d.** Moving the
`user == null` guard inside `_load()`'s `try` (three lines, no behaviour change
to the data path) is required, because in the RED run the screen is still not
wired to the fake → `auth.currentUser` is `null` → the guard fires before the
`try/finally` → `_loading` stays `true` → the screen shows a
`CircularProgressIndicator` forever → every `pumpAndSettle()` blocks for the
framework's 10-minute timeout and the RED run takes ~80 minutes and reports
`pumpAndSettle timed out` instead of a matcher message. With 0d, the screen
renders its empty state and all eight tests fail with the messages listed in
Task 1. The edit is also a genuine bug fix for signed-out users, and Task 2
rewrites the method around the service anyway.

### Correction C — the plan's own T7 snippet does not compile (found 2026-10-22)

**Resolved in the test file.** Task 1's first run failed to *load*:

```
test/widgets/alerts/alerts_screen_test.dart:303:23: Error: Member not found: 'rtl'.
        TextDirection.rtl,
```

Cause: `package:easy_localization` re-exports `package:intl`, whose
`TextDirection` is a **class** with `LTR`/`RTL` constants
(`intl-0.20.3/lib/src/intl/text_direction.dart:12`). It shadows `dart:ui`'s
`TextDirection` **enum** (`ltr`/`rtl`) — the type `Directionality.of()` returns.
So the plan's literal `TextDirection.rtl` resolved to intl's class and the
lowercase member did not exist.

Fix (two tokens, no change to any assertion):

```dart
import 'package:easy_localization/easy_localization.dart' hide TextDirection;
```

`TextDirection` then resolves to `dart:ui`'s enum, the same type
`Directionality.of()` returns, so T7's comparison is type-correct.

Second, smaller deviation: the plan's fake declares `List<Map<String, dynamic>>
_alerts;` (mutable) — `flutter analyze` flags it (`prefer_final_fields`). It is
never reassigned, so it is declared `final`. No behavioural difference.

Both edits are in the test file only; `lib/` is untouched.

### The real RED messages (Task 1, commit `dd8a6417`)

`flutter test test/widgets/alerts/alerts_screen_test.dart` → `00:02 +0 -8:
Some tests failed.` — eight **runtime** failures, no compile error, no
`pumpAndSettle` timeout, nothing passing. In T1..T8 order:

| Test | Real RED message |
|---|---|
| T1 badges | `Expected: exactly 3 matching candidates` — `Found 0 widgets with text "1" descending from widgets with type "AlertFilterTabs": []` |
| T2 swipe | `Expected: exactly one matching candidate` — `Found 0 widgets with type "Dismissible": []` |
| T3 icons | `Expected: exactly one matching candidate` — `Found 0 widgets with icon "IconData(U+0F4AF)": []` (`Icons.warning_outlined`) |
| T4 buttons | `Expected: exactly one matching candidate` — `Found 0 widgets with text "View Details": []` |
| T5 banner | `Expected: no matching candidates` — `Found 1 widget with type "AIGeneratorFAB": [AIGeneratorFAB]` |
| T6 sliver | `Expected: exactly one matching candidate` — `Found 0 widgets with type "SliverList": []` |
| T7 RTL | `Bad state: No element` (`tester.widget<Text>(find.text('تجاوزت ميزانية البنزين'))` — the Arabic row does not exist yet) |
| T8 mark read | `RangeError (index): Index out of range: no indices are valid: 0` (`tester.element(find.byType(AlertListItem).at(0))` — no row exists yet) |

Two notes against the RED table predicted in Task 1:

1. **T1 fails on the badge assertion, not on `AlertHeader`.** The table assumed
   `find.byType(AlertHeader)` would fail first ("Expected 0 widgets, found 1").
   It does not: in the RED state `unreadCount == 0`, so `AlertHeader.build`
   returns `SizedBox.shrink()` (`alert_header.dart:17`) and the finder does not
   match it. The duplicate pill only becomes visible once Task 2 wires the
   service and the fixture's 1 unread alert reaches the header — which is
   exactly where Task 3 removes it.
2. **T7/T8 fail with a lookup error, not a matcher message.** The plan's code
   order puts `tester.widget`/`tester.element` first, and both throw
   `Bad state: No element` / `RangeError` before any `expect` runs. The
   assertions themselves are unchanged, so they still gate Task 2/3.

Full suite: `flutter test` → `00:30 +198 -8: Some tests failed.` — 206 tests
total, unchanged count (8 stubs replaced by 8 real tests), the only failures
being the eight intentional RED ones.

### Correction D — the screen keeps one `Supabase.instance.client` call after Task 2 (found 2026-10-22)

**Ruled: the line stays.** After Task 2 (commit `2f883a81`),
`grep -n "Supabase.instance.client" lib/screens/alerts/alerts_screen.dart`
returns exactly one hit:

```
116:      final session = Supabase.instance.client.auth.currentSession;
```

It is **not** a data query. It is the **auth-token retrieval** inside
`_generateAlerts()` — the bearer token for the `POST https://fajrak.com/api/alerts`
call — which is already tracked as **out of scope #2**. The five data queries
(`fetchAlerts`, `markRead`, `markAllRead`, `deleteAlert`, `deleteAll`) moved
verbatim into `AlertsService`, and `grep -n "currentUser"` on the screen is now
empty (exit 1).

The screen therefore performs **no direct data access** any more; it only reads
the current session to sign an outbound AI request. Moving that call into the
service would add a sixth method to the five-method `AlertsService` contract —
a scope expansion this plan does not authorise — so the line stays where it is
and is recorded here instead.

### Correction E — T5's "no FAB" is a structural guarantee, not a runtime one (found 2026-10-22)

After Task 4, `AIGeneratorFAB` no longer exists, so no test can "find" it. T5
now asserts that the banner exists in both populated and empty states. The
"never a floating button" claim is guaranteed by the deletion of the class
(verified by grep AIGeneratorFAB → empty). A runtime assertion on
FloatingActionButton was considered and rejected — a future subclass would
slip past find.byType, and the structural guarantee is stronger.
