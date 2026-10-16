class SessionRequiredException implements Exception {
  final String message;
  const SessionRequiredException(this.message);

  @override
  String toString() => 'SessionRequiredException: $message';
}

class OnboardingSaveException implements Exception {
  final String message;
  final Object? cause;
  const OnboardingSaveException(this.message, {this.cause});

  @override
  String toString() =>
      'OnboardingSaveException: $message${cause != null ? ' (cause: $cause)' : ''}';
}
