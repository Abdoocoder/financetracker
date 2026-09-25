import 'package:flutter/material.dart';

abstract final class AppTypography {
  static const _f = 'IBMPlexSansArabic';
  static const List<String> _fallback = ['Cairo', 'Roboto', 'Noto Color Emoji', 'Noto Sans Arabic', 'sans-serif'];
  static const List<FontFeature> _tabular = [FontFeature.tabularFigures()];

  // ── 4 Semantic Sizes (Apple HIG aligned) ─────────────────────
  // Display: 28 — Screen titles, hero numbers
  static const TextStyle display = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 28, fontWeight: FontWeight.w600, letterSpacing: -0.3,
  );

  // Heading: 20 — Section headers, card titles
  static const TextStyle heading = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 20, fontWeight: FontWeight.w600,
  );

  // Body: 17 — Primary content, buttons, list items
  static const TextStyle body = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 17, fontWeight: FontWeight.w400, height: 1.5,
  );

  // BodySemiBold: 17 — Button labels, emphasized text
  static const TextStyle bodySemiBold = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 17, fontWeight: FontWeight.w600, height: 1.5,
  );

  // Caption: 12 — Metadata, chips, nav labels, small hints
  static const TextStyle caption = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 12, fontWeight: FontWeight.w400,
  );

  // CaptionSemiBold: 12 — Chip labels, emphasized metadata
  static const TextStyle captionSemiBold = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 12, fontWeight: FontWeight.w600,
  );

  // LabelLarge: 13 w600 — For Material labelLarge role
  static const TextStyle labelLarge = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 13, fontWeight: FontWeight.w600,
  );

  // Footnote: 13 — Small metadata, timestamps (between caption and body)
  static const TextStyle footnote = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 13, fontWeight: FontWeight.w400, height: 1.5,
  );

  // ── Currency / Amount Styles (reuse semantic sizes, add tabular) ──
  static const TextStyle amountXl = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 28, fontWeight: FontWeight.w600, letterSpacing: -0.5,
    fontFeatures: _tabular,
  ); // maps to display

  static const TextStyle amountLg = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: -0.3,
    fontFeatures: _tabular,
  ); // maps to heading

  static const TextStyle amount = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: -0.2,
    fontFeatures: _tabular,
  ); // maps to bodySemiBold

  static const TextStyle amountSm = TextStyle(
    fontFamily: _f, fontFamilyFallback: _fallback,
    fontSize: 12, fontWeight: FontWeight.w600,
    fontFeatures: _tabular,
  ); // maps to captionSemiBold

  // ── Material 3 TextTheme ──────────────────────────────────────
  static const TextTheme textTheme = TextTheme(
    displayLarge:  display,
    displayMedium: display,
    displaySmall:  heading,
    headlineLarge: heading,
    headlineMedium: heading,
    headlineSmall: bodySemiBold,
    titleLarge:  bodySemiBold,
    titleMedium: body,
    titleSmall:  body,
    bodyLarge:  body,
    bodyMedium: body,
    bodySmall:  footnote,
    labelLarge:  labelLarge,
    labelMedium: captionSemiBold,
    labelSmall:  caption,
  );
}