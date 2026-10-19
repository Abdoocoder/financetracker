import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/analytics_service.dart';
import '../services/sentry_service.dart';
import 'dart:developer' as dev;
import 'dart:io';

class ErrorHandler {
  static void setup() {
    // Initialization logic can be added here if needed
    // Currently a no-op placeholder for future initialization
  }

  static bool _isNetworkError(dynamic error) {
    final msg = error.toString().toLowerCase();
    return error is SocketException ||
        msg.contains('socketexception') ||
        msg.contains('failed host lookup') ||
        msg.contains('no address associated') ||
        msg.contains('authretryablefetchexception') ||
        msg.contains('network is unreachable') ||
        msg.contains('connection refused');
  }

  /// Standardized error handling method.
  /// Shows a Snackbar and logs the error to analytics.
  /// If [userMessage] is provided it overrides the default generic/network text.
  static void handle(dynamic error,
      {StackTrace? st,
      BuildContext? context,
      String? developerMessage,
      String? userMessage}) {
    final String errorMessage = error.toString();
    dev.log('Error: $errorMessage', name: 'ErrorHandler', error: error, stackTrace: st);

    // Log to Supabase Analytics
    AnalyticsService.logError(
      error.runtimeType.toString(),
      errorMessage,
      {'developer_message': developerMessage},
    );

    // Report to Sentry — release builds only (debug stays quiet; no DSN
    // is a no-op too). Handled errors are never rethrown, so Sentry's
    // uncaught-exception handler won't see them again: no duplicates.
    SentryService.captureReport(
      error,
      stackTrace: st,
      screen: (context?.mounted ?? false)
          ? ModalRoute.of(context!)?.settings.name
          : null,
    );

    if (context != null && context.mounted) {
      final bool isNetwork = _isNetworkError(error);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(isNetwork ? Icons.wifi_off : Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  userMessage ??
                      (isNetwork ? 'error_no_internet'.tr() : 'error_generic'.tr()),
                  style: const TextStyle(),
                ),
              ),
            ],
          ),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          duration: const Duration(seconds: 4),
          action: null,
        ),
      );
    }
  }

}
