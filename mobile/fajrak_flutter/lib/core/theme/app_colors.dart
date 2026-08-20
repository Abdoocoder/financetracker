import 'package:flutter/material.dart';

abstract final class AppColors {
  // ── Brand ──────────────────────────────────────────────────
  static const primary      = Color(0xFF1A5F8A); // Islamic Blue
  static const primaryLight = Color(0xFF2B7BB5); // lighter variant (dark-mode primary)
  static const primaryDark  = Color(0xFF124A6E); // pressed / tinted container
  static const gold         = Color(0xFFD4A843); // warm gold accent
  static const goldLight    = Color(0xFFF5D980); // gold tint / container

  // ── Semantic ───────────────────────────────────────────────
  static const success  = Color(0xFF10B981); // income, positive
  static const error    = Color(0xFFEF4444); // expense, danger, delete
  static const warning  = Color(0xFFF59E0B); // caution, budget near-limit
  static const info     = Color(0xFF3B82F6); // neutral informational
  static const purple   = Color(0xFF8B5CF6); // savings / investments
  static const cyan     = Color(0xFF06B6D4); // transfers / misc

  // ── Dark-mode surfaces ─────────────────────────────────────
  static const bg0   = Color(0xFF070B14); // deepest scaffold background
  static const bg1   = Color(0xFF0F1629); // page background
  static const card0 = Color(0xFF131C31); // default card
  static const card1 = Color(0xFF1A2540); // elevated card / modal
  static const border = Color(0xFF1E293B); // 1 px Stripe-style border (dark)

  // ── Light-mode surfaces ────────────────────────────────────
  static const bgLight     = Color(0xFFF8FAFC);
  static const cardLight   = Color(0xFFFFFFFF);
  static const borderLight = Color(0xFFE2E8F0); // 1 px Stripe-style border (light)

  // ── Text (dark) ────────────────────────────────────────────
  static const textPrimary   = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFF94A3B8);
  static const textMuted     = Color(0xFF64748B);
  static const textDisabled  = Color(0xFF475569);

  // ── Text (light) ──────────────────────────────────────────
  static const textPrimaryLight   = Color(0xFF0F172A);
  static const textSecondaryLight = Color(0xFF475569);
  static const textMutedLight     = Color(0xFF94A3B8);

  // ── Category colors ────────────────────────────────────────
  static const catFood          = Color(0xFFF97316);
  static const catTransport     = Color(0xFF3B82F6);
  static const catShopping      = Color(0xFFEC4899);
  static const catHealth        = Color(0xFF10B981);
  static const catEntertainment = Color(0xFF8B5CF6);
  static const catBills         = Color(0xFF64748B);
  static const catSavings       = Color(0xFF059669);
  static const catInvestment    = Color(0xFF1A5F8A);
  static const catOther         = Color(0xFF94A3B8);

  // ── Account type palette ───────────────────────────────────
  static const List<Color> accountPalette = [
    Color(0xFF1A5F8A),
    Color(0xFF10B981),
    Color(0xFF8B5CF6),
    Color(0xFFD4A843),
    Color(0xFFEF4444),
    Color(0xFF06B6D4),
  ];

  // ── Legacy aliases (keep existing widgets compiling) ───────
  static const secondary    = success;
  static const surface0     = Color(0xFF0F1629);
  static const surface1     = Color(0xFF0F172A);
  static const surface2     = Color(0xFF1E293B);
  static const textTertiary = Color(0xFF475569);
  static const successLight = Color(0xFF6EE7B7);
  static const errorLight   = Color(0xFFFCA5A5);
  static const successDark  = Color(0xFF059669);
  static const warningDark  = Color(0xFF92400E);
  static const sky          = Color(0xFF38BDF8);
  static const silver       = Color(0xFFC0C0C0);
  static const bronze       = Color(0xFFCD7F32);
}
