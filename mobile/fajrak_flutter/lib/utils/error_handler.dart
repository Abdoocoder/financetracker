import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/analytics_service.dart';
import 'dart:developer' as dev;

class ErrorHandler {
  /// Standardized error handling method.
  /// Shows a Snackbar and logs the error to analytics.
  static void handle(dynamic error, {StackTrace? st, BuildContext? context, String? developerMessage}) {
    final String errorMessage = error.toString();
    dev.log('Error: $errorMessage', name: 'ErrorHandler', error: error, stackTrace: st);

    // Log to Supabase Analytics
    AnalyticsService.logError(
      error.runtimeType.toString(),
      errorMessage,
      {'developer_message': developerMessage},
    );

    if (context != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'error_generic'.tr(),
                  style: const TextStyle(fontFamily: 'Cairo'),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 4),
          action: SnackBarAction(
            label: 'error_details'.tr(),
            textColor: Colors.white,
            onPressed: () {
              _showErrorDialog(context, errorMessage);
            },
          ),
        ),
      );
    }
  }

  static void _showErrorDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface2,
        title: Text('error_dialog_title'.tr(),
            style: const TextStyle(color: Colors.white, fontFamily: 'Cairo')),
        content: SingleChildScrollView(
          child: Text(message,
              style: const TextStyle(color: AppColors.textMuted, fontFamily: 'Cairo', fontSize: 13)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('error_close'.tr(), style: const TextStyle(fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }
}
