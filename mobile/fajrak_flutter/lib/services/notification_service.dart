import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  static Future<void> initialize() async {
    const AndroidInitializationSettings android =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const InitializationSettings settings =
        InitializationSettings(android: android);
    await _notifications.initialize(settings);

    await _createChannel();
    await _requestPermission();
    await _setupFCM();
  }

  static Future<void> _createChannel() async {
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'fajrak_notifications',
      'إشعارات فجرك',
      description: 'إشعارات التطبيق المالي',
      importance: Importance.high,
    );
    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  static Future<void> _requestPermission() async {
    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  static Future<void> _setupFCM() async {
    final messaging = FirebaseMessaging.instance;
    final token = await messaging.getToken();
    if (token != null) await _saveToken(token);

    messaging.onTokenRefresh.listen(_saveToken);

    FirebaseMessaging.onMessage.listen((message) {
      showNotification(message);
    });
  }

  static Future<void> _saveToken(String token) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      await Supabase.instance.client.from('push_subscriptions').upsert({
        'user_id': user.id,
        'endpoint': 'fcm:$token',
        'p256dh': 'flutter',
        'auth': 'flutter',
      });
    } catch (_) {}
  }

  static Future<void> showNotification(RemoteMessage message) async {
    final title = message.notification?.title ?? message.data['title'] ?? 'فجرك';
    final body = message.notification?.body ?? message.data['message'] ?? '';

    await _notifications.show(
      message.hashCode,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'fajrak_notifications',
          'إشعارات فجرك',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }
}
