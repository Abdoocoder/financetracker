import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../app_state.dart';
import '../../screens/alerts/alerts_screen.dart';
import '../common/glass_panel.dart';

class DashboardHeader extends StatefulWidget {
  final String name;

  const DashboardHeader({super.key, required this.name});

  @override
  State<DashboardHeader> createState() => _DashboardHeaderState();
}

class _DashboardHeaderState extends State<DashboardHeader> {
  bool _bellPressed = false;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final unreadCount = context.watch<AppState>().unreadAlerts;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.name.isNotEmpty ? 'dash_welcome'.tr(args: [widget.name]) : 'dash_title'.tr(),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                  letterSpacing: -0.3,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                'dash_subtitle'.tr(),
                style: TextStyle(
                  fontSize: 13,
                  color: colorScheme.onSurfaceVariant,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AlertsScreen()),
            );
          },
          onTapDown: (_) => setState(() => _bellPressed = true),
          onTapUp: (_) => setState(() => _bellPressed = false),
          onTapCancel: () => setState(() => _bellPressed = false),
          child: AnimatedScale(
            scale: _bellPressed && !reduceMotion ? 0.93 : 1.0,
            duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 120),
            curve: Curves.easeOut,
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
                    child: Icon(
                      unreadCount > 0 ? Icons.notifications_rounded : Icons.notifications_none_rounded,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                if (unreadCount > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.all(5),
                      decoration: const BoxDecoration(
                        color: AppColors.error,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
