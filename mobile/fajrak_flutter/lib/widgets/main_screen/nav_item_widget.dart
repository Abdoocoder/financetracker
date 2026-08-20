import 'package:flutter/material.dart';

class NavItemWidget extends StatefulWidget {
  final int index;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const NavItemWidget({
    super.key,
    required this.index,
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  State<NavItemWidget> createState() => _NavItemWidgetState();
}

class _NavItemWidgetState extends State<NavItemWidget> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final isSelected = widget.currentIndex == widget.index;
    final colorScheme = Theme.of(context).colorScheme;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final animDuration = reduceMotion ? Duration.zero : const Duration(milliseconds: 180);
    final pressDuration = reduceMotion ? Duration.zero : const Duration(milliseconds: 120);

    return Semantics(
      label: widget.label,
      selected: isSelected,
      button: true,
      child: GestureDetector(
        onTap: () => widget.onTap(widget.index),
        onTapDown: (_) => setState(() => _pressed = true),
        onTapUp: (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        behavior: HitTestBehavior.opaque,
        child: AnimatedScale(
          scale: _pressed && !reduceMotion ? 0.92 : 1.0,
          duration: pressDuration,
          curve: Curves.easeOut,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: animDuration,
                curve: Curves.easeOut,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? colorScheme.primary.withValues(alpha: 0.14)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isSelected ? widget.selectedIcon : widget.icon,
                  color: isSelected ? colorScheme.primary : colorScheme.onSurfaceVariant,
                  size: 24,
                ),
              ),
              const SizedBox(height: 2),
              AnimatedDefaultTextStyle(
                duration: animDuration,
                curve: Curves.easeOut,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  color: isSelected ? colorScheme.primary : colorScheme.onSurfaceVariant,
                ),
                child: Text(widget.label),
              ),
              AnimatedContainer(
                duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                margin: const EdgeInsets.only(top: 3),
                width: isSelected ? 16 : 0,
                height: 3,
                decoration: BoxDecoration(
                  color: colorScheme.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
