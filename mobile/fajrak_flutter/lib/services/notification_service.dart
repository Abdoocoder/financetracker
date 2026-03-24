import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
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
      // المستخدم وافق على الإشعارات
    }

    // التعامل مع الإشعارات عندما يكون التطبيق في المقدمة (Foreground)
    // ملاحظة: في Android، الإشعارات لا تظهر كـ "Banner" تلقائياً في المقدمة
    // إلا إذا تم استخدام حزمة flutter_local_notifications
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // هنا يمكن عرض تنبيه داخلي أو استخدام flutter_local_notifications
    });
  }

  static Future<void> showNotification(RemoteMessage message) async {
    // Firebase يتعامل مع الإشعارات في الـ Background/Terminated تلقائياً
    // طالما أن الـ Payload يحتوي على كائن 'notification'
  }
}
