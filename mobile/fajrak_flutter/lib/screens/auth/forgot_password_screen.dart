import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('ForgotPassword');
  }

  Future<void> _send() async {
    setState(() => _loading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        _emailCtrl.text.trim(),
        redirectTo: 'https://fajrak.com/api/confirm?next=/reset-password',
      );
      setState(() {
        _sent = true;
        _loading = false;
      });
    } catch (e) {
      if (mounted) ErrorHandler.handle(e, context: context, developerMessage: 'ForgotPassword Action');
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
        backgroundColor: colorScheme.surface,
        title: Text('auth_forgot_password_title'.tr(),
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface)),
        iconTheme: IconThemeData(color: colorScheme.onSurface),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _sent
            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Text('📧', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 20),
                Text('auth_sent_title'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurface,
                        fontWeight: FontWeight.w900,
                        fontSize: 24,
                        fontFamily: 'Cairo')),
                const SizedBox(height: 12),
                Text('auth_sent_subtitle'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
                    textAlign: TextAlign.center),
                const SizedBox(height: 32),
                ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child:  Text('auth_back_to_login'.tr(),
                        style: const TextStyle(fontFamily: 'Cairo'))),
              ])
            : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('auth_forgot_password_desc'.tr(),
                    style: TextStyle(
                        color: colorScheme.onSurfaceVariant, fontFamily: 'Cairo'),
                    textAlign: TextAlign.center),
                const SizedBox(height: 32),
                TextField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style:
                      TextStyle(color: colorScheme.onSurface, fontFamily: 'Cairo'),
                  decoration: InputDecoration(
                      labelText: 'auth_email'.tr(),
                      prefixIcon:
                          Icon(Icons.email_outlined, color: colorScheme.onSurfaceVariant)),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _loading ? null : _send,
                  child: _loading
                      ? CircularProgressIndicator(
                          color: colorScheme.onPrimary, strokeWidth: 2)
                      :  Text('auth_send_reset_link'.tr(),
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontWeight: FontWeight.w900)),
                ),
              ]),
      ),
    );
  }
}
