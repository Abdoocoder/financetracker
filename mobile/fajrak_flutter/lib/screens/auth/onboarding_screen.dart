import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _incomeController = TextEditingController();
  int _salaryDay = 25;
  String _currency = 'JOD';
  bool _loading = false;

  final List<String> _currencies = ['JOD', 'USD', 'SAR', 'AED'];

  Future<void> _save() async {
    setState(() => _loading = true);
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      final income = double.tryParse(_incomeController.text) ?? 0;
      
      await Supabase.instance.client.from('profiles').upsert({
        'id': user.id,
        'monthly_income': income,
        'salary_day': _salaryDay,
        'currency': _currency,
        'onboarding_done': true,
      });

      if (income > 0) {
        await Supabase.instance.client.from('transactions').insert({
          'user_id': user.id,
          'type': 'income',
          'amount': income,
          'category': 'راتب',
          'description': 'الراتب الشهري (تلقائي)',
          'transaction_date': DateTime.now().toIso8601String().split('T')[0],
        });
      }

      if (mounted) Navigator.pushReplacementNamed(context, '/main');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('خطأ: $e'), backgroundColor: Colors.red),
        );
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              const Text('مرحباً! 👋', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, fontFamily: 'Cairo')),
              const SizedBox(height: 8),
              const Text('دعنا نعرف وضعك المالي لنساعدك بشكل أفضل', style: TextStyle(fontSize: 15, color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
              const SizedBox(height: 40),
              _buildCard(
                title: 'الراتب الشهري',
                icon: Icons.account_balance_wallet_outlined,
                child: TextFormField(
                  controller: _incomeController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 18),
                  decoration: const InputDecoration(labelText: 'أدخل راتبك الشهري', prefixIcon: Icon(Icons.attach_money, color: Color(0xFF10B981))),
                ),
              ),
              const SizedBox(height: 16),
              _buildCard(
                title: 'يوم استلام الراتب',
                icon: Icons.calendar_today_outlined,
                child: Column(
                  children: [
                    Text('اليوم $_salaryDay من كل شهر', style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo')),
                    Slider(
                      value: _salaryDay.toDouble(),
                      min: 1, max: 28,
                      divisions: 27,
                      activeColor: const Color(0xFF3B7EF6),
                      onChanged: (v) => setState(() => _salaryDay = v.round()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _buildCard(
                title: 'العملة',
                icon: Icons.currency_exchange,
                child: Row(
                  children: _currencies.map((c) => Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: GestureDetector(
                        onTap: () => setState(() => _currency = c),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _currency == c ? const Color(0xFF3B7EF6) : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(c, textAlign: TextAlign.center, style: TextStyle(color: _currency == c ? Colors.white : const Color(0xFF94A3B8), fontFamily: 'Cairo', fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ),
                  )).toList(),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _save,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B7EF6),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 8,
                    shadowColor: const Color(0xFF3B7EF6).withOpacity(0.4),
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('ابدأ رحلتك المالية 🚀', style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 20),
              const Center(child: Text('يمكنك دائماً تعديل هذه الإعدادات لاحقاً', style: TextStyle(color: Color(0xFF475569), fontSize: 12, fontFamily: 'Cairo'))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, color: const Color(0xFF3B7EF6), size: 20),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontFamily: 'Cairo', fontSize: 15)),
          ]),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
