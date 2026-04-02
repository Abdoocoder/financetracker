import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../app_state.dart';
import '../../screens/alerts/alerts_screen.dart';
import '../common/glass_panel.dart';

class DashboardHeader extends StatelessWidget {
  final String name;

  const DashboardHeader({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final unreadCount = context.watch<AppState>().unreadAlerts;
    final isAr = context.locale.languageCode == 'ar';

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              name.isNotEmpty ? 'dash_welcome'.tr(args: [name]) : 'dash_title'.tr(),
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: colorScheme.onSurface,
                fontFamily: 'Cairo',
              ),
            ),
            Text(
              'dash_subtitle'.tr(),
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurfaceVariant,
                fontFamily: 'Cairo',
              ),
            ),
          ],
        ),
        Row(
          children: [
            // Language Toggle
            GestureDetector(
              onTap: () async {
                final newLocale = isAr ? const Locale('en') : const Locale('ar');
                await context.setLocale(newLocale);
                if (context.mounted) {
                  context.read<AppState>().setLocale(newLocale);
                }
              },
              child: GlassPanel(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                borderRadius: 12,
                blur: 8,
                opacity: 0.1,
                color: colorScheme.surface,
                borderColor: colorScheme.outlineVariant.withValues(alpha: 0.3),
                child: Text(
                  isAr ? 'EN' : 'AR',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Alerts Bell
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AlertsScreen()),
                );
              },
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  GlassPanel(
                    borderRadius: 12,
                    blur: 8,
                    opacity: 0.1,
                    color: colorScheme.surface,
                    borderColor: colorScheme.outlineVariant.withValues(alpha: 0.3),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: Icon(Icons.notifications_none, color: colorScheme.onSurface),
                    ),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      top: -4,
                      right: -4,
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: const BoxDecoration(
                          color: Color(0xFFEF4444),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$unreadCount',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
