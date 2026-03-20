import 'package:flutter/material.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('المساعدة والدعم', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: const Color(0xFF0F1629), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF1E293B))),
              child: const Column(
                children: [
                  Text('🎧', style: TextStyle(fontSize: 48)),
                  SizedBox(height: 16),
                  Text('كيف يمكننا مساعدتك؟', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, fontFamily: 'Cairo')),
                  SizedBox(height: 8),
                  Text('فريق الدعم متاح للرد على جميع استفساراتك.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
                  SizedBox(height: 24),
                  Row(
                    children: [
                      Icon(Icons.email_outlined, color: Color(0xFF3B7EF6)),
                      SizedBox(width: 12),
                      Text('support@fajrak.com', style: TextStyle(color: Colors.white, fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
