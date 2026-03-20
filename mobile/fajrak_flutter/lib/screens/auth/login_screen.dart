import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
    } on AuthException catch (e) {
      setState(() {
        _error = e.message;
      });
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
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
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
                  gradient: const LinearGradient(
                    colors: [Color(0xFF3B7EF6), Color(0xFF8B5CF6)],
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
              const Text('مرحباً بعودتك',
                  style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      fontFamily: 'Cairo')),
              const SizedBox(height: 8),
              const Text('سجل دخولك لمتابعة وضعك المالي',
                  style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Cairo')),
              const SizedBox(height: 40),
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
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textDirection: TextDirection.ltr,
                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: const InputDecoration(
                    labelText: 'forgot_email'.tr(),
                    prefixIcon:
                        Icon(Icons.email_outlined, color: Color(0xFF94A3B8))),
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
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: () =>
                      Navigator.pushNamed(context, '/forgot-password'),
                  child: const Text('نسيت كلمة المرور؟',
                      style: TextStyle(
                          color: Color(0xFF3B7EF6), fontFamily: 'Cairo')),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _login,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Text('تسجيل الدخول'),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('ليس لديك حساب؟',
                      style: TextStyle(
                          color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                  TextButton(
                    onPressed: () =>
                        Navigator.pushReplacementNamed(context, '/register'),
                    child: const Text('سجل مجاناً',
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
