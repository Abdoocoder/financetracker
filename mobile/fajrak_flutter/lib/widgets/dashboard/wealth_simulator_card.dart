import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
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
    // Compute once — shared by all 3 sliders to avoid 3x widget-tree traversal.
    final sliderTheme = SliderTheme.of(context).copyWith(
      activeTrackColor: colorScheme.primary,
      inactiveTrackColor: colorScheme.outlineVariant,
      thumbColor: colorScheme.primary,
      overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
      trackHeight: 4,
    );
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
              Icon(Icons.attach_money, size: 18, color: colorScheme.primary),
              const SizedBox(width: 8),
              Text('wealth_title'.tr(),
                  style: TextStyle(
                      color: colorScheme.onSurface,
                      fontWeight: FontWeight.w900,
                      fontSize: 14)),
            ],
          ),
          const SizedBox(height: 16),
          Center(
            child: Text(
              '${futureValue.toStringAsFixed(0)} ${widget.currency}',
              style: TextStyle(
                  color: isDark ? AppColors.success : colorScheme.primary,
                  fontSize: 26,
                  fontWeight: FontWeight.w900),
            ),
          ),
          Center(
            child: Text('wealth_simulator_subtitle'.tr(),
                style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 11)),
          ),
          const SizedBox(height: 24),
          _buildSlider('wealth_monthly_investment'.tr(), _monthlyContribution, 0, 5000,
              _monthlyContribution.toStringAsFixed(0), (val) {
            setState(() => _monthlyContribution = val);
          }, colorScheme, sliderTheme),
          _buildSlider(
              'wealth_expected_years'.tr(), _years, 1, 40, 'wealth_years_val'.tr(args: [_years.toStringAsFixed(0)]),
              (val) {
            setState(() => _years = val);
          }, colorScheme, sliderTheme),
          _buildSlider('wealth_expected_yield'.tr(), _expectedReturn, 1, 20,
              '${_expectedReturn.toStringAsFixed(1)}%', (val) {
            setState(() => _expectedReturn = val);
          }, colorScheme, sliderTheme),
        ],
      ),
    );
  }

  Widget _buildSlider(String label, double value, double min, double max,
      String formattedValue, ValueChanged<double> onChanged,
      ColorScheme colorScheme, SliderThemeData sliderTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 12)),
            Text(formattedValue,
                style: TextStyle(
                    color: colorScheme.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.bold)),
          ],
        ),
        SliderTheme(
          data: sliderTheme,
          child: Slider(value: value, min: min, max: max, onChanged: onChanged),
        ),
      ],
    );
  }
}
