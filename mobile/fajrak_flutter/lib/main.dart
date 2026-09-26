import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'app_state.dart';
import 'screens/splash_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/onboarding_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/main_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/accounts/accounts_screen.dart';
import 'screens/debts/debts_screen.dart';
import 'screens/transactions/transactions_screen.dart';
import 'screens/transactions/recurring_screen.dart';
import 'screens/budgets/budgets_screen.dart';
import 'screens/goals/goals_screen.dart';
import 'screens/investments/investments_screen.dart';
import 'screens/alerts/alerts_screen.dart';
import 'screens/chat/chat_screen.dart';
import 'screens/more/more_screen.dart';
import 'screens/more/fire_calculator_screen.dart';
import 'screens/more/zakat_calculator_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/settings/notification_settings_screen.dart';
import 'screens/help/help_screen.dart';
import 'screens/learn/learn_screen.dart';
import 'utils/error_handler.dart';
import 'services/notification_service.dart';
import 'services/sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Easy Localization
  await EasyLocalization.ensureInitialized();

  // Initialize Firebase
  if (kIsWeb) {
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: const String.fromEnvironment('FIREBASE_API_KEY'),
        authDomain: const String.fromEnvironment('FIREBASE_AUTH_DOMAIN'),
        projectId: const String.fromEnvironment('FIREBASE_PROJECT_ID'),
        storageBucket: const String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: const String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
        appId: const String.fromEnvironment('FIREBASE_APP_ID'),
        measurementId: const String.fromEnvironment('FIREBASE_MEASUREMENT_ID'),
      ),
    );
  } else {
    await Firebase.initializeApp();
  }

  // Initialize Supabase
  await Supabase.initialize(
    url: const String.fromEnvironment('SUPABASE_URL'),
    anonKey: const String.fromEnvironment('SUPABASE_ANON_KEY'),
  );

  // Initialize notification service
  await NotificationService.initialize();

  // Initialize sync service
  await SyncService.initialize();

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('ar')],
      path: 'assets/i18n',
      fallbackLocale: const Locale('en'),
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    _setupErrorHandling();
    _setupFirebaseMessaging();
  }

  void _setupErrorHandling() {
    ErrorHandler.setup();
  }

  void _setupFirebaseMessaging() {
    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(NotificationService.onBackgroundMessage);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(NotificationService.onForegroundMessage);

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen(NotificationService.onMessageOpenedApp);

    // Handle notification tap when app is terminated
    FirebaseMessaging.instance.getInitialMessage().then(NotificationService.onMessageOpenedApp);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return MaterialApp(
          title: 'Fajrak',
          debugShowCheckedModeBanner: false,
          localizationsDelegates: context.localizationDelegates,
          supportedLocales: context.supportedLocales,
          locale: context.locale,
          theme: appState.themeData,
          darkTheme: appState.darkThemeData,
          themeMode: appState.themeMode,
          initialRoute: '/splash',
          routes: {
            '/splash': (context) => const SplashScreen(),
            '/login': (context) => const LoginScreen(),
            '/register': (context) => const RegisterScreen(),
            '/onboarding': (context) => const OnboardingScreen(),
            '/forgot-password': (context) => const ForgotPasswordScreen(),
            '/reset-password': (context) => const ResetPasswordScreen(),
            '/main': (context) => const MainScreen(),
            '/dashboard': (context) => const DashboardScreen(),
            '/accounts': (context) => const AccountsScreen(),
            '/debts': (context) => const DebtsScreen(),
            '/transactions': (context) => const TransactionsScreen(),
            '/recurring': (context) => const RecurringScreen(),
            '/budgets': (context) => const BudgetsScreen(),
            '/goals': (context) => const GoalsScreen(),
            '/investments': (context) => const InvestmentsScreen(),
            '/alerts': (context) => const AlertsScreen(),
            '/chat': (context) => const ChatScreen(),
            '/more': (context) => const MoreScreen(),
            '/fire-calculator': (context) => const FireCalculatorScreen(),
            '/zakat-calculator': (context) => const ZakatCalculatorScreen(),
            '/settings': (context) => const SettingsScreen(),
            '/notification-settings': (context) => const NotificationSettingsScreen(),
            '/help': (context) => const HelpScreen(),
            '/learn': (context) => const LearnScreen(),
          },
          onGenerateRoute: (settings) {
            if (settings.name == '/deep-link') {
              final args = settings.arguments as Map<String, dynamic>?;
              return MaterialPageRoute(
                builder: (context) => MainScreen(initialTab: args?['tab'] ?? 4),
              );
            }
            return null;
          },
        );
      },
    );
  }
}