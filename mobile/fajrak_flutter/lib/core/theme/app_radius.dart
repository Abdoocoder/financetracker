import 'package:flutter/material.dart';

abstract final class AppRadius {
  // ── Radius values ──────────────────────────────────────────
  static const double xs   = 4.0;
  static const double sm   = 8.0;
  static const double md   = 12.0;
  static const double lg   = 16.0;
  static const double xl   = 24.0;
  static const double full = 999.0; // pills, chips, badges

  // ── const BorderRadius (for use in const constructors) ────
  static const BorderRadius borderXs   = BorderRadius.all(Radius.circular(xs));
  static const BorderRadius borderSm   = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius borderMd   = BorderRadius.all(Radius.circular(md));
  static const BorderRadius borderLg   = BorderRadius.all(Radius.circular(lg));
  static const BorderRadius borderXl   = BorderRadius.all(Radius.circular(xl));
  static const BorderRadius borderPill = BorderRadius.all(Radius.circular(full));

  // ── BorderRadius.circular getters (non-const, for non-const sites) ─
  static BorderRadius get circularXs   => BorderRadius.circular(xs);
  static BorderRadius get circularSm   => BorderRadius.circular(sm);
  static BorderRadius get circularMd   => BorderRadius.circular(md);
  static BorderRadius get circularLg   => BorderRadius.circular(lg);
  static BorderRadius get circularXl   => BorderRadius.circular(xl);
  static BorderRadius get pill         => BorderRadius.circular(full);
}
