import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:url_launcher/url_launcher.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  String _search = '';
  late final List<Map<String, dynamic>> _localizedFaqs;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Built once after locale is available; rebuilds only on locale change.
    _localizedFaqs = _buildFaqs();
  }

  List<Map<String, dynamic>> _buildFaqs() => [
    {
      'section': 'help_faq_dashboard_title'.tr(),
      'items': [
        {
          'q': 'help_faq_dashboard_q1'.tr(),
          'a': 'help_faq_dashboard_a1'.tr()
        },
        {
          'q': 'help_faq_dashboard_q2'.tr(),
          'a': 'help_faq_dashboard_a2'.tr()
        },
        {
          'q': 'help_faq_dashboard_q3'.tr(),
          'a': 'help_faq_dashboard_a3'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_transactions_title'.tr(),
      'items': [
        {
          'q': 'help_faq_transactions_q1'.tr(),
          'a': 'help_faq_transactions_a1'.tr()
        },
        {
          'q': 'help_faq_transactions_q2'.tr(),
          'a': 'help_faq_transactions_a2'.tr()
        },
        {
          'q': 'help_faq_transactions_q3'.tr(),
          'a': 'help_faq_transactions_a3'.tr()
        },
        {
          'q': 'help_faq_transactions_q4'.tr(),
          'a': 'help_faq_transactions_a4'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_accounts_title'.tr(),
      'items': [
        {'q': 'help_faq_accounts_q1'.tr(), 'a': 'help_faq_accounts_a1'.tr()},
        {'q': 'help_faq_accounts_q2'.tr(), 'a': 'help_faq_accounts_a2'.tr()},
        {'q': 'help_faq_accounts_q3'.tr(), 'a': 'help_faq_accounts_a3'.tr()},
      ],
    },
    {
      'section': 'help_faq_debts_title'.tr(),
      'items': [
        {'q': 'help_faq_debts_q1'.tr(), 'a': 'help_faq_debts_a1'.tr()},
        {'q': 'help_faq_debts_q2'.tr(), 'a': 'help_faq_debts_a2'.tr()},
        {'q': 'help_faq_debts_q3'.tr(), 'a': 'help_faq_debts_a3'.tr()},
        {'q': 'help_faq_debts_q4'.tr(), 'a': 'help_faq_debts_a4'.tr()},
        {'q': 'help_faq_debts_q5'.tr(), 'a': 'help_faq_debts_a5'.tr()},
        {'q': 'help_faq_debts_q6'.tr(), 'a': 'help_faq_debts_a6'.tr()},
      ],
    },
    {
      'section': 'help_faq_budget_title'.tr(),
      'items': [
        {
          'q': 'help_faq_budget_q1'.tr(),
          'a': 'help_faq_budget_a1'.tr()
        },
        {
          'q': 'help_faq_budget_q2'.tr(),
          'a': 'help_faq_budget_a2'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_goals_title'.tr(),
      'items': [
        {
          'q': 'help_faq_goals_q1'.tr(),
          'a': 'help_faq_goals_a1'.tr()
        },
        {
          'q': 'help_faq_goals_q2'.tr(),
          'a': 'help_faq_goals_a2'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_investments_title'.tr(),
      'items': [
        {
          'q': 'help_faq_investments_q1'.tr(),
          'a': 'help_faq_investments_a1'.tr()
        },
        {
          'q': 'help_faq_investments_q2'.tr(),
          'a': 'help_faq_investments_a2'.tr()
        },
        {
          'q': 'help_faq_investments_q3'.tr(),
          'a': 'help_faq_investments_a3'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_zakat_title'.tr(),
      'items': [
        {
          'q': 'help_faq_zakat_q1'.tr(),
          'a': 'help_faq_zakat_a1'.tr()
        },
        {
          'q': 'help_faq_zakat_q2'.tr(),
          'a': 'help_faq_zakat_a2'.tr()
        },
        {
          'q': 'help_faq_zakat_q3'.tr(),
          'a': 'help_faq_zakat_a3'.tr()
        },
      ],
    },
    {
      'section': 'help_faq_fire_title'.tr(),
      'items': [
        {'q': 'help_faq_fire_q1'.tr(), 'a': 'help_faq_fire_a1'.tr()},
        {'q': 'help_faq_fire_q2'.tr(), 'a': 'help_faq_fire_a2'.tr()},
        {'q': 'help_faq_fire_q3'.tr(), 'a': 'help_faq_fire_a3'.tr()},
      ],
    },
    {
      'section': 'help_faq_learn_title'.tr(),
      'items': [
        {'q': 'help_faq_learn_q1'.tr(), 'a': 'help_faq_learn_a1'.tr()},
        {'q': 'help_faq_learn_q2'.tr(), 'a': 'help_faq_learn_a2'.tr()},
      ],
    },
    {
      'section': 'help_faq_alerts_title'.tr(),
      'items': [
        {'q': 'help_faq_alerts_q1'.tr(), 'a': 'help_faq_alerts_a1'.tr()},
        {'q': 'help_faq_alerts_q2'.tr(), 'a': 'help_faq_alerts_a2'.tr()},
      ],
    },
  ];

  // _localizedFaqs is built in didChangeDependencies above

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

    final theme = Theme.of(context);
    final cs = theme.colorScheme;
    final bgColor = theme.scaffoldBackgroundColor;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: bgColor,
        elevation: 0,
        title: Text('help_title'.tr(),
            style: TextStyle(
                fontWeight: FontWeight.w900,
                color: cs.onSurface)),
        iconTheme: IconThemeData(color: cs.onSurface),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search Bar
            Container(
              decoration: BoxDecoration(
                  color: cs.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: cs.outlineVariant)),
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                style: TextStyle(color: cs.onSurface),
                decoration: InputDecoration(
                  hintText: 'help_search_hint'.tr(),
                  prefixIcon: Icon(Icons.search, color: cs.onSurfaceVariant),
                  hintStyle: TextStyle(color: cs.onSurfaceVariant.withValues(alpha: 0.6)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Contact Card
            GestureDetector(
              onTap: () async {
                final Uri emailUri = Uri(
                  scheme: 'mailto',
                  path: 'support@fajrak.com', 
                  queryParameters: {
                    'subject': 'طلب مساعدة - تطبيق فجرك',
                  },
                );
                try {
                  await launchUrl(emailUri);
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('help_email_error'.tr())),
                  );
                }
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.05),
                    border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2)),
                    borderRadius: BorderRadius.circular(16)),
                child: Row(
                  children: [
                    Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12)),
                        child: const Center(
                            child: Icon(Icons.support_agent,
                                color: AppColors.primary))),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('help_contact_title'.tr(),
                              style: TextStyle(
                                  color: cs.onSurface,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13)),
                          Text('help_contact_subtitle'.tr(),
                              style: TextStyle(
                                  color: cs.onSurfaceVariant,
                                  fontSize: 11)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios,
                        color: AppColors.textSecondary, size: 14),
                  ],
                ),
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
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w900,
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
    final cs = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _open
            ? cs.surface
            : cs.surface.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: _open
                ? cs.primary.withValues(alpha: 0.3)
                : cs.outlineVariant),
      ),
      child: Column(
        children: [
            ListTile(
            onTap: () => setState(() => _open = !_open),
            title: Text(widget.q,
                style: TextStyle(
                    color: _open ? cs.onSurface : cs.onSurfaceVariant,
                    fontWeight: _open ? FontWeight.w900 : FontWeight.w700,
                    fontSize: 13)),
            trailing: AnimatedRotation(
              duration: const Duration(milliseconds: 200),
              turns: _open ? 0.5 : 0,
              child: Icon(Icons.keyboard_arrow_down,
                  color: cs.onSurfaceVariant),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(widget.a,
                  style: TextStyle(
                      color: cs.onSurfaceVariant,
                      fontSize: 12,
                      height: 1.6)),
            ),
        ],
      ),
    );
  }
}
