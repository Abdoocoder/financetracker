import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  String _search = '';
  final List<Map<String, dynamic>> _faqs = [
    {
      'section': '🏠 لوحة التحكم',
      'items': [
        {
          'q': 'ما هي لوحة التحكم؟',
          'a':
              'لوحة التحكم هي صفحتك الرئيسية — تعرض ملخصاً كاملاً لوضعك المالي هذا الشهر، بما في ذلك الدخل والمصاريف والصافي.'
        },
        {
          'q': 'كيف أضيف معاملة بسرعة؟',
          'a':
              'استخدم قسم "الإضافة السريعة" في أعلى الصفحة. اختر الفئة، أدخل المبلغ، واضغط إضافة. ما يأخذ أكثر من 5 ثواني!'
        },
        {
          'q': 'ما هي نقاط الصحة المالية؟',
          'a':
              'رقم من 0-100 يقيس صحتك المالية بناءً على 5 عوامل: الادخار، الديون، صندوق الطوارئ، الاستثمار، وانتظام التتبع.'
        },
      ],
    },
    {
      'section': '💸 المعاملات',
      'items': [
        {
          'q': 'كيف أضيف دخلاً أو مصروفاً؟',
          'a':
              'اذهب لصفحة المعاملات واضغط زر + في أعلى الصفحة. اختر النوع (دخل/مصروف)، أدخل المبلغ والفئة والتاريخ، ثم اضغط حفظ.'
        },
        {
          'q': 'كيف أحذف أو أعدل معاملة؟',
          'a': 'اضغط على المعاملة لتعديلها، أو اسحبها يساراً على الهاتف لحذفها.'
        },
        {
          'q': 'هل يمكنني تصدير معاملاتي؟',
          'a':
              'نعم! اضغط على زر "تصدير CSV" في صفحة المعاملات وستحصل على ملف Excel بكل معاملاتك.'
        },
      ],
    },
    {
      'section': '💳 الديون',
      'items': [
        {
          'q': 'كيف أضيف ديناً جديداً؟',
          'a':
              'اذهب لصفحة الديون واضغط "إضافة دين". أدخل اسم الدين، المبلغ الأصلي، المبلغ المتبقي، والقسط الشهري.'
        },
        {
          'q': 'ما هو الخصم التلقائي؟',
          'a':
              'يمكنك تحديد يوم من الشهر لكل دين، وسيخصم التطبيق القسط تلقائياً من رصيدك كل شهر دون تدخل منك.'
        },
        {
          'q': 'ماذا يحدث عند سداد الدين كاملاً؟',
          'a':
              '🎉 احتفال! ستظهر ألعاب نارية وتهنئة. الدين ينتقل لقائمة "الديون المسددة" كإنجاز دائم.'
        },
      ],
    },
    {
      'section': '📊 الميزانية',
      'items': [
        {
          'q': 'كيف تعمل الميزانية الذكية؟',
          'a':
              'الميزانية تحسب تلقائياً من بياناتك — دخلك مطروحاً منه الأقساط والأهداف. المستشار المالي الذكي يحللها ويعطيك توصيات فورية.'
        },
        {
          'q': 'ما هي قاعدة 50/30/20؟',
          'a':
              '50% من دخلك للضروريات، 30% للرغبات، 20% للادخار والاستثمار. التطبيق يوزع ميزانيتك تلقائياً بهذه النسب.'
        },
      ],
    },
    {
      'section': '🎯 الأهداف',
      'items': [
        {
          'q': 'كيف أنشئ هدفاً للادخار؟',
          'a':
              'اذهب لصفحة الأهداف واضغط 'goals_new'.tr(). حدد اسم الهدف، المبلغ المستهدف، والتاريخ المطلوب.'
        },
        {
          'q': 'كيف أضيف مبلغاً لهدفي؟',
          'a':
              'اضغط على الهدف ثم "إضافة دفعة". أدخل المبلغ وسيُضاف لشريط التقدم فوراً.'
        },
      ],
    },
    {
      'section': '📈 الاستثمار',
      'items': [
        {
          'q': 'ما الأصول التي يدعمها التطبيق؟',
          'a':
              'يدعم الأسهم الأمريكية (مثل SPUS، VOO) والعملات الرقمية (BTC، ETH، وأكثر من 15 عملة) مع أسعار حية.'
        },
        {
          'q': 'كيف يحسب التطبيق الربح والخسارة؟',
          'a':
              'يحسب الفرق بين سعر الشراء الذي أدخلته وبين السعر الحالي الحي. تظهر النتيجة بالدولار وبالنسبة المئوية.'
        },
      ],
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _faqs
        .map((section) {
          return {
            'section': section['section'],
            'items': (section['items'] as List).where((item) {
              return item['q'].toString().contains(_search) ||
                  item['a'].toString().contains(_search);
            }).toList(),
          };
        })
        .where((s) => (s['items'] as List).isNotEmpty)
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: const Text('💬 مركز المساعدة',
            style: TextStyle(
                fontFamily: 'Cairo',
                fontWeight: FontWeight.w900,
                color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            Container(
              decoration: BoxDecoration(
                  color: const Color(0xFF0F1629),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF1E293B))),
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                style:
                    const TextStyle(color: Colors.white, fontFamily: 'Cairo'),
                decoration: const InputDecoration(
                  hintText: 'help_search'.tr(),
                  hintStyle:
                      TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
                  contentPadding:
                      EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Contact Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                  color: const Color(0xFF3B7EF6).withOpacity(0.05),
                  border: Border.all(
                      color: const Color(0xFF3B7EF6).withOpacity(0.2)),
                  borderRadius: BorderRadius.circular(16)),
              child: Row(
                children: [
                  Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                          color: const Color(0xFF3B7EF6).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12)),
                      child: const Center(
                          child: Icon(Icons.support_agent,
                              color: Color(0xFF3B7EF6)))),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('هل تحتاج مساعدة إضافية؟',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 13)),
                        Text('ارسل لنا بريداً إلكترونياً وسنرد عليك قريباً',
                            style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontFamily: 'Cairo',
                                fontSize: 11)),
                      ],
                    ),
                  ),
                  const Icon(Icons.arrow_forward_ios,
                      color: Color(0xFF64748B), size: 14),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // FAQs
            ...filtered.map((section) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12, top: 8),
                      child: Text(section['section'],
                          style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontWeight: FontWeight.w900,
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              letterSpacing: 1.1)),
                    ),
                    ...(section['items'] as List)
                        .map((item) => _FAQItem(q: item['q'], a: item['a'])),
                    const SizedBox(height: 12),
                  ],
                )),
          ],
        ),
      ),
    );
  }
}

class _FAQItem extends StatefulWidget {
  final String q;
  final String a;
  const _FAQItem({required this.q, required this.a});

  @override
  State<_FAQItem> createState() => _FAQItemState();
}

class _FAQItemState extends State<_FAQItem> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _open
            ? const Color(0xFF0F1629)
            : const Color(0xFF0F1629).withOpacity(0.5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: _open
                ? const Color(0xFF3B7EF6).withOpacity(0.3)
                : const Color(0xFF1E293B)),
      ),
      child: Column(
        children: [
          ListTile(
            onTap: () => setState(() => _open = !_open),
            title: Text(widget.q,
                style: TextStyle(
                    color: _open ? Colors.white : const Color(0xFFCBD5E1),
                    fontWeight: _open ? FontWeight.w900 : FontWeight.w700,
                    fontFamily: 'Cairo',
                    fontSize: 13)),
            trailing: AnimatedRotation(
              duration: const Duration(milliseconds: 200),
              turns: _open ? 0.5 : 0,
              child: const Icon(Icons.keyboard_arrow_down,
                  color: Color(0xFF64748B)),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(widget.a,
                  style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Cairo',
                      fontSize: 12,
                      height: 1.6)),
            ),
        ],
      ),
    );
  }
}
