import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
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
    if (_saving) return;
    if (_nameCtrl.text.isEmpty || _textCtrl.text.length < 20) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    _saving = true;
    setState(() {});
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
              'testimonial_success'.tr(),
              style: const TextStyle(),
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'testimonial_error'.tr(),
              style: const TextStyle(),
            ),
            backgroundColor: AppColors.error,
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isEn = context.locale.languageCode == 'en';
    final canSubmit = _nameCtrl.text.isNotEmpty && _textCtrl.text.length >= 20;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant.withValues(alpha: 0.5)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Theme(
        data: theme.copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          iconColor: colorScheme.onSurfaceVariant,
          collapsedIconColor: colorScheme.onSurfaceVariant,
          title: Row(children: [
            Icon(Icons.star, size: 18, color: Colors.amber),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                'testimonial_share_title'.tr(),
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
            ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: colorScheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              'testimonial_new'.tr(),
              style: TextStyle(
                color: colorScheme.primary,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          ],
          ),
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              child: _submitted && !_existing ? _buildSuccess(isEn, colorScheme) : _buildForm(isEn, canSubmit, colorScheme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccess(bool isEn, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.1),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          const Icon(Icons.celebration, size: 32, color: AppColors.success),
          const SizedBox(height: 8),
          Text(
            'testimonial_thankyou'.tr(),
            style: const TextStyle(
              color: AppColors.success,
              fontWeight: FontWeight.w800,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForm(bool isEn, bool canSubmit, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'testimonial_approval_notice'.tr(),
          style: TextStyle(
            color: colorScheme.onSurfaceVariant,
            fontSize: 12,
            height: 1.7,
          ),
        ),
        const SizedBox(height: 16),
        
        // Stars
        Text(
          'testimonial_rating'.tr(),
          style: TextStyle(
            color: colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.bold,
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
                  color: starNum <= _stars ? AppColors.warning : colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
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
                    'testimonial_name'.tr(),
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  _inputField(_nameCtrl, 'testimonial_name_hint'.tr(), colorScheme),
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
                    'testimonial_country'.tr(),
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _country,
                        isExpanded: true,
                        dropdownColor: colorScheme.surface,
                        icon: Icon(Icons.arrow_drop_down, color: colorScheme.onSurface),
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
          'testimonial_job_title'.tr(),
          style: TextStyle(
            color: colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.bold,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 6),
        _inputField(_roleCtrl, 'testimonial_job_hint'.tr(), colorScheme),
        const SizedBox(height: 16),

        // Text
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'testimonial_your_review'.tr(),
              style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
            Text(
              '${_textCtrl.text.length}/20+',
              style: TextStyle(
                color: _textCtrl.text.length < 20 ? colorScheme.error : AppColors.success,
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
          style: TextStyle(color: colorScheme.onSurface, fontSize: 13),
          decoration: InputDecoration(
            hintText: 'testimonial_review_hint'.tr(),
            hintStyle: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
            filled: true,
            fillColor: colorScheme.outlineVariant,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: colorScheme.outlineVariant),
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
              backgroundColor: canSubmit ? AppColors.warning : colorScheme.outlineVariant,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _saving
                ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: colorScheme.onPrimary))
                : Text(
                    _existing ? 'testimonial_update_btn'.tr() : 'testimonial_submit_btn'.tr(),
                    style: const TextStyle(
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
              'testimonial_existing_notice'.tr(),
              style: const TextStyle(
                color: AppColors.warning,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _inputField(TextEditingController ctrl, String hint, ColorScheme colorScheme) {
    return TextField(
      controller: ctrl,
      onChanged: (v) => setState(() {}),
      style: TextStyle(color: colorScheme.onSurface, fontSize: 13),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
        filled: true,
        fillColor: colorScheme.outlineVariant,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: colorScheme.outlineVariant),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
      ),
    );
  }
}
