import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;
  bool _success = false;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('ResetPassword');
  }

  Future<void> _reset() async {
    if (_passwordController.text != _confirmController.text) {
      setState(() => _error = 'كلمات المرور غير متطابقة');
      return;
    }
    if (_passwordController.text.length < 6) {
      setState(() => _error = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.updateUser(
        UserAttributes(password: _passwordController.text),
      );
      setState(() => _success = true);
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) Navigator.pushReplacementNamed(context, '/main');
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'ResetPassword Action');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('تعيين كلمة المرور',
            style: TextStyle(fontFamily: 'Cairo', color: colorScheme.onSurface)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: colorScheme.onSurface),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 20),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                      colors: [colorScheme.primary, colorScheme.secondary]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                    child:
                        Icon(Icons.lock_reset, size: 40, color: Colors.white)),
              ),
              const SizedBox(height: 24),
              Text('تعيين كلمة مرور جديدة',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: colorScheme.onSurface,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 8),
              Text('أدخل كلمة المرور الجديدة لتأمين حسابك',
                  style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurfaceVariant,
                      fontFamily: 'Cairo'),
                  textAlign: TextAlign.center),
              const SizedBox(height: 32),
              if (_success) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: (theme.brightness == Brightness.dark
                            ? const Color(0xFF10B981)
                            : const Color(0xFF059669))
                        .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: (theme.brightness == Brightness.dark
                                ? const Color(0xFF10B981)
                                : const Color(0xFF059669))
                            .withValues(alpha: 0.3)),
                  ),
                  child: Text(
                      'تم تغيير كلمة المرور بنجاح! جاري التحويل...',
                      style: TextStyle(
                          color: theme.brightness == Brightness.dark
                              ? const Color(0xFF10B981)
                              : const Color(0xFF059669),
                          fontFamily: 'Cairo',
                          fontSize: 13),
                      textAlign: TextAlign.center),
                ),
                const SizedBox(height: 16),
              ],
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  width: double.infinity,
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
                controller: _passwordController,
                obscureText: _obscure,
                style:
                    TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                  labelText: 'كلمة المرور الجديدة',
                  prefixIcon:
                      Icon(Icons.lock_outline, color: colorScheme.onSurfaceVariant),
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
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmController,
                obscureText: _obscure,
                style:
                    TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                  labelText: 'تأكيد كلمة المرور',
                  prefixIcon:
                      Icon(Icons.lock_outline, color: colorScheme.onSurfaceVariant),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _loading || _success ? null : _reset,
                child: _loading
                    ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: colorScheme.onPrimary))
                    : const Text('تعيين كلمة المرور'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }
}
