import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../common/glass_panel.dart';
import 'nav_item_widget.dart';

class MainBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabSelected;

  const MainBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return GlassPanel(
      borderRadius: 0,
      blur: 20,
      opacity: 0.8,
      topBorderOnly: true,
      color: colorScheme.surface,
      borderColor: colorScheme.outlineVariant.withValues(alpha: 0.2),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              NavItemWidget(
                index: 0,
                icon: Icons.more_horiz,
                selectedIcon: Icons.more_horiz,
                label: 'nav_settings'.tr(),
                currentIndex: currentIndex,
                onTap: onTabSelected,
              ),
              NavItemWidget(
                index: 1,
                icon: Icons.account_balance_wallet_outlined,
                selectedIcon: Icons.account_balance_wallet,
                label: 'nav_accounts'.tr(),
                currentIndex: currentIndex,
                onTap: onTabSelected,
              ),
              NavItemWidget(
                index: 2,
                icon: Icons.credit_card_outlined,
                selectedIcon: Icons.credit_card,
                label: 'nav_debts'.tr(),
                currentIndex: currentIndex,
                onTap: onTabSelected,
              ),
              NavItemWidget(
                index: 3,
                icon: Icons.swap_vert,
                selectedIcon: Icons.swap_vert,
                label: 'nav_transactions'.tr(),
                currentIndex: currentIndex,
                onTap: onTabSelected,
              ),
              NavItemWidget(
                index: 4,
                icon: Icons.dashboard_outlined,
                selectedIcon: Icons.dashboard,
                label: 'nav_home'.tr(),
                currentIndex: currentIndex,
                onTap: onTabSelected,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
