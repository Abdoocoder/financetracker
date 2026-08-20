import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/analytics_service.dart';
import '../utils/error_handler.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../app_state.dart';
import 'dart:io';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    _scaleAnim = Tween<double>(begin: 0.8, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
    _controller.forward();
    AnalyticsService.logScreenView('Splash');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _checkUser();
    });
  }

  Future<void> _checkUser() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (mounted) {
        if (user == null) {
          Navigator.pushReplacementNamed(context, '/login');
        } else {
          final res = await Supabase.instance.client
              .from('profiles')
              .select('onboarding_done')
              .eq('id', user.id)
              .maybeSingle();

          if (mounted) {
            if (res != null && res['onboarding_done'] == true) {
              Navigator.pushReplacementNamed(context, '/main');
            } else {
              Navigator.pushReplacementNamed(context, '/onboarding');
            }
          }
        }
      }
    } catch (e) {
      // Network error while user is already logged in → go to main (offline mode)
      final isNetwork = e is SocketException ||
          e.toString().toLowerCase().contains('socketexception') ||
          e.toString().toLowerCase().contains('failed host lookup') ||
          e.toString().toLowerCase().contains('authretryablefetchexception');

      if (mounted) {
        final user = Supabase.instance.client.auth.currentUser;
        if (isNetwork && user != null) {
          Navigator.pushReplacementNamed(context, '/main');
        } else {
          ErrorHandler.handle(e, context: context, developerMessage: 'Splash CheckUser');
          if (user == null) {
            await Future.delayed(const Duration(seconds: 2));
            if (mounted) Navigator.pushReplacementNamed(context, '/login');
          }
        }
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: ScaleTransition(
            scale: _scaleAnim,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: colorScheme.primary.withValues(alpha: 0.4),
                        blurRadius: 30,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: Image.asset(
                      context.read<AppState>().isDarkMode(context)
                          ? 'assets/images/app_icon.png'
                          : 'assets/images/app_icon_light.jpg',
                      width: 100,
                      height: 100,
                      fit: BoxFit.cover,
                      cacheWidth: 200,
                      cacheHeight: 200,
                      semanticLabel: 'app_logo_label'.tr(),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text('فجرك',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.w900,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'إدارة شؤونك المالية',
                  style: TextStyle(
                    fontSize: 16,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 60),
                SizedBox(
                  width: 30,
                  height: 30,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
