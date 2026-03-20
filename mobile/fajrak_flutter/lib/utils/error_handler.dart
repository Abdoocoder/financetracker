import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/analytics_service.dart';
import 'dart:developer' as dev;

class ErrorHandler {
  /// Standardized error handling method.
  /// Shows a Snackbar and logs the error to analytics.
  static void handle(dynamic error, {BuildContext? context, String? developerMessage}) {
    final String errorMessage = error.toString();
    dev.log('Error: $errorMessage', name: 'ErrorHandler', error: error);

    // Log to Supabase Analytics
    AnalyticsService.logError(
      error.runtimeType.toString(),
      errorMessage,
      {'developer_message': developerMessage},
    );

    if (context != null && context.mounted) {
      final isEn = context.locale.languageCode == 'en';
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  isEn ? 'Something went wrong. Please try again.' : 'حدث خطأ ما. يرجى المحاولة لاحقاً.',
                  style: const TextStyle(fontFamily: 'Cairo'),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: isEn ? 'Details' : 'التفاصيل',
            textColor: Colors.white,
            onPressed: () {
              _showErrorDialog(context, errorMessage, isEn);
            },
          ),
        ),
      );
    }
  }

  static void _showErrorDialog(BuildContext context, String message, bool isEn) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text(isEn ? 'Error Details' : 'تفاصيل الخطأ',
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: SingleChildScrollView(
          child: Text(message,
              style: const TextStyle(color: Color(0xFF94A3B8), fontFamily: 'Cairo', fontSize: 13)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(isEn ? 'Close' : 'إغلاق', style: const TextStyle(fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }
}
