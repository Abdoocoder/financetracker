import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import '../main.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

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
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      if (data.event == AuthChangeEvent.signedIn ||
          data.event == AuthChangeEvent.tokenRefreshed) {
        saveToken();
      }
    });

    // التعامل مع الإشعارات في المقدمة (Foreground)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      showNotification(message);
    });

    messaging.onTokenRefresh.listen((token) async {
      await saveToken(newToken: token);
    });
  }

  static Future<void> showNotification(RemoteMessage message) async {
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

  static void handleMessage(RemoteMessage message) {
    final url = message.data['url'] as String?;
    if (url == null) return;

    final nav = FajrakApp.navigatorKey.currentState;
    if (nav == null) return;

    int tab = 4; // default: Dashboard
    if (url.contains('/dashboard/transactions')) tab = 3;
    if (url.contains('/budgets')) tab = 1;
    if (url.contains('/debts')) tab = 2;

    nav.pushNamed('/main', arguments: {'tab': tab});
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

      final token = newToken ?? await FirebaseMessaging.instance.getToken();

      if (token == null) {
        if (kDebugMode) {
          debugPrint('[NotificationService] saveToken: FCM token is null');
        }
        return;
      }

      if (kDebugMode) {
        debugPrint(
            '[NotificationService] Saving FCM token: ${token.substring(0, 20)}...');
      }

      final error = await Supabase.instance.client
          .from('push_subscriptions')
          .upsert({
            'user_id': user.id,
            'endpoint': 'fcm:$token',
            'p256dh': 'fcm',
            'auth': 'fcm',
          }, onConflict: 'user_id,endpoint')
          .then((_) => null)
          .catchError((e) => e);

      if (error != null && kDebugMode) {
        debugPrint('[NotificationService] Supabase upsert error: $error');
      }
    } catch (e) {
      if (kDebugMode) debugPrint('[NotificationService] saveToken error: $e');
    }
  }
}
