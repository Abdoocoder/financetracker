import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  Future<void> _send() async {
    setState(() => _loading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        _emailCtrl.text.trim(),
        redirectTo: 'https://fajrak.com/reset-password',
      );
      setState(() { _sent = true; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('حدث خطأ — تحقق من البريد', style: TextStyle(fontFamily: 'Cairo')), backgroundColor: Color(0xFFEF4444)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('نسيت كلمة المرور', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: _sent ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('📧', style: TextStyle(fontSize: 64)),
          const SizedBox(height: 20),
          const Text('تم الإرسال!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 24, fontFamily: 'Cairo')),
          const SizedBox(height: 12),
          const Text('تحقق من بريدك الإلكتروني واضغط على الرابط', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'), textAlign: TextAlign.center),
          const SizedBox(height: 32),
          ElevatedButton(onPressed: () => Navigator.pop(context), child: const Text('العودة لتسجيل الدخول', style: TextStyle(fontFamily: 'Cairo'))),
        ]) : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('أدخل بريدك الإلكتروني وسنرسل لك رابط الاسترجاع', style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo'), textAlign: TextAlign.center),
          const SizedBox(height: 32),
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
            decoration: const InputDecoration(labelText: 'البريد الإلكتروني', prefixIcon: Icon(Icons.email_outlined, color: Color(0xFF64748B))),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loading ? null : _send,
            child: _loading ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2) : const Text('إرسال رابط الاسترجاع', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900)),
          ),
        ]),
      ),
    );
  }
}
