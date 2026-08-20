import 'dart:math';
import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';

// ── Confetti Particle ──────────────────────────────────────────────────────
class _Particle {
  final double x;
  final double startY;
  final double size;
  final Color color;
  final bool isCircle;
  final double freq;
  final double phase;
  final double rotSpeed;

  _Particle({
    required this.x,
    required this.startY,
    required this.size,
    required this.color,
    required this.isCircle,
    required this.freq,
    required this.phase,
    required this.rotSpeed,
  });
}

// ── Confetti Painter ───────────────────────────────────────────────────────
class _ConfettiPainter extends CustomPainter {
  final double progress;
  final List<_Particle> particles;

  _ConfettiPainter(this.progress, this.particles);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final rawY = p.startY + progress * (size.height + 60);
      final y = rawY % (size.height + 60) - 20;
      final x = p.x * size.width + sin(progress * pi * 2 * p.freq + p.phase) * 28;
      final opacity = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) / 0.2);
      final paint = Paint()..color = p.color.withValues(alpha: opacity.clamp(0.0, 1.0));

      canvas.save();
      canvas.translate(x, y);
      canvas.rotate(progress * p.rotSpeed);
      if (p.isCircle) {
        canvas.drawCircle(Offset.zero, p.size / 2, paint);
      } else {
        canvas.drawRect(
          Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 0.55),
          paint,
        );
      }
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.progress != progress;
}

// ── Celebration Dialog ─────────────────────────────────────────────────────
class DebtCelebrationDialog extends StatefulWidget {
  final String name;
  const DebtCelebrationDialog({super.key, required this.name});

  @override
  State<DebtCelebrationDialog> createState() => _DebtCelebrationDialogState();
}

class _DebtCelebrationDialogState extends State<DebtCelebrationDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<_Particle> _particles;

  static const _colors = [
    Color(0xFF10B981),
    Color(0xFF3B7EF6),
    Color(0xFFF59E0B),
    Color(0xFF8B5CF6),
    Color(0xFFEF4444),
    Color(0xFF06B6D4),
  ];

  @override
  void initState() {
    super.initState();
    final rng = Random();
    _particles = List.generate(40, (_) => _Particle(
      x: rng.nextDouble(),
      startY: -rng.nextDouble() * 60,
      size: rng.nextDouble() * 8 + 5,
      color: _colors[rng.nextInt(_colors.length)],
      isCircle: rng.nextBool(),
      freq: rng.nextDouble() * 2 + 1,
      phase: rng.nextDouble() * pi * 2,
      rotSpeed: (rng.nextDouble() * 8 + 4) * (rng.nextBool() ? 1 : -1),
    ));

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3500),
    )..forward();

    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) Navigator.of(context).pop();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // ── طبقة الـ confetti ──
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) => CustomPaint(
                painter: _ConfettiPainter(_controller.value, _particles),
              ),
            ),
          ),
        ),

        // ── الـ dialog ──
        AlertDialog(
          backgroundColor: const Color(0xFF0F1629),
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: const BorderSide(color: Color(0xFF10B981), width: 1.5)),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const SizedBox(height: 8),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.5, end: 1.0),
              duration: const Duration(milliseconds: 600),
              curve: Curves.elasticOut,
              builder: (_, v, child) => Transform.scale(scale: v, child: child),
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.4), width: 2),
                  boxShadow: [
                    BoxShadow(
                        color: const Color(0xFF10B981).withValues(alpha: 0.35),
                        blurRadius: 24,
                        spreadRadius: 6)
                  ],
                ),
                child: const Center(
                    child: Icon(Icons.emoji_events, size: 40, color: Color(0xFF10B981))),
              ),
            ),
            const SizedBox(height: 16),
            Text('debts_celebration_title'.tr(),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('"${widget.name}"',
                style: const TextStyle(
                    color: Color(0xFF10B981),
                    fontWeight: FontWeight.w700,
                    fontSize: 16)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12)),
              child: Text(
                'debts_celebration_msg'.tr(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 12,
                    height: 1.6),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12))),
                  onPressed: () => Navigator.pop(context),
                  child: Text('debts_celebration_btn'.tr(),
                      style: const TextStyle(
                          fontWeight: FontWeight.w900)),
                )),
            const SizedBox(height: 8),
          ]),
        ),
      ],
    );
  }
}
