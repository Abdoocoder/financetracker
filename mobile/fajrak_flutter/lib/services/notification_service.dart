import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../main.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _androidChannel = AndroidNotificationChannel(
    'fajrak_notifications', // ID
    'Fajrak Notifications', // Name
    description: 'إشعارات تطبيق فجرك المالية',
    importance: Importance.high,
    playSound: true,
    enableVibration: true,
  );

  static Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    // طلب أذونات الإشعارات (مهم جداً لنظام iOS و Android 13+)
    NotificationSettings settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      // المستخدم وافق على الإشعارات - نقوم بحفظ الرمز
      await saveToken();
    }

    // تهيئة الإشعارات المحلية (للعرض في المقدمة)
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: androidInit, iOS: iosInit);

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (details) {
        if (details.payload != null) {
          final message = RemoteMessage(data: {'url': details.payload!});
          handleMessage(message);
        }
      },
    );

    // إنشاء القناة على أندرويد
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // التعاقد مع تحديث الرمز (FCM Token Refresh)
    messaging.onTokenRefresh.listen((token) async {
      await saveToken(newToken: token);
    });

    // التعامل مع الإشعارات عندما يكون التطبيق في المقدمة (Foreground)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification == null) return;

      _localNotifications.show(
        id: notification.hashCode,
        title: notification.title,
        body: notification.body,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _androidChannel.id,
            _androidChannel.name,
            channelDescription: _androidChannel.description,
            icon: '@mipmap/ic_launcher',
          ),
        ),
        payload: message.data['url'],
      );
    });
  }

  // Tab indices in MainScreen: 0=More, 1=Budgets, 2=Debts, 3=Transactions, 4=Dashboard
  static void handleMessage(RemoteMessage message) {
    final url = message.data['url'] as String?;
    if (url == null) return;

    final nav = FajrakApp.navigatorKey.currentState;
    if (nav == null) return;

    int tab = 4; // default: Dashboard
    if (url.contains('/dashboard/transactions')) tab = 3;

    nav.pushNamed('/main', arguments: {'tab': tab});
  }

  static Future<void> saveToken({String? newToken}) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final token = newToken ?? await FirebaseMessaging.instance.getToken();
      if (token == null) return;

      final endpoint = 'fcm:$token';

      // حفظ الرمز في جدول push_subscriptions ليتوافق مع نظام تطبيق الويب
      await Supabase.instance.client
          .from('push_subscriptions')
          .upsert({
            'user_id': user.id,
            'endpoint': endpoint,
            'p256dh': 'fcm',
            'auth': 'fcm',
          }, onConflict: 'user_id,endpoint');
          
    } catch (e) {
      // تفادي تعطيل التطبيق في حال فشل حفظ الرمز
    }
  }

  static Future<void> showNotification(RemoteMessage message) async {
    // Firebase يتعامل مع الإشعارات في الـ Background/Terminated تلقائياً
    // طالما أن الـ Payload يحتوي على كائن 'notification'
  }
}
