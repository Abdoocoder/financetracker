import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import '../main.dart';
import '../utils/error_handler.dart';
import '../utils/route_normalizer.dart';

// Top-level background handler for Firebase Messaging
// Must be a top-level function (not a static method) to work on Android
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage? message) async {
  // Background messages are handled by the system tray on Android
  // We just need to ensure the notification is shown
  if (kIsWeb) return;
  
  final notification = message?.notification;
  if (notification == null) return;

  // For background messages, we don't have access to the full FlutterLocalNotifications
  // The system will handle showing the notification via the FCM service
  // This handler just ensures the message is received
  debugPrint('[NotificationService] Background message received: ${notification.title}');
}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static String? _cachedFcmToken;

  // Static getters for Firebase Messaging handlers
  static BackgroundMessageHandler get onBackgroundMessage =>
      _firebaseMessagingBackgroundHandler;

  static void Function(RemoteMessage) get onForegroundMessage =>
      (message) => showNotification(message);

  static FutureOr<void> Function(RemoteMessage?) get onMessageOpenedApp =>
      (message) => handleMessage(message);

  // 1. القنوات المتعددة (Notification Channels)
  static const AndroidNotificationChannel _budgetChannel =
      AndroidNotificationChannel(
    'budget_alerts', // ID
    'Budget Alerts', // Name
    description: 'تنبيهات تجاوز الميزانية',
    importance: Importance.high,
    playSound: true,
  );

  static const AndroidNotificationChannel _debtChannel =
      AndroidNotificationChannel(
    'debt_reminders', // ID
    'Debt Reminders', // Name
    description: 'تذكير بمواعيد الأقساط والديون',
    importance: Importance.max,
    playSound: true,
  );

  static const AndroidNotificationChannel _goalChannel =
      AndroidNotificationChannel(
    'saving_goals', // ID
    'Saving Goals', // Name
    description: 'إنجازات أهداف الادخار',
    importance: Importance.defaultImportance,
    playSound: true,
  );

  static Future<void> initialize() async {
    // Web push is handled by the Next.js PWA. Initializing
    // flutter_local_notifications here registers its own service worker
    // (skipWaiting + clients.claim) over Flutter's, which drops the debug
    // connection at startup. So on web we skip local-notifications entirely.
    if (kIsWeb) return;

    final messaging = FirebaseMessaging.instance;

    // طلب أذونات الإشعارات
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      await saveToken();
    }

    // تهيئة الإشعارات المحلية
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings =
        InitializationSettings(android: androidInit, iOS: iosInit);

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (details) {
        if (details.payload != null) {
          final message = RemoteMessage(data: {'url': details.payload!});
          handleMessage(message);
        }
      },
      onDidReceiveBackgroundNotificationResponse: null,
    );

    // تسجيل القنوات على أندرويد
    final androidPlugin =
        _localNotifications.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(_budgetChannel);
      await androidPlugin.createNotificationChannel(_debtChannel);
      await androidPlugin.createNotificationChannel(_goalChannel);
    }

    // الاستماع لحالة تسجيل الدخول لحفظ التوكن فوراً
    // Debounce: only save if token actually changed to avoid concurrent refresh races.
    String? lastSavedToken;
    Supabase.instance.client.auth.onAuthStateChange.listen((data) async {
      if (data.event == AuthChangeEvent.signedIn ||
          data.event == AuthChangeEvent.tokenRefreshed) {
        // Await saveToken to prevent concurrent calls; debounce by checking if token changed
        // Token is obtained via onRegistered stream; if not yet available, saveToken will use cached token
        if (_cachedFcmToken != null && _cachedFcmToken != lastSavedToken) {
          lastSavedToken = _cachedFcmToken;
          await saveToken(newToken: _cachedFcmToken);
        }
      }
    });

    // التعامل مع الإشعارات في المقدمة (Foreground)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      showNotification(message);
    });

    messaging.onRegistered.listen((token) async {
      _cachedFcmToken = token;
      await saveToken(newToken: token);
    });

    // Fire-and-forget: do NOT await register() — it can hang forever
    // on Android when notification permission is not yet granted.
    unawaited(
      messaging.register().catchError((Object e) {
        if (kDebugMode) {
          debugPrint('[NotificationService] register() failed: $e');
        }
      }),
    );
  }

  static Future<void> showNotification(RemoteMessage message) async {
    // On web the FCM service worker / Next.js PWA handles notifications.
    if (kIsWeb) return;

    final notification = message.notification;
    if (notification == null) return;

    final category = message.data['category'] ?? 'default';

    // تحديد القناة بناءً على الفئة
    AndroidNotificationChannel selectedChannel;
    switch (category) {
      case 'BudgetAlert':
        selectedChannel = _budgetChannel;
        break;
      case 'DebtReminder':
        selectedChannel = _debtChannel;
        break;
      case 'SavingGoal':
        selectedChannel = _goalChannel;
        break;
      default:
        selectedChannel =
            const AndroidNotificationChannel('default', 'Default');
    }

    await _localNotifications.show(
      id: notification.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          selectedChannel.id,
          selectedChannel.name,
          channelDescription: selectedChannel.description,
          importance: selectedChannel.importance,
          priority: Priority.high,
          styleInformation: BigTextStyleInformation(notification.body ?? ''),
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: message.data['url'],
    );
  }

  static void handleMessage(RemoteMessage? message) {
    if (message == null) return;
    final url = message.data['url'] as String?;
    if (url == null) return;

    final nav = navigatorKey.currentState;
    if (nav == null) return;

    // The backend sends web URLs (`/dashboard/alerts`, `/dashboard?quick=1`,
    // `/budgets`). The shared normaliser owns that mapping — do not re-implement
    // per-screen heuristics here (the previous version sent every `/budgets`
    // push to the Accounts tab).
    final normalized = normalizeRouteWithArgs(url);
    nav.pushNamed(
      normalized.route,
      arguments: normalized.arguments.isEmpty ? null : normalized.arguments,
    );
  }

  static Future<void> saveToken({String? newToken}) async {
    // Web push is handled by the Next.js PWA — nothing to do on Flutter web.
    if (kIsWeb) return;
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        if (kDebugMode) {
          debugPrint('[NotificationService] saveToken: no logged-in user');
        }
        return;
      }

      final token = newToken ?? _cachedFcmToken;

      if (token == null) {
        return;
      }

      if (kDebugMode) {
        debugPrint(
            '[NotificationService] Saving FCM token: ${token.substring(0, 20)}...');
      }

      try {
        await Supabase.instance.client
            .from('push_subscriptions')
            .upsert({
              'user_id': user.id,
              'endpoint': 'fcm:$token',
              'p256dh': 'fcm',
              'auth': 'fcm',
            }, onConflict: 'user_id,endpoint');
      } on SocketException catch (e) {
        // Network interruption (VPN disconnect, Errno 103, etc.) — log locally
        // and return silently. This is a background sync that will retry on the
        // next auth state change (signedIn/tokenRefreshed). Do NOT send to Sentry.
        if (kDebugMode) {
          debugPrint('[NotificationService] Network error saving FCM token (will retry): $e');
        }
        return;
      } on PostgrestException catch (e) {
        // PostgrestException can wrap network errors. Check if it's network-related.
        final msg = e.toString().toLowerCase();
        if (msg.contains('socketexception') ||
            msg.contains('connection abort') ||
            msg.contains('connection refused') ||
            msg.contains('connection reset') ||
            msg.contains('network is unreachable') ||
            msg.contains('failed host lookup') ||
            msg.contains('no address associated') ||
            msg.contains('timeout')) {
          if (kDebugMode) {
            debugPrint('[NotificationService] Network error (Postgrest) saving FCM token (will retry): $e');
          }
          return;
        }
        // Non-network PostgrestException (e.g., RLS, schema) — report to Sentry.
        ErrorHandler.handle(e,
            developerMessage: '[NotificationService] Postgrest error saving FCM token: $e');
      } catch (e, st) {
        // Check if it's a network error wrapped in another exception type.
        final msg = e.toString().toLowerCase();
        if (msg.contains('socketexception') ||
            msg.contains('connection abort') ||
            msg.contains('connection refused') ||
            msg.contains('connection reset') ||
            msg.contains('network is unreachable') ||
            msg.contains('failed host lookup') ||
            msg.contains('no address associated') ||
            msg.contains('timeout') ||
            msg.contains('clientexception')) {
          if (kDebugMode) {
            debugPrint('[NotificationService] Network error (wrapped) saving FCM token (will retry): $e');
          }
          return;
        }
        // Other unexpected errors (e.g., RLS policy, schema issues) — report via
        // ErrorHandler so they surface in Sentry for investigation.
        ErrorHandler.handle(e,
            st: st,
            developerMessage: '[NotificationService] Supabase upsert error: $e');
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[NotificationService] saveToken error: $e');
    }
  }
}
