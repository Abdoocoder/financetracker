import 'package:flutter/material.dart';
import 'dart:math';

class WealthSimulatorCard extends StatefulWidget {
  final String currency;

  const WealthSimulatorCard({
    super.key,
    required this.currency,
  });

  @override
  State<WealthSimulatorCard> createState() => _WealthSimulatorCardState();
}

class _WealthSimulatorCardState extends State<WealthSimulatorCard> {
  double _monthlyContribution = 100;
  double _years = 10;
  double _expectedReturn = 8;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    // FV = P * (((1 + r)^n - 1) / r) + Principal accumulation
    final double r = (_expectedReturn / 100) / 12;
    final int n = (_years * 12).toInt();
    final double p = _monthlyContribution;

    double futureValue = 0;
    if (r > 0) {
      futureValue = p * ((pow(1 + r, n) - 1) / r);
    } else {
      futureValue = p * n;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('💰', style: TextStyle(fontSize: 18)),
              const SizedBox(width: 8),
              Text('محاكي الثروة',
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'Cairo',
                      fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              '${futureValue.toStringAsFixed(0)} ${widget.currency}',
              style: TextStyle(
                  color: isDark ? const Color(0xFF10B981) : colorScheme.primary,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo'),
            ),
          ),
          Center(
            child: Text('الثروة المتوقعة بناءً على المعطيات',
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 11,
                    fontFamily: 'Cairo')),
          ),
          const SizedBox(height: 24),
          _buildSlider('الاستثمار الشهري', _monthlyContribution, 0, 5000,
              _monthlyContribution.toStringAsFixed(0), (val) {
            setState(() => _monthlyContribution = val);
          }, colorScheme),
          _buildSlider(
              'السنوات', _years, 1, 40, '${_years.toStringAsFixed(0)} سنة',
              (val) {
            setState(() => _years = val);
          }, colorScheme),
          _buildSlider('العائد السنوي المتوقع', _expectedReturn, 1, 20,
              '${_expectedReturn.toStringAsFixed(1)}%', (val) {
            setState(() => _expectedReturn = val);
          }, colorScheme),
        ],
      ),
    );
  }

  Widget _buildSlider(String label, double value, double min, double max,
      String formattedValue, ValueChanged<double> onChanged, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 12,
                    fontFamily: 'Cairo')),
            Text(formattedValue,
                style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Cairo')),
          ],
        ),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: colorScheme.primary,
            inactiveTrackColor: colorScheme.outlineVariant,
            thumbColor: colorScheme.primary,
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            trackHeight: 4,
          ),
          child: Slider(
            value: value,
            min: min,
            max: max,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }
}
