import 'package:flutter/material.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  String _search = '';
  List<Map<String, dynamic>> get _localizedFaqs => [
    {
      'section': 'help_faq_dashboard_title',
      'items': [
        {
          'q': 'help_faq_dashboard_q1',
          'a': 'help_faq_dashboard_a1'
        },
        {
          'q': 'help_faq_dashboard_q2',
          'a': 'help_faq_dashboard_a2'
        },
        {
          'q': 'help_faq_dashboard_q3',
          'a': 'help_faq_dashboard_a3'
        },
      ],
    },
    {
      'section': 'help_faq_transactions_title',
      'items': [
        {
          'q': 'help_faq_transactions_q1',
          'a': 'help_faq_transactions_a1'
        },
        {
          'q': 'help_faq_transactions_q2',
          'a': 'help_faq_transactions_a2'
        },
        {
          'q': 'help_faq_transactions_q3',
          'a': 'help_faq_transactions_a3'
        },
      ],
    },
    {
      'section': 'help_faq_debts_title',
      'items': [
        {
          'q': 'help_faq_debts_q1',
          'a': 'help_faq_debts_a1'
        },
        {
          'q': 'help_faq_debts_q2',
          'a': 'help_faq_debts_a2'
        },
        {
          'q': 'help_faq_debts_q3',
          'a': 'help_faq_debts_a3'
        },
      ],
    },
    {
      'section': 'help_faq_budget_title',
      'items': [
        {
          'q': 'help_faq_budget_q1',
          'a': 'help_faq_budget_a1'
        },
        {
          'q': 'help_faq_budget_q2',
          'a': 'help_faq_budget_a2'
        },
      ],
    },
    {
      'section': 'help_faq_goals_title',
      'items': [
        {
          'q': 'help_faq_goals_q1',
          'a': 'help_faq_goals_a1'
        },
        {
          'q': 'help_faq_goals_q2',
          'a': 'help_faq_goals_a2'
        },
      ],
    },
    {
      'section': 'help_faq_investments_title',
      'items': [
        {
          'q': 'help_faq_investments_q1',
          'a': 'help_faq_investments_a1'
        },
        {
          'q': 'help_faq_investments_q2',
          'a': 'help_faq_investments_a2'
        },
      ],
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _localizedFaqs
        .map((section) {
          return {
            'section': section['section'],
            'items': (section['items'] as List).where((item) {
              return item['q'].toString().toLowerCase().contains(_search.toLowerCase()) ||
                  item['a'].toString().toLowerCase().contains(_search.toLowerCase());
            }).toList(),
          };
        })
        .where((s) => (s['items'] as List).isNotEmpty)
        .toList();

    return Scaffold(
      backgroundColor: const Color(0xFF070B14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF070B14),
        title: Text('help_title',
            style: const TextStyle(
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
                decoration: InputDecoration(
                  hintText: 'help_search_hint',
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8)),
                  hintStyle: const TextStyle(color: Color(0xFF64748B), fontFamily: 'Cairo'),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                        Text('help_contact_title',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontFamily: 'Cairo',
                                fontSize: 13)),
                        Text('help_contact_subtitle',
                            style: const TextStyle(
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
