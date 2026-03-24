import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
      // المستخدم وافق على الإشعارات - نقوم بحفظ الرمز
      await saveToken();
    }

    // التعاقد مع تحديث الرمز (FCM Token Refresh)
    messaging.onTokenRefresh.listen((token) async {
      await saveToken(newToken: token);
    });

    // التعامل مع الإشعارات عندما يكون التطبيق في المقدمة (Foreground)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // هنا يمكن عرض تنبيه داخلي أو استخدام flutter_local_notifications
    });
  }

  static Future<void> saveToken({String? newToken}) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final token = newToken ?? await FirebaseMessaging.instance.getToken();
      if (token == null) return;

      // حفظ الرمز في جدول البروفايل الخاص بالمستخدم
      await Supabase.instance.client
          .from('profiles')
          .update({'fcm_token': token})
          .eq('id', user.id);
          
    } catch (e) {
      // تفادي تعطيل التطبيق في حال فشل حفظ الرمز
    }
  }

  static Future<void> showNotification(RemoteMessage message) async {
    // Firebase يتعامل مع الإشعارات في الـ Background/Terminated تلقائياً
    // طالما أن الـ Payload يحتوي على كائن 'notification'
  }
}
