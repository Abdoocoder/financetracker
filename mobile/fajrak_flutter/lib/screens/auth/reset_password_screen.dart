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
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        title: const Text('تعيين كلمة المرور',
            style: TextStyle(fontFamily: 'Cairo')),
        backgroundColor: Colors.transparent,
        elevation: 0,
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
                  gradient: const LinearGradient(
                      colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                    child:
                        Icon(Icons.lock_reset, size: 40, color: Colors.white)),
              ),
              const SizedBox(height: 24),
              const Text('تعيين كلمة مرور جديدة',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 8),
              const Text('أدخل كلمة المرور الجديدة لتأمين حسابك',
                  style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Cairo'),
                  textAlign: TextAlign.center),
              const SizedBox(height: 32),
              if (_success) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: const Color(0xFF10B981).withOpacity(0.3)),
                  ),
                  child: const Text(
                      'تم تغيير كلمة المرور بنجاح! جاري التحويل...',
                      style: TextStyle(
                          color: Color(0xFF10B981),
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
                    color: const Color(0xFFEF4444).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: const Color(0xFFEF4444).withOpacity(0.3)),
                  ),
                  child: Text(_error!,
                      style: const TextStyle(
                          color: Color(0xFFEF4444),
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
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                  labelText: 'reset_new'.tr(),
                  prefixIcon:
                      const Icon(Icons.lock_outline, color: Color(0xFF94A3B8)),
                  suffixIcon: IconButton(
                    icon: Icon(
                        _obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        color: const Color(0xFF94A3B8)),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _confirmController,
                obscureText: _obscure,
                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                  labelText: 'reset_confirm'.tr(),
                  prefixIcon:
                      const Icon(Icons.lock_outline, color: Color(0xFF94A3B8)),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _loading || _success ? null : _reset,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
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
