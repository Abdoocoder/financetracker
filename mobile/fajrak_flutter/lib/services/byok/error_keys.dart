/// Stable error code → i18n key mapping for the BYOK chat surfaces.
///
/// `ByokService.chat` / `chatAgent` throw [ByokChatException] with a code that
/// is deliberately independent of any provider's response text, and the agent
/// route streams its own codes over SSE. Both the chat screen and the settings
/// key-tester render the same failures, so the mapping lives here once instead
/// of being copy-pasted (and drifting) per widget.
///
/// Keep the returned value a bare i18n KEY: callers run `.tr()` so Arabic and
/// English stay in sync with `assets/i18n/{en,ar}.json`.
library;

String chatErrorKey(String code) => switch (code) {
      'no-key' => 'chat_error_no_key',
      'insecure' => 'chat_error_insecure',
      'ollama-cors' => 'chat_error_ollama_cors',
      'unauthorized' => 'chat_error_unauthorized',
      'gone' => 'chat_error_gone',
      // The upstream endpoint/model slug does not exist (proxy relays the
      // provider's 404 verbatim) — usually a stale catalogue entry.
      'model-not-found' => 'chat_error_model_not_found',
      // The provider itself is failing (relayed 5xx).
      'provider-down' => 'chat_error_provider_down',
      'vault' => 'chat_error_vault',
      'rate-limit' => 'chat_error_rate_limit',
      'timeout' => 'chat_error_timeout',
      // Agent route codes (mirror web `AgentErrorCode`).
      'rate_limited' => 'chat_error_rate_limited',
      'iteration_limit' => 'chat_error_loop',
      'invalid_args' => 'chat_error_tool',
      'invalid_confirmation' => 'chat_error_tool',
      'tool' => 'chat_error_tool',
      _ => 'chat_error_generic',
    };
