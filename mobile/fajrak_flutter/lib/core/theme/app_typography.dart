import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const _f = 'IBMPlexSansArabic';
  static const List<String> _fallback = ['Cairo', 'Roboto', 'Noto Color Emoji', 'Noto Sans Arabic', 'sans-serif'];
  static const List<FontFeature> _tabular = [FontFeature.tabularFigures()];

  // ── Apple HIG 11-Level Scale ───────────────────────────────
  static const TextStyle largeTitle = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 34, fontWeight: FontWeight.w700, letterSpacing: -0.5,
  );
  static const TextStyle title1 = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.3,
  );
  static const TextStyle title2 = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 22, fontWeight: FontWeight.w700,
  );
  static const TextStyle title3 = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 20, fontWeight: FontWeight.w600,
  );
  static const TextStyle headline = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 17, fontWeight: FontWeight.w600,
  );
  static const TextStyle body = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 17, fontWeight: FontWeight.w400, height: 1.5,
  );
  static const TextStyle callout = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 16, fontWeight: FontWeight.w400,
  );
  static const TextStyle subheadline = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 15, fontWeight: FontWeight.w400,
  );
  static const TextStyle footnote = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 13, fontWeight: FontWeight.w400, height: 1.5,
  );
  static const TextStyle caption1 = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 12, fontWeight: FontWeight.w400,
  );
  static const TextStyle caption2 = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 11, fontWeight: FontWeight.w400,
  );

  // ── Stripe Currency Styles (tabular figures, tight tracking) ─
  static const TextStyle amountXl = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 36, fontWeight: FontWeight.w700, letterSpacing: -1.0,
    fontFeatures: _tabular,
  );
  static const TextStyle amountLg = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.5,
    fontFeatures: _tabular,
  );
  static const TextStyle amount = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.3,
    fontFeatures: _tabular,
  );
  static const TextStyle amountSm = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 16, fontWeight: FontWeight.w600, letterSpacing: -0.2,
    fontFeatures: _tabular,
  );
  static const TextStyle amountXs = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: -0.1,
    fontFeatures: _tabular,
  );

  // ── Material 3 TextTheme ────────────────────────────────────
  static const TextTheme textTheme = TextTheme(
    displayLarge:  largeTitle,
    displayMedium: title1,
    displaySmall:  title2,
    headlineLarge:  title2,
    headlineMedium: title3,
    headlineSmall:  headline,
    titleLarge:  headline,
    titleMedium: callout,
    titleSmall:  subheadline,
    bodyLarge:  body,
    bodyMedium: callout,
    bodySmall:  footnote,
    labelLarge:  TextStyle(fontFamily: _f, fontFamilyFallback: _fallback, fontSize: 15, fontWeight: FontWeight.w500),
    labelMedium: TextStyle(fontFamily: _f, fontFamilyFallback: _fallback, fontSize: 12, fontWeight: FontWeight.w500),
    labelSmall:  TextStyle(fontFamily: _f, fontFamilyFallback: _fallback, fontSize: 11, fontWeight: FontWeight.w500),
  );
}
