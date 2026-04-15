import 'package:flutter/material.dart';

/// Centralized semantic color constants.
/// Always prefer colorScheme from Theme.of(context) in widgets.
/// Use these constants only in contexts where BuildContext is unavailable
/// (e.g., static lists, data maps).
abstract final class AppColors {
  // ── Brand ──────────────────────────────────────────────────
  static const primary   = Color(0xFF3B7EF6); // colorScheme.primary
  static const secondary = Color(0xFF10B981); // colorScheme.secondary (success/income)

  // ── Semantic ───────────────────────────────────────────────
  static const success = Color(0xFF10B981); // income, positive balance
  static const error   = Color(0xFFEF4444); // expense, negative, delete
  static const warning = Color(0xFFF59E0B); // budget warning, amber
  static const purple  = Color(0xFF8B5CF6); // savings, investments
  static const cyan    = Color(0xFF06B6D4); // transfers

  // ── Text / Neutral ─────────────────────────────────────────
  static const textMuted    = Color(0xFF94A3B8); // colorScheme.onSurfaceVariant (light)
  static const textSecondary = Color(0xFF64748B); // colorScheme.onSurfaceVariant (dark)
  static const textTertiary  = Color(0xFF475569); // subtle text, labels
  static const textDisabled  = Color(0xFF9CA3AF); // disabled state

  // ── Surface / Background (dark theme palette) ─────────────
  static const surface0 = Color(0xFF0F1629); // deepest background
  static const surface1 = Color(0xFF0F172A); // page background
  static const surface2 = Color(0xFF1E293B); // card background

  // ── Semantic tints (light variants for backgrounds) ───────
  static const successLight = Color(0xFF6EE7B7); // income tint / paid debt
  static const errorLight   = Color(0xFFFCA5A5); // expense tint / overdue
  static const successDark  = Color(0xFF059669); // darker green for text on light
  static const warningDark  = Color(0xFF92400E); // dark amber for text on light

  // ── Extended palette ──────────────────────────────────────
  static const sky    = Color(0xFF38BDF8); // light blue accent
  static const gold   = Color(0xFFFFD700); // gold badge
  static const silver = Color(0xFFC0C0C0); // silver badge
  static const bronze = Color(0xFFCD7F32); // bronze badge

  // ── Account type palette (user-facing, intentional) ────────
  static const List<Color> accountPalette = [
    Color(0xFF3B7EF6),
    Color(0xFF10B981),
    Color(0xFF8B5CF6),
    Color(0xFFF59E0B),
    Color(0xFFEF4444),
    Color(0xFF06B6D4),
  ];
}
