import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';

class TestimonialCard extends StatefulWidget {
  const TestimonialCard({super.key});

  @override
  State<TestimonialCard> createState() => _TestimonialCardState();
}

class _TestimonialCardState extends State<TestimonialCard> {
  final _nameCtrl = TextEditingController();
  final _roleCtrl = TextEditingController();
  final _textCtrl = TextEditingController();
  
  int _stars = 5;
  String _country = '🇯🇴';
  bool _saving = false;
  bool _submitted = false;
  bool _existing = false;

  final List<String> _countries = ['🇯🇴', '🇸🇦', '🇦🇪', '🇰🇼', '🇧🇭', '🇪🇬', '🇲🇦', '🇮🇶', '🇱🇧', '🇴🇲'];

  @override
  void initState() {
    super.initState();
    _loadExisting();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _roleCtrl.dispose();
    _textCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadExisting() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final res = await Supabase.instance.client
          .from('testimonials')
          .select()
          .eq('user_id', user.id)
          .maybeSingle();
      if (res != null && mounted) {
        setState(() {
          _existing = true;
          _submitted = true;
          _nameCtrl.text = res['name'] as String? ?? '';
          _country = res['country'] as String? ?? '🇯🇴';
          _roleCtrl.text = res['role'] as String? ?? '';
          _stars = (res['stars'] as num?)?.toInt() ?? 5;
          _textCtrl.text = res['text'] as String? ?? '';
        });
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    if (_nameCtrl.text.isEmpty || _textCtrl.text.length < 20) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    setState(() => _saving = true);
    try {
      final data = {
        'user_id': user.id,
        'name': _nameCtrl.text,
        'country': _country,
        'role': _roleCtrl.text,
        'stars': _stars,
        'text': _textCtrl.text,
        'created_at': DateTime.now().toIso8601String(),
        'approved': false,
      };

      if (_existing) {
        await Supabase.instance.client.from('testimonials').update(data).eq('user_id', user.id);
      } else {
        await Supabase.instance.client.from('testimonials').insert(data);
      }
      
      if (mounted) {
        setState(() {
          _submitted = true;
          _existing = true;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.locale.languageCode == 'en' ? 'Review submitted successfully!' : 'تم إرسال التقييم بنجاح!',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              context.locale.languageCode == 'en' ? 'Error submitting review.' : 'حدث خطأ أثناء الإرسال.',
              style: const TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEn = context.locale.languageCode == 'en';
    final canSubmit = _nameCtrl.text.isNotEmpty && _textCtrl.text.length >= 20;

    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        iconColor: const Color(0xFF64748B),
        collapsedIconColor: const Color(0xFF64748B),
        title: Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text('⭐', style: TextStyle(fontSize: 18)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              isEn ? 'Share Your Experience' : 'شارك تجربتك',
              style: const TextStyle(
                color: Colors.white,
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                fontSize: 15,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF3B7EF6).withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              isEn ? 'New' : 'جديد',
              style: const TextStyle(
                color: Color(0xFF3B7EF6),
                fontSize: 10,
                fontWeight: FontWeight.bold,
                fontFamily: 'Cairo',
              ),
            ),
          ),
        ]),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            child: _submitted && !_existing ? _buildSuccess(isEn) : _buildForm(isEn, canSubmit),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccess(bool isEn) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withOpacity(0.1),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          const Text('🎉', style: TextStyle(fontSize: 32)),
          const SizedBox(height: 8),
          Text(
            isEn ? 'Thank you! Under review.' : 'شكراً! تحت المراجعة.',
            style: const TextStyle(
              color: Color(0xFF10B981),
              fontWeight: FontWeight.w800,
              fontFamily: 'Cairo',
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForm(bool isEn, bool canSubmit) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          isEn
              ? 'Your review will appear on our landing page after approval.'
              : 'رأيك سيظهر في صفحتنا الرئيسية بعد المراجعة.',
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontFamily: 'Cairo',
            fontSize: 12,
            height: 1.7,
          ),
        ),
        const SizedBox(height: 16),
        
        // Stars
        Text(
          isEn ? 'Rating' : 'التقييم',
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(5, (i) {
            final starNum = i + 1;
            return GestureDetector(
              onTap: () => setState(() => _stars = starNum),
              child: Padding(
                padding: const EdgeInsets.only(right: 6),
                child: Icon(
                  starNum <= _stars ? Icons.star : Icons.star_border,
                  color: starNum <= _stars ? const Color(0xFFF59E0B) : const Color(0xFF1E293B),
                  size: 32,
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 16),

        // Name & Country
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 2,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isEn ? 'Name' : 'الاسم',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Cairo',
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  _inputField(_nameCtrl, isEn ? 'Your name' : 'اسمك'),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              flex: 1,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isEn ? 'Country' : 'الدولة',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Cairo',
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _country,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF1E293B),
                        icon: const Icon(Icons.arrow_drop_down, color: Colors.white),
                        items: _countries.map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c, style: const TextStyle(fontSize: 20)),
                        )).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _country = val);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Role
        Text(
          isEn ? 'Job Title (optional)' : 'الوظيفة (اختياري)',
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontWeight: FontWeight.bold,
            fontFamily: 'Cairo',
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 6),
        _inputField(_roleCtrl, isEn ? 'e.g. Software Engineer' : 'مثال: مهندس برمجيات'),
        const SizedBox(height: 16),

        // Text
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isEn ? 'Your Review' : 'رأيك بالتطبيق',
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.bold,
                fontFamily: 'Cairo',
                fontSize: 12,
              ),
            ),
            Text(
              '${_textCtrl.text.length}/20+',
              style: TextStyle(
                color: _textCtrl.text.length < 20 ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                fontFamily: 'Cairo',
                fontSize: 12,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _textCtrl,
          onChanged: (v) => setState(() {}),
          maxLines: 4,
          style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13),
          decoration: InputDecoration(
            hintText: isEn ? 'What do you like most about Fajrak?' : 'ما الذي أعجبك في التطبيق؟',
            hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 13),
            filled: true,
            fillColor: const Color(0xFF1E293B),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF334155)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF334155)),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          ),
        ),
        const SizedBox(height: 16),

        // Submit Button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: (!canSubmit || _saving) ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: canSubmit ? const Color(0xFFF59E0B) : const Color(0xFF1E293B),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(
                    _existing
                        ? (isEn ? 'Update Review ⭐' : 'تحديث التقييم ⭐')
                        : (isEn ? 'Submit Review ⭐' : 'إرسال التقييم ⭐'),
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
          ),
        ),
        
        if (_existing) ...[
          const SizedBox(height: 12),
          Center(
            child: Text(
              isEn ? '✓ You have a pending/approved review' : '✓ لديك تقييم قيد المراجعة أو موافق عليه',
              style: const TextStyle(
                color: Color(0xFFF59E0B),
                fontFamily: 'Cairo',
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _inputField(TextEditingController ctrl, String hint) {
    return TextField(
      controller: ctrl,
      onChanged: (v) => setState(() {}),
      style: const TextStyle(color: Colors.white, fontFamily: 'Cairo', fontSize: 13),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo', fontSize: 13),
        filled: true,
        fillColor: const Color(0xFF1E293B),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
      ),
    );
  }
}
