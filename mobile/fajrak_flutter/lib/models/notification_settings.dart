enum NotificationCategory {
  BudgetAlert,
  DebtReminder,
  SavingGoal,
  SystemUpdate,
  SecurityAlert
}

class NotificationPreference {
  final String userId;
  final NotificationCategory category;
  final bool enabled;
  final String priority;
  final String? quietStart;
  final String? quietEnd;
  final bool maskSensitiveData;

  NotificationPreference({
    required this.userId,
    required this.category,
    this.enabled = true,
    this.priority = 'default',
    this.quietStart,
    this.quietEnd,
    this.maskSensitiveData = false,
  });

  factory NotificationPreference.fromJson(Map<String, dynamic> json) {
    return NotificationPreference(
      userId: json['user_id'],
      category: _parseCategory(json['category']),
      enabled: json['enabled'] ?? true,
      priority: json['priority'] ?? 'default',
      quietStart: json['quiet_start'],
      quietEnd: json['quiet_end'],
      mask_sensitive_data: json['mask_sensitive_data'] ?? false,
    );
  }

  static NotificationCategory _parseCategory(String category) {
    return NotificationCategory.values.firstWhere(
      (e) => e.toString().split('.').last == category,
      orElse: () => NotificationCategory.SystemUpdate,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'category': category.toString().split('.').last,
      'enabled': enabled,
      'priority': priority,
      'quiet_start': quietStart,
      'quiet_end': quietEnd,
      'mask_sensitive_data': maskSensitiveData,
    };
  }
}
