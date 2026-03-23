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
import 'package:flutter/foundation.dart' show kIsWeb;

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
      options: const FirebaseOptions(
        apiKey: 'AIzaSyBPk_y0RKpYsWe31u_oksx6G6woOhj3Ypw',
        appId: '1:621650342599:web:48c4fa949ef940c4b844e2',
        messagingSenderId: '621650342599',
        projectId: 'fajrak-f7df1',
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
    url: supabaseUrl.isNotEmpty ? supabaseUrl : 'https://placeholder.supabase.co',
    anonKey: supabaseAnonKey.isNotEmpty ? supabaseAnonKey : 'placeholder-key',
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
      theme: appState.isDarkMode ? _buildDarkTheme() : _buildLightTheme(),
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

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF070B14),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF3B7EF6),
        secondary: Color(0xFF10B981),
        surface: Color(0xFF0F1629),
        onSurface: Colors.white,
        onSurfaceVariant: Color(0xFF94A3B8),
        outlineVariant: Color(0xFF1E293B),
        error: Color(0xFFEF4444),
      ),
      dividerColor: const Color(0xFF1E293B),
      fontFamily: 'Cairo',
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF070B14),
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF0F1629),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF0F1629),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E293B)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E293B)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3B7EF6)),
        ),
        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
        hintStyle: const TextStyle(color: Color(0xFF475569)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF3B7EF6),
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

  ThemeData _buildLightTheme() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF3B7EF6),
        secondary: Color(0xFF10B981),
        surface: Colors.white,
        onSurface: Color(0xFF0F172A),
        onSurfaceVariant: Color(0xFF64748B),
        outlineVariant: Color(0xFFE2E8F0),
        error: Color(0xFFEF4444),
      ),
      dividerColor: const Color(0xFFE2E8F0),
      fontFamily: 'Cairo',
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFF8FAFC),
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Color(0xFF0F172A)),
        titleTextStyle: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: Color(0xFF0F172A),
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3B7EF6)),
        ),
        labelStyle: const TextStyle(color: Color(0xFF64748B)),
        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF3B7EF6),
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
