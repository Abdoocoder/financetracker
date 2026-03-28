import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import '../../services/notification_service.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
      await NotificationService.saveToken();
      if (mounted) Navigator.pushReplacementNamed(context, '/main');
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e, context: context, developerMessage: 'Login Action');
        setState(() {
          _error = _friendlyAuthError(e);
        });
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
                  gradient: LinearGradient(
                    colors: [colorScheme.primary, colorScheme.secondary],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                  child: Text('ف',
                      style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          fontFamily: 'Cairo')),
                ),
              ),
              const SizedBox(height: 24),
              Text('auth_login_welcome'.tr(),
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                      fontFamily: 'Cairo')),
               const SizedBox(height: 8),
              Text('auth_login_subtitle'.tr(),
                  style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurfaceVariant,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 40),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: colorScheme.error.withValues(alpha: 0.3)),
                  ),
                  child: Text(_error!,
                      style: TextStyle(
                          color: colorScheme.error,
                          fontFamily: 'Cairo',
                          fontSize: 13),
                      textAlign: TextAlign.center),
                ),
                const SizedBox(height: 16),
              ],
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                    labelText: 'auth_email'.tr(),
                    prefixIcon:
                        Icon(Icons.email_outlined, color: colorScheme.onSurfaceVariant)),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscure,
                style: TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
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
                          color: colorScheme.primary, fontFamily: 'Cairo')),
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
                          color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo')),
                  TextButton(
                    onPressed: () =>
                        Navigator.pushReplacementNamed(context, '/register'),
                    child: Text('auth_register_now'.tr(),
                        style: TextStyle(
                            color: colorScheme.primary,
                            fontFamily: 'Cairo',
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
