import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'utils/error_handler.dart';
import 'package:provider/provider.dart';
import 'app_state.dart';
import 'providers/dashboard_layout_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/main_screen.dart';
import 'screens/settings/notification_settings_screen.dart';
import 'services/notification_service.dart';
import 'database/app_database.dart';
import 'core/theme/app_theme.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // NotificationService handles the local display logic if needed
  await NotificationService.showNotification(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);

  // Global Error Handling — set up before anything async
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    ErrorHandler.handle(details.exception, developerMessage: 'FlutterError: ${details.library}');
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorHandler.handle(error, developerMessage: 'PlatformError');
    return true;
  };

  // Load .env + EasyLocalization + intl Arabic locale in parallel
  await Future.wait([
    dotenv.load(fileName: '.env').catchError((_) {}),
    EasyLocalization.ensureInitialized(),
    initializeDateFormatting('ar', null),
  ]);

  // Firebase + Supabase in parallel — they are independent of each other.
  // Both need dotenv (loaded above), but not each other.
  final firebaseFuture = kIsWeb
      ? Firebase.initializeApp(
          options: FirebaseOptions(
            apiKey: dotenv.env['FLUTTER_FIREBASE_API_KEY'] ?? '',
            appId: dotenv.env['FLUTTER_FIREBASE_APP_ID'] ?? '',
            messagingSenderId: dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '',
            projectId: dotenv.env['FLUTTER_FIREBASE_PROJECT_ID'] ?? 'fajrak-f7df1',
            authDomain: '${dotenv.env['FLUTTER_FIREBASE_PROJECT_ID'] ?? 'fajrak-f7df1'}.firebaseapp.com',
            storageBucket: '${dotenv.env['FLUTTER_FIREBASE_PROJECT_ID'] ?? 'fajrak-f7df1'}.appspot.com',
          ),
        )
      : Firebase.initializeApp();

  await Future.wait([
    firebaseFuture,
    Supabase.initialize(
      url: dotenv.env['SUPABASE_URL'] ?? '',
      anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
    ),
  ]);

  if (!kIsWeb) {
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }

  // Initialize local encrypted database.
  // Key: user's auth session token (or anonymous key before login).
  // The DB is re-opened with the correct key after the user signs in
  // (handled in AuthService / SplashScreen).
  if (!kIsWeb) {
    final initialKey = Supabase.instance.client.auth.currentSession?.accessToken
        ?? dotenv.env['SUPABASE_ANON_KEY']
        ?? 'fajrak_default_key';
    await AppDatabase.initialize(encryptionKey: initialKey);
  }

  final appState = AppState();

  FirebaseMessaging.onMessage.listen((_) => appState.loadUnreadAlerts());
  FirebaseMessaging.onMessageOpenedApp.listen((msg) {
    NotificationService.handleMessage(msg);
    appState.loadUnreadAlerts();
  });
  FirebaseMessaging.instance.getInitialMessage().then((msg) {
    if (msg != null) {
      NotificationService.handleMessage(msg);
      appState.loadUnreadAlerts();
    }
  });

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('ar'), Locale('en')],
      path: 'assets/i18n',
      fallbackLocale: const Locale('ar'),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: appState),
          ChangeNotifierProvider(create: (_) => DashboardLayoutProvider()),
        ],
        child: const FajrakApp(),
      ),
    ),
  );

  // Initialize notifications AFTER runApp — keeps startup fast.
  // Fire-and-forget: no await, doesn't block the first frame.
  NotificationService.initialize();
}

class FajrakApp extends StatelessWidget {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  const FajrakApp({super.key});

  static final ThemeData _lightTheme = AppTheme.light;
  static final ThemeData _darkTheme  = AppTheme.dark;

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return MaterialApp(
      title: 'فجرك',
      navigatorKey: navigatorKey,
      debugShowCheckedModeBanner: false,
      theme: _lightTheme,
      darkTheme: _darkTheme,
      themeMode: appState.themeMode,
      locale: context.locale, // Use context.locale from EasyLocalization
      supportedLocales: context.supportedLocales,
      localizationsDelegates: context.localizationDelegates,
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/register': (context) => const RegisterScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/main': (context) => const MainScreen(),
        '/forgot-password': (context) => const ForgotPasswordScreen(),
        '/reset-password': (context) => const ResetPasswordScreen(),
        '/settings/notifications': (context) => const NotificationSettingsScreen(),
      },
    );
  }
}
