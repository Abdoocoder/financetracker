import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';
import 'app_spacing.dart';
import 'app_radius.dart';

abstract final class AppTheme {
  static ThemeData get light => _build(Brightness.light);
  static ThemeData get dark  => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final primary          = isDark ? AppColors.primaryLight : AppColors.primary;
    final scaffoldBg       = isDark ? AppColors.bg0          : AppColors.bgLight;
    final surface          = isDark ? AppColors.card0        : AppColors.cardLight;
    final onSurface        = isDark ? Colors.white           : AppColors.textPrimaryLight;
    final onSurfaceVariant = isDark ? AppColors.textSecondary : AppColors.textSecondaryLight;
    final outlineVariant   = isDark ? AppColors.border       : AppColors.borderLight;
    final outline          = isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: scaffoldBg,
      fontFamily: 'IBMPlexSansArabic',
      fontFamilyFallback: const ['Cairo', 'Roboto', 'Noto Color Emoji', 'Noto Sans Arabic', 'sans-serif'],
      textTheme: AppTypography.textTheme,
      colorScheme: ColorScheme(
        brightness: brightness,
        primary: primary,
        onPrimary: Colors.white,
        primaryContainer: isDark ? AppColors.primaryDark : const Color(0xFFD6E8F7),
        onPrimaryContainer: isDark ? const Color(0xFFD6E8F7) : const Color(0xFF002244),
        secondary: AppColors.gold,
        onSecondary: isDark ? const Color(0xFF2D1F00) : Colors.white,
        secondaryContainer: isDark ? const Color(0xFF4D3500) : const Color(0xFFFFF3CD),
        onSecondaryContainer: isDark ? const Color(0xFFFFE082) : const Color(0xFF5C3D00),
        tertiary: AppColors.success,
        onTertiary: Colors.white,
        tertiaryContainer: isDark ? const Color(0xFF00594A) : const Color(0xFFD4F7ED),
        onTertiaryContainer: isDark ? const Color(0xFFD4F7ED) : const Color(0xFF003D2E),
        error: AppColors.error,
        onError: Colors.white,
        errorContainer: isDark ? const Color(0xFF7F1D1D) : const Color(0xFFFDECEA),
        onErrorContainer: isDark ? const Color(0xFFFCA5A5) : const Color(0xFF7A0000),
        surface: surface,
        onSurface: onSurface,
        onSurfaceVariant: onSurfaceVariant,
        outline: outline,
        outlineVariant: outlineVariant,
        inverseSurface: isDark ? Colors.white : AppColors.textPrimaryLight,
        onInverseSurface: isDark ? AppColors.textPrimaryLight : Colors.white,
        inversePrimary: isDark ? AppColors.primary : AppColors.primaryLight,
        shadow: Colors.black,
        scrim: Colors.black,
        surfaceTint: Colors.transparent,
      ),
      dividerColor: outlineVariant,

      // ── AppBar ─────────────────────────────────────────────
      appBarTheme: AppBarThemeData(
        backgroundColor: scaffoldBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: onSurface, size: 24),
        titleTextStyle: AppTypography.title3.copyWith(color: onSurface),
        surfaceTintColor: Colors.transparent,
      ),

      // ── Card — 0 elevation, 1 px border (Stripe style) ────
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
          side: BorderSide(color: outlineVariant),
        ),
      ),

      // ── Input ──────────────────────────────────────────────
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 4,
        ),
        border: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        labelStyle: AppTypography.callout.copyWith(color: onSurfaceVariant),
        hintStyle: AppTypography.callout.copyWith(color: onSurfaceVariant.withValues(alpha: 0.6)),
        errorStyle: AppTypography.caption1.copyWith(color: AppColors.error),
      ),

      // ── ElevatedButton ─────────────────────────────────────
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: Colors.transparent,
          minimumSize: const Size(double.infinity, AppSpacing.inputHeight),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
          textStyle: AppTypography.headline,
        ),
      ),

      // ── OutlinedButton ─────────────────────────────────────
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primary,
          minimumSize: const Size(double.infinity, AppSpacing.inputHeight),
          side: BorderSide(color: outlineVariant),
          shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
          textStyle: AppTypography.headline,
        ),
      ),

      // ── TextButton ─────────────────────────────────────────
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: AppTypography.callout.copyWith(fontWeight: FontWeight.w600),
          minimumSize: const Size(44, 44),
        ),
      ),

      // ── FloatingActionButton ───────────────────────────────
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        focusElevation: 0,
        hoverElevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
      ),

      // ── BottomNavigationBar (M2, for existing screens) ────
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: primary,
        unselectedItemColor: onSurfaceVariant,
        elevation: 0,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: AppTypography.caption1.copyWith(fontWeight: FontWeight.w600),
        unselectedLabelStyle: AppTypography.caption1,
      ),

      // ── NavigationBar (M3) ─────────────────────────────────
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: primary.withValues(alpha: 0.15),
        elevation: 0,
        height: AppSpacing.navBarHeight,
        surfaceTintColor: Colors.transparent,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
          color: states.contains(WidgetState.selected) ? primary : onSurfaceVariant,
          size: 24,
        )),
        labelTextStyle: WidgetStateProperty.resolveWith((states) =>
          AppTypography.caption1.copyWith(
            fontWeight: states.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w400,
            color: states.contains(WidgetState.selected) ? primary : onSurfaceVariant,
          ),
        ),
      ),

      // ── Chip ───────────────────────────────────────────────
      chipTheme: ChipThemeData(
        backgroundColor: surface,
        selectedColor: primary.withValues(alpha: 0.15),
        disabledColor: outlineVariant.withValues(alpha: 0.5),
        labelStyle: AppTypography.caption1.copyWith(fontWeight: FontWeight.w500),
        side: BorderSide(color: outlineVariant),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderPill),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 2),
      ),

      // ── ListTile ───────────────────────────────────────────
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        titleTextStyle: AppTypography.callout.copyWith(color: onSurface, fontWeight: FontWeight.w500),
        subtitleTextStyle: AppTypography.footnote.copyWith(color: onSurfaceVariant),
        iconColor: onSurfaceVariant,
        minLeadingWidth: 24,
        minTileHeight: AppSpacing.tapTarget,
      ),

      // ── Switch ─────────────────────────────────────────────
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) =>
          states.contains(WidgetState.selected) ? primary : onSurfaceVariant,
        ),
        trackColor: WidgetStateProperty.resolveWith((states) =>
          states.contains(WidgetState.selected)
            ? primary.withValues(alpha: 0.35)
            : outlineVariant,
        ),
      ),

      // ── Divider ────────────────────────────────────────────
      dividerTheme: DividerThemeData(
        color: outlineVariant,
        thickness: 1,
        space: 1,
      ),

      // ── SnackBar ───────────────────────────────────────────
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? AppColors.card1 : AppColors.textPrimaryLight,
        contentTextStyle: AppTypography.footnote.copyWith(color: Colors.white),
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
        elevation: 0,
      ),

      // ── BottomSheet ────────────────────────────────────────
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: surface,
        modalBackgroundColor: surface,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        showDragHandle: true,
        dragHandleColor: outlineVariant,
      ),

      // ── Dialog ─────────────────────────────────────────────
      dialogTheme: DialogThemeData(
        backgroundColor: surface,
        elevation: 0,
        shape: const RoundedRectangleBorder(borderRadius: AppRadius.borderXl),
        titleTextStyle: AppTypography.title3.copyWith(color: onSurface),
        contentTextStyle: AppTypography.body.copyWith(color: onSurfaceVariant),
      ),

      // ── Tooltip ────────────────────────────────────────────
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: isDark ? AppColors.card1 : AppColors.textPrimaryLight,
          borderRadius: AppRadius.borderSm,
        ),
        textStyle: AppTypography.caption1.copyWith(color: Colors.white),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
      ),

      // ── ProgressIndicator ──────────────────────────────────
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: outlineVariant,
        circularTrackColor: outlineVariant,
      ),
    );
  }
}
