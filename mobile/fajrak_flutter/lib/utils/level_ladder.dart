/// Canonical client-side gamification ladder — single source of truth for the
/// Dashboard gamification card and the Achievements screen.
///
/// Mirrors getLevel() in app/api/gamification/route.ts and the inline ladder
/// that achievements_screen.dart previously duplicated, so both screens can
/// never disagree again (the "برونزي / 35 نقطة" vs "ثري مبتدئ / 800 نقطة" bug).
///
/// Titles are the same wording as the API's title_ar values without the emoji
/// prefix, matching what Achievements displays via its user_stats fallback.
class GamificationLevel {
  const GamificationLevel({
    required this.level,
    required this.title,
    required this.minPoints,
    required this.nextPoints,
  });

  /// 1-based level number (1..6).
  final int level;

  /// Arabic level title, identical to Achievements' display.
  final String title;

  /// Inclusive lower bound of this level in total_points.
  final int minPoints;

  /// total_points required for the next level; 9999 is the max-level sentinel
  /// shared with the API and LevelCard.
  final int nextPoints;

  bool get isMax => nextPoints >= 9999;

  /// Progress toward the next level, using the exact formula LevelCard uses
  /// (`points / nextLevel`, full bar at max level).
  double progress(int points) => isMax ? 1.0 : (points / nextPoints).clamp(0.0, 1.0);
}

/// Returns the ladder entry for [points] (total_points from user_stats).
GamificationLevel levelForPoints(int points) {
  if (points >= 1200) {
    return const GamificationLevel(level: 6, title: 'حر مالياً', minPoints: 1200, nextPoints: 9999);
  }
  if (points >= 700) {
    return const GamificationLevel(level: 5, title: 'ثري مبتدئ', minPoints: 700, nextPoints: 1200);
  }
  if (points >= 350) {
    return const GamificationLevel(level: 4, title: 'مستثمر', minPoints: 350, nextPoints: 700);
  }
  if (points >= 150) {
    return const GamificationLevel(level: 3, title: 'مدخر', minPoints: 150, nextPoints: 350);
  }
  if (points >= 50) {
    return const GamificationLevel(level: 2, title: 'متتبع', minPoints: 50, nextPoints: 150);
  }
  return const GamificationLevel(level: 1, title: 'مبتدئ', minPoints: 0, nextPoints: 50);
}
