import 'package:intl/intl.dart';

class DateFormatter {
  static String formatHeaderDate(DateTime date) {
    return DateFormat('EEEE، d MMMM yyyy', 'ar').format(date);
    // → الأربعاء، ١٨ مايو ٢٠٢٦
  }

  static String formatShort(DateTime date) {
    return DateFormat('d MMM yyyy', 'ar').format(date);
    // → ١٨ مايو ٢٠٢٦
  }

  static String formatRelative(DateTime date) {
    final diff = DateTime.now().difference(date).inDays;
    if (diff == 0) return 'اليوم';
    if (diff == 1) return 'أمس';
    if (diff < 7) return 'منذ $diff أيام';
    return DateFormatter.formatShort(date);
  }
}
