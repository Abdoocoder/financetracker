import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import '../../widgets/common/auth_error_banner.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import '../../app_state.dart';

String _friendlyAuthError(dynamic e) {
  if (e is AuthException) {
    final msg = e.message.toLowerCase();
    if (msg.contains('invalid login credentials') || msg.contains('invalid credentials')) {
      return 'auth_error_invalid_credentials'.tr();
    }
    if (msg.contains('email not confirmed')) {
      return 'auth_error_email_not_confirmed'.tr();
    }
    if (msg.contains('too many requests') || msg.contains('rate limit')) {
      return 'auth_error_too_many_requests'.tr();
    }
  }
  return 'error_generic'.tr();
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Login');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (mounted) Navigator.pushReplacementNamed(context, '/main');
    } catch (e) {
      if (mounted) {
        setState(() => _error = _friendlyAuthError(e));
        if (e is! AuthException) {
          ErrorHandler.handle(e, context: context, developerMessage: 'Login Action');
        }
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 60),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.primary.withValues(alpha: 0.3),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset(
                    context.read<AppState>().isDarkMode(context)
                        ? 'assets/images/app_icon.png'
                        : 'assets/images/app_icon_light.jpg',
                    width: 72,
                    height: 72,
                    fit: BoxFit.cover,
                    cacheWidth: 144,
                    cacheHeight: 144,
                    semanticLabel: 'app_logo_label'.tr(),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text('auth_login_welcome'.tr(),
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface)),
               const SizedBox(height: 8),
              Text('auth_login_subtitle'.tr(),
                  style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurfaceVariant)),
              const SizedBox(height: 40),
              if (_error != null) ...[
                AuthErrorBanner(message: _error!),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(color: colorScheme.onSurface),
                decoration: InputDecoration(
                    labelText: 'auth_email'.tr(),
                    prefixIcon:
                        Icon(Icons.email_outlined, color: colorScheme.onSurfaceVariant)),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscure,
                style: TextStyle(color: colorScheme.onSurface),
                decoration: InputDecoration(
                  labelText: 'auth_password'.tr(),
                  prefixIcon:
                      Icon(Icons.lock_outlined, color: colorScheme.onSurfaceVariant),
                  suffixIcon: IconButton(
                    icon: Icon(
                        _obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: colorScheme.onSurfaceVariant),
                    tooltip: _obscure ? 'tooltip_show_password'.tr() : 'tooltip_hide_password'.tr(),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/forgot-password'),
                  child: Text('auth_forgot_password'.tr(),
                      style: TextStyle(
                          color: colorScheme.primary)),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _login,
                child: _loading
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: colorScheme.onPrimary))
                    :  Text('auth_login_button'.tr()),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('auth_no_account'.tr(),
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant)),
                  TextButton(
                    onPressed: () =>
                        Navigator.pushReplacementNamed(context, '/register'),
                    child: Text('auth_register_now'.tr(),
                        style: TextStyle(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w700)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
