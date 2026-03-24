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
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/main_screen.dart';
import 'services/notification_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await NotificationService.showNotification(message);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  // Load environment variables from .env file
  // For web, it looks in web/.env, for mobile it looks in project root
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    // .env file not found - continue without it
    if (kDebugMode) {
      print('Note: .env file not found, using default configuration');
    }
  }

  // Initialize Firebase with platform-specific options
  if (kIsWeb) {
    // Web configuration
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: dotenv.env['FLUTTER_FIREBASE_API_KEY'] ?? '',
        appId: dotenv.env['FLUTTER_FIREBASE_APP_ID'] ?? '',
        messagingSenderId: dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '',
        projectId: dotenv.env['FLUTTER_FIREBASE_PROJECT_ID'] ?? '',
      ),
    );
  } else {
    // Android/iOS configuration (uses google-services.json)
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  }

  // Get Supabase credentials from environment variables
  final supabaseUrl = dotenv.env['SUPABASE_URL'] ?? '';
  final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  // If credentials are empty, try to continue anyway for development
  // (some platforms may have env vars set externally)
  if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
    if (kDebugMode) {
      // In debug mode, show warning but continue if values exist in .env file
      print('Warning: SUPABASE_URL or SUPABASE_ANON_KEY not found in .env');
      print('App may not function correctly without valid credentials.');
    }
  }

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );

  await NotificationService.initialize();
  await EasyLocalization.ensureInitialized();

  // Global Error Handling
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    ErrorHandler.handle(details.exception, developerMessage: 'FlutterError: ${details.library}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    ErrorHandler.handle(error, developerMessage: 'PlatformError');
    return true;
  };

  final appState = AppState();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('ar'), Locale('en')],
      path: 'assets/i18n',
      fallbackLocale: const Locale('ar'),
      child: ChangeNotifierProvider.value(
        value: appState,
        child: const FajrakApp(),
      ),
    ),
  );
}

class FajrakApp extends StatelessWidget {
  const FajrakApp({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return MaterialApp(
      title: 'فجرك',
      debugShowCheckedModeBanner: false,
      theme: _buildTheme(appState.isDarkMode ? Brightness.dark : Brightness.light),
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
      },
    );
  }

  ThemeData _buildTheme(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    
    final primary = const Color(0xFF3B7EF6);
    final secondary = const Color(0xFF10B981);
    final error = const Color(0xFFEF4444);
    
    final scaffoldBg = isDark ? const Color(0xFF070B14) : const Color(0xFFF8FAFC);
    final surface = isDark ? const Color(0xFF0F1629) : Colors.white;
    final onSurface = isDark ? Colors.white : const Color(0xFF0F172A);
    final onSurfaceVariant = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final outlineVariant = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: scaffoldBg,
      textTheme: Typography.material2021().black.apply(
        fontFamily: 'Cairo',
        fontFamilyFallback: const ['Cairo'],
      ),
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
        hintStyle: TextStyle(color: isDark ? const Color(0xFF475569) : const Color(0xFF94A3B8)),
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
