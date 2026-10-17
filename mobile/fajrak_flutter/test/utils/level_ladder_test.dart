import 'package:fajrak/utils/level_ladder.dart';
import 'package:flutter_test/flutter_test.dart';

/// The ladder must stay byte-identical to the fallback ladder that
/// achievements_screen.dart used inline, and to getLevel() in
/// app/api/gamification/route.ts (minus the API's emoji prefixes) —
/// that identity is the fix for the Dashboard-vs-Achievements mismatch.
void main() {
  group('levelForPoints', () {
    test('maps boundary points onto the canonical 50/150/350/700/1200 ladder', () {
      const cases = <int, List<Object>>{
        0: [1, 'مبتدئ', 50],
        49: [1, 'مبتدئ', 50],
        50: [2, 'متتبع', 150],
        149: [2, 'متتبع', 150],
        150: [3, 'مدخر', 350],
        349: [3, 'مدخر', 350],
        350: [4, 'مستثمر', 700],
        699: [4, 'مستثمر', 700],
        700: [5, 'ثري مبتدئ', 1200],
        800: [5, 'ثري مبتدئ', 1200],
        1199: [5, 'ثري مبتدئ', 1200],
        1200: [6, 'حر مالياً', 9999],
        5000: [6, 'حر مالياً', 9999],
      };

      cases.forEach((points, expected) {
        final info = levelForPoints(points);
        expect(info.level, expected[0], reason: 'points=$points');
        expect(info.title, expected[1], reason: 'points=$points');
        expect(info.nextPoints, expected[2], reason: 'points=$points');
        expect(info.minPoints, lessThanOrEqualTo(points),
            reason: 'points=$points');
      });
    });

    test('progress uses the LevelCard formula (points / next, 1.0 at max)', () {
      expect(levelForPoints(800).progress(800), closeTo(800 / 1200, 1e-9));
      expect(levelForPoints(35).progress(35), closeTo(35 / 50, 1e-9));
      expect(levelForPoints(1200).progress(1200), 1.0);
      expect(levelForPoints(5000).progress(5000), 1.0);
    });

    test('isMax is true only for level 6', () {
      expect(levelForPoints(1199).isMax, isFalse);
      expect(levelForPoints(1200).isMax, isTrue);
    });
  });
}
