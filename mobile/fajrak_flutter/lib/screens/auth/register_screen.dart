import 'package:easy_localization/easy_localization.dart';
import '../../utils/error_handler.dart';
import '../../services/analytics_service.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    AnalyticsService.logScreenView('Register');
  }

  Future<void> _register() async {
    if (_nameController.text.isEmpty ||
        _emailController.text.isEmpty ||
        _passwordController.text.isEmpty) {
      setState(() => _error = 'يرجى ملء جميع الحقول');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await Supabase.instance.client.auth.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        data: {'full_name': _nameController.text.trim()},
      );
      if (res.user != null && mounted) {
        Navigator.pushReplacementNamed(context, '/onboarding');
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e, context: context, developerMessage: 'Register Action');
        // Optionally, if ErrorHandler doesn't update _error, you might do it here
        // if (e is AuthException) {
        //   setState(() => _error = e.message);
        // } else {
        //   setState(() => _error = 'An unexpected error occurred.');
        // }
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 40),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                      colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)]),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Center(
                    child: Text('ف',
                        style: TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            fontFamily: 'Cairo'))),
              ),
              const SizedBox(height: 24),
              const Text('إنشاء حساب جديد',
                  style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 8),
              const Text('ابدأ رحلتك نحو الحرية المالية',
                  style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Cairo')),
              const SizedBox(height: 32),
              if (_error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
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
                controller: _nameController,
                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                    labelText: 'settings_name'.tr(),
                    prefixIcon:
                        const Icon(Icons.person_outlined, color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,

                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                    labelText: 'forgot_email'.tr(),
                    prefixIcon:
                        const Icon(Icons.email_outlined, color: Color(0xFF94A3B8))),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscure,
                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: InputDecoration(
                  labelText: 'كلمة المرور',
                  prefixIcon:
                      const Icon(Icons.lock_outlined, color: Color(0xFF94A3B8)),
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
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('إنشاء الحساب'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('لديك حساب بالفعل؟',
                      style: TextStyle(
                          color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                  TextButton(
                    onPressed: () =>
                        Navigator.pushReplacementNamed(context, '/login'),
                    child: const Text('سجل دخولك',
                        style: TextStyle(
                            color: Color(0xFF3B7EF6),
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
