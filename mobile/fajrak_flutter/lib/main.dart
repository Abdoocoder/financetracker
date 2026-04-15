import 'utils/app_colors.dart';
import 'package:flutter/material.dart';
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

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // NotificationService handles the local display logic if needed
  await NotificationService.showNotification(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  // Only set icon brightness — avoid setStatusBarColor / setNavigationBarColor
  // which are deprecated in Android 15 (API 35). Transparency is handled by
  // enableEdgeToEdge() in MainActivity via WindowInsetsController.
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  // Global Error Handling — set up before anything async
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    ErrorHandler.handle(details.exception, developerMessage: 'FlutterError: ${details.library}');
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorHandler.handle(error, developerMessage: 'PlatformError');
    return true;
  };

  // Load .env + EasyLocalization in parallel (neither depends on the other)
  await Future.wait([
    dotenv.load(fileName: '.env').catchError((_) {}),
    EasyLocalization.ensureInitialized(),
  ]);

  // Firebase init — must happen after dotenv (needs env vars on web)
  if (kIsWeb) {
    final projectId = dotenv.env['FLUTTER_FIREBASE_PROJECT_ID'] ?? 'fajrak-f7df1';
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: dotenv.env['FLUTTER_FIREBASE_API_KEY'] ?? '',
        appId: dotenv.env['FLUTTER_FIREBASE_APP_ID'] ?? '',
        messagingSenderId: dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '',
        projectId: projectId,
        authDomain: '$projectId.firebaseapp.com',
        storageBucket: '$projectId.appspot.com',
      ),
    );
  } else {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }

  // Supabase init — can run after Firebase since both are now sequential only
  // where necessary; both use different services so order doesn't matter here.
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL'] ?? '',
    anonKey: dotenv.env['SUPABASE_ANON_KEY'] ?? '',
  );

  // Initialize local encrypted database.
  // Key: user's auth session token (or anonymous key before login).
  // The DB is re-opened with the correct key after the user signs in
  // (handled in AuthService / SplashScreen).
  final initialKey = Supabase.instance.client.auth.currentSession?.accessToken
      ?? dotenv.env['SUPABASE_ANON_KEY']
      ?? 'fajrak_default_key';
  await AppDatabase.initialize(encryptionKey: initialKey);

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

  static final ThemeData _lightTheme = FajrakApp._buildTheme(Brightness.light);
  static final ThemeData _darkTheme = FajrakApp._buildTheme(Brightness.dark);

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

  static ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    
    final primary = AppColors.primary;
    final secondary = AppColors.success;
    final error = AppColors.error;
    
    final scaffoldBg = isDark ? const Color(0xFF070B14) : const Color(0xFFF8FAFC);
    final surface = isDark ? AppColors.surface0 : Colors.white;
    final onSurface = isDark ? Colors.white : AppColors.surface1;
    final onSurfaceVariant = isDark ? AppColors.textMuted : AppColors.textSecondary;
    final outlineVariant = isDark ? AppColors.surface2 : const Color(0xFFE2E8F0);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: scaffoldBg,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: primary,
        onPrimary: Colors.white,
        secondary: secondary,
        onSecondary: Colors.white,
        error: error,
        onError: Colors.white,
        surface: surface,
        onSurface: onSurface,
        onSurfaceVariant: onSurfaceVariant,
        outlineVariant: outlineVariant,
      ),
      dividerColor: outlineVariant,
      fontFamily: 'Cairo',
      fontFamilyFallback: const [
        'Roboto',
        'Noto Color Emoji',
        'Noto Sans Arabic',
        'sans-serif',
      ],
      appBarTheme: AppBarTheme(
        backgroundColor: scaffoldBg,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: onSurface),
        titleTextStyle: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: primary),
        ),
        labelStyle: TextStyle(color: onSurfaceVariant),
        hintStyle: TextStyle(color: isDark ? AppColors.textTertiary : AppColors.textMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
