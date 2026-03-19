import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // الإشعارات تظهر تلقائياً في الـ foreground عبر Firebase
    });
  }

  static Future<void> showNotification(RemoteMessage message) async {
    // Firebase يتعامل مع الإشعارات في الـ background تلقائياً
  }
}
