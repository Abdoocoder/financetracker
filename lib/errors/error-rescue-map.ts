/**
 * Fajrak Error Rescue Map
 *
 * Maps internal error codes to user-friendly messages (AR/EN) and recovery actions.
 * Used by BYOK Proxy, MCP Server, and Flutter client for consistent error handling.
 */

export type ErrorCode =
  // BYOK Proxy Errors
  | 'PROXY_UNAUTHORIZED'
  | 'PROXY_RATE_LIMITED'
  | 'PROXY_UPSTREAM_RATE_LIMITED'
  | 'PROXY_UPSTREAM_UNAUTHORIZED'
  | 'PROXY_UPSTREAM_FORBIDDEN'
  | 'PROXY_UPSTREAM_GONE'
  | 'PROXY_UPSTREAM_ERROR'
  | 'PROXY_KEK_NOT_CONFIGURED'
  | 'PROXY_ENVELOPE_UNWRAP_FAILED'
  | 'PROXY_KEY_DECRYPTION_FAILED'
  | 'PROXY_INVALID_PROVIDER'
  | 'PROXY_INVALID_BODY'
  | 'PROXY_ABORTED'
  | 'PROXY_SSE_STREAM_ERROR'

  // MCP Server Errors
  | 'MCP_UNAUTHORIZED'
  | 'MCP_INVALID_PAT'
  | 'MCP_PAT_EXPIRED'
  | 'MCP_PAT_REVOKED'
  | 'MCP_RATE_LIMITED'
  | 'MCP_INSUFFICIENT_SCOPE'
  | 'MCP_TOOL_NOT_FOUND'
  | 'MCP_TOOL_ERROR'
  | 'MCP_IDEMPOTENCY_DUPLICATE'
  | 'MCP_IDEMPOTENCY_PROCESSING'
  | 'MCP_IDEMPOTENCY_INVALID'
  | 'MCP_CATEGORY_INVALID'
  | 'MCP_TRANSACTION_CREATE_FAILED'

  // Crypto/Envelope Errors
  | 'CRYPTO_UNWRAP_FAILED'
  | 'CRYPTO_KEY_ROTATION_MISMATCH'
  | 'CRYPTO_ENVELOPE_INVALID'
  | 'CRYPTO_KEY_NOT_IN_VAULT'
  | 'CRYPTO_VAULT_UNAVAILABLE'

  // Network/Client Errors
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_CORS_ERROR'
  | 'NETWORK_OLLAMA_CONNECTION_FAILED'
  | 'NETWORK_OLLAMA_CORS'
  | 'NETWORK_UNKNOWN'

  // Validation Errors
  | 'VALIDATION_REQUIRED_FIELD'
  | 'VALIDATION_INVALID_AMOUNT'
  | 'VALIDATION_INVALID_DATE'
  | 'VALIDATION_INVALID_CATEGORY'
  | 'VALIDATION_INVALID_MODEL'

export interface ErrorRescueEntry {
  code: ErrorCode
  httpStatus: number
  userMessage: {
    ar: string
    en: string
  }
  recoveryAction: {
    ar: string
    en: string
  }
  retryable: boolean
  showInUI: boolean
}

export const ERROR_RESCUE_MAP: Record<ErrorCode, ErrorRescueEntry> = {
  // ============ BYOK Proxy Errors ============
  PROXY_UNAUTHORIZED: {
    code: 'PROXY_UNAUTHORIZED',
    httpStatus: 401,
    userMessage: {
      ar: 'جلستك انتهت أو غير صالحة. يرجى تسجيل الدخول مرة أخرى.',
      en: 'Your session has expired or is invalid. Please log in again.',
    },
    recoveryAction: {
      ar: 'اضغط هنا لتسجيل الدخول',
      en: 'Click here to log in',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_RATE_LIMITED: {
    code: 'PROXY_RATE_LIMITED',
    httpStatus: 429,
    userMessage: {
      ar: 'لقد تجاوزت حد الطلبات المسموح (30 طلب/دقيقة). يرجى الانتظار قليلاً.',
      en: 'You have exceeded the rate limit (30 req/min). Please wait a moment.',
    },
    recoveryAction: {
      ar: 'انتظر دقيقة ثم حاول مرة أخرى',
      en: 'Wait a minute and try again',
    },
    retryable: true,
    showInUI: true,
  },

  PROXY_UPSTREAM_RATE_LIMITED: {
    code: 'PROXY_UPSTREAM_RATE_LIMITED',
    httpStatus: 429,
    userMessage: {
      ar: 'مزود الخدمة مشغول حالياً. يرجى المحاولة لاحقاً.',
      en: 'The AI provider is busy. Please try again later.',
    },
    recoveryAction: {
      ar: 'جرب مزوداً آخر أو انتظر',
      en: 'Try another provider or wait',
    },
    retryable: true,
    showInUI: true,
  },

  PROXY_UPSTREAM_UNAUTHORIZED: {
    code: 'PROXY_UPSTREAM_UNAUTHORIZED',
    httpStatus: 401,
    userMessage: {
      ar: 'مفتاح API الخاص بك تم رفضه من قبل المزود. قد يكون منتهي الصلاحية أو غير صالح.',
      en: 'Your API key was rejected by the provider. It may be expired or invalid.',
    },
    recoveryAction: {
      ar: 'أعد إدخال المفتاح في الإعدادات',
      en: 'Re-enter your key in Settings',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_UPSTREAM_FORBIDDEN: {
    code: 'PROXY_UPSTREAM_FORBIDDEN',
    httpStatus: 403,
    userMessage: {
      ar: 'المزود رفض الطلب. قد يكون مفتاحك غير مفعل لهذا النموذج.',
      en: 'The provider rejected the request. Your key may not have access to this model.',
    },
    recoveryAction: {
      ar: 'تحقق من صلاحيات المفتاح أو جرب نموذجاً آخر',
      en: 'Check key permissions or try another model',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_UPSTREAM_GONE: {
    code: 'PROXY_UPSTREAM_GONE',
    httpStatus: 410,
    userMessage: {
      ar: 'هذا النموذج أو نقطة النهاية لم تعد متاحة من المزود.',
      en: 'This model or endpoint is no longer available from the provider.',
    },
    recoveryAction: {
      ar: 'اختر نموذجاً آخر من القائمة',
      en: 'Choose another model from the list',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_UPSTREAM_ERROR: {
    code: 'PROXY_UPSTREAM_ERROR',
    httpStatus: 502,
    userMessage: {
      ar: 'حدث خطأ في الاتصال بمزود الخدمة. يرجى المحاولة مرة أخرى.',
      en: 'An error occurred connecting to the AI provider. Please try again.',
    },
    recoveryAction: {
      ar: 'أعد المحاولة خلال لحظات',
      en: 'Retry in a moment',
    },
    retryable: true,
    showInUI: true,
  },

  PROXY_KEK_NOT_CONFIGURED: {
    code: 'PROXY_KEK_NOT_CONFIGURED',
    httpStatus: 500,
    userMessage: {
      ar: 'خدمة المحادثة غير مهيأة بشكل صحيح. يرجى التواصل مع الدعم.',
      en: 'Chat service is not properly configured. Please contact support.',
    },
    recoveryAction: {
      ar: 'تواصل مع الدعم الفني',
      en: 'Contact technical support',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_ENVELOPE_UNWRAP_FAILED: {
    code: 'PROXY_ENVELOPE_UNWRAP_FAILED',
    httpStatus: 400,
    userMessage: {
      ar: 'فشل فك تشفير مفتاحك. قد يكون هناك تحديث في مفاتيح التشفير.',
      en: 'Failed to decrypt your key. There may have been a key rotation.',
    },
    recoveryAction: {
      ar: 'أعد إدخال مفتاحك في الإعدادات',
      en: 'Re-enter your key in Settings',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_KEY_DECRYPTION_FAILED: {
    code: 'PROXY_KEY_DECRYPTION_FAILED',
    httpStatus: 400,
    userMessage: {
      ar: 'لا يمكن قراءة مفتاحك المشفر. يرجى إعادة إدخاله.',
      en: 'Cannot decrypt your encrypted key. Please re-enter it.',
    },
    recoveryAction: {
      ar: 'احذف المفتاح وأعد إضافته',
      en: 'Delete and re-add the key',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_INVALID_PROVIDER: {
    code: 'PROXY_INVALID_PROVIDER',
    httpStatus: 404,
    userMessage: {
      ar: 'المزود المحدد غير مدعوم.',
      en: 'The selected provider is not supported.',
    },
    recoveryAction: {
      ar: 'اختر مزوداً من القائمة المتاحة',
      en: 'Choose a provider from the available list',
    },
    retryable: false,
    showInUI: true,
  },

  PROXY_INVALID_BODY: {
    code: 'PROXY_INVALID_BODY',
    httpStatus: 400,
    userMessage: {
      ar: 'طلب غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      en: 'Invalid request. Please refresh the page and try again.',
    },
    recoveryAction: {
      ar: 'أعد تحميل الصفحة',
      en: 'Reload the page',
    },
    retryable: true,
    showInUI: true,
  },

  PROXY_ABORTED: {
    code: 'PROXY_ABORTED',
    httpStatus: 499,
    userMessage: {
      ar: 'تم إلغاء الطلب.',
      en: 'Request was cancelled.',
    },
    recoveryAction: {
      ar: 'لا إجراء مطلوب',
      en: 'No action needed',
    },
    retryable: false,
    showInUI: false,
  },

  PROXY_SSE_STREAM_ERROR: {
    code: 'PROXY_SSE_STREAM_ERROR',
    httpStatus: 502,
    userMessage: {
      ar: 'انقطع تدفق الرد من المزود. يرجى إعادة إرسال الرسالة.',
      en: 'The response stream was interrupted. Please resend your message.',
    },
    recoveryAction: {
      ar: 'أعد إرسال الرسالة',
      en: 'Resend your message',
    },
    retryable: true,
    showInUI: true,
  },

  // ============ MCP Server Errors ============
  MCP_UNAUTHORIZED: {
    code: 'MCP_UNAUTHORIZED',
    httpStatus: 401,
    userMessage: {
      ar: 'مفتاح الوصول (PAT) غير صالح أو منتهي الصلاحية.',
      en: 'Access key (PAT) is invalid or expired.',
    },
    recoveryAction: {
      ar: 'أنشئ مفتاح PAT جديد من الإعدادات',
      en: 'Create a new PAT in Settings',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_INVALID_PAT: {
    code: 'MCP_INVALID_PAT',
    httpStatus: 401,
    userMessage: {
      ar: 'مفتاح PAT غير موجود أو تم إلغاؤه.',
      en: 'PAT key not found or has been revoked.',
    },
    recoveryAction: {
      ar: 'تحقق من المفتاح أو أنشئ واحداً جديداً',
      en: 'Verify the key or create a new one',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_PAT_EXPIRED: {
    code: 'MCP_PAT_EXPIRED',
    httpStatus: 401,
    userMessage: {
      ar: 'انتهت صلاحية مفتاح PAT (90 يوماً). يرجى إنشاء واحد جديد.',
      en: 'PAT key has expired (90 days). Please create a new one.',
    },
    recoveryAction: {
      ar: 'اذهب للإعدادات وقم بتدوير المفتاح',
      en: 'Go to Settings and rotate the key',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_PAT_REVOKED: {
    code: 'MCP_PAT_REVOKED',
    httpStatus: 401,
    userMessage: {
      ar: 'تم إلغاء مفتاح PAT هذا.',
      en: 'This PAT key has been revoked.',
    },
    recoveryAction: {
      ar: 'أنشئ مفتاحاً جديداً',
      en: 'Create a new key',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_RATE_LIMITED: {
    code: 'MCP_RATE_LIMITED',
    httpStatus: 429,
    userMessage: {
      ar: 'تجاوزت حد الطلبات للمفتاح (10/دقيقة).',
      en: 'Rate limit exceeded for this key (10/min).',
    },
    recoveryAction: {
      ar: 'انتظر دقيقة ثم حاول',
      en: 'Wait a minute and try',
    },
    retryable: true,
    showInUI: true,
  },

  MCP_INSUFFICIENT_SCOPE: {
    code: 'MCP_INSUFFICIENT_SCOPE',
    httpStatus: 403,
    userMessage: {
      ar: 'مفتاحك لا يملك الصلاحية المطلوبة للعملية.',
      en: 'Your key lacks the required scope for this operation.',
    },
    recoveryAction: {
      ar: 'أضف الصلاحية المطلوبة للمفتاح في الإعدادات',
      en: 'Add required scope to the key in Settings',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_TOOL_NOT_FOUND: {
    code: 'MCP_TOOL_NOT_FOUND',
    httpStatus: 404,
    userMessage: {
      ar: 'الأداة المطلوبة غير موجودة.',
      en: 'Requested tool not found.',
    },
    recoveryAction: {
      ar: 'تحقق من إصدار MCP Server',
      en: 'Check MCP Server version',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_TOOL_ERROR: {
    code: 'MCP_TOOL_ERROR',
    httpStatus: 500,
    userMessage: {
      ar: 'حدث خطأ أثناء تنفيذ الأداة.',
      en: 'An error occurred executing the tool.',
    },
    recoveryAction: {
      ar: 'أعد المحاولة أو تواصل مع الدعم',
      en: 'Retry or contact support',
    },
    retryable: true,
    showInUI: true,
  },

  MCP_IDEMPOTENCY_DUPLICATE: {
    code: 'MCP_IDEMPOTENCY_DUPLICATE',
    httpStatus: 200,
    userMessage: {
      ar: 'تمت العملية بنجاح (معاملة مكررة تم تجاهلها).',
      en: 'Operation succeeded (duplicate transaction ignored).',
    },
    recoveryAction: {
      ar: 'لا إجراء مطلوب - المعاملة موجودة بالفعل',
      en: 'No action needed - transaction already exists',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_IDEMPOTENCY_PROCESSING: {
    code: 'MCP_IDEMPOTENCY_PROCESSING',
    httpStatus: 409,
    userMessage: {
      ar: 'معاملة بهذا المفتاح قيد المعالجة حالياً.',
      en: 'A transaction with this key is currently being processed.',
    },
    recoveryAction: {
      ar: 'انتظر بضع ثوانٍ وأعد المحاولة',
      en: 'Wait a few seconds and retry',
    },
    retryable: true,
    showInUI: true,
  },

  MCP_IDEMPOTENCY_INVALID: {
    code: 'MCP_IDEMPOTENCY_INVALID',
    httpStatus: 400,
    userMessage: {
      ar: 'مفتاح التكرار المحمي غير صالح.',
      en: 'Invalid idempotency key.',
    },
    recoveryAction: {
      ar: 'استخدم مفتاح UUID صالح',
      en: 'Use a valid UUID key',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_CATEGORY_INVALID: {
    code: 'MCP_CATEGORY_INVALID',
    httpStatus: 400,
    userMessage: {
      ar: 'الفئة غير صالحة لنوع المعاملة (دخل/مصروف).',
      en: 'Category is invalid for this transaction type (income/expense).',
    },
    recoveryAction: {
      ar: 'اختر فئة صحيحة من القائمة',
      en: 'Choose a valid category from the list',
    },
    retryable: false,
    showInUI: true,
  },

  MCP_TRANSACTION_CREATE_FAILED: {
    code: 'MCP_TRANSACTION_CREATE_FAILED',
    httpStatus: 500,
    userMessage: {
      ar: 'فشل إنشاء المعاملة. يرجى المحاولة مرة أخرى.',
      en: 'Failed to create transaction. Please try again.',
    },
    recoveryAction: {
      ar: 'أعد المحاولة',
      en: 'Retry',
    },
    retryable: true,
    showInUI: true,
  },

  // ============ Crypto/Envelope Errors ============
  CRYPTO_UNWRAP_FAILED: {
    code: 'CRYPTO_UNWRAP_FAILED',
    httpStatus: 400,
    userMessage: {
      ar: 'فشل فك تشفير الغلاف. قد يكون المفتاح قد تغير.',
      en: 'Failed to unwrap envelope. Key may have been rotated.',
    },
    recoveryAction: {
      ar: 'أعد إدخال مفتاح API في الإعدادات',
      en: 'Re-enter your API key in Settings',
    },
    retryable: false,
    showInUI: true,
  },

  CRYPTO_KEY_ROTATION_MISMATCH: {
    code: 'CRYPTO_KEY_ROTATION_MISMATCH',
    httpStatus: 400,
    userMessage: {
      ar: 'مفتاح التشفير لا يتطابق مع الإصدار الحالي. تم تدوير المفاتيح.',
      en: 'Encryption key version mismatch. Keys have been rotated.',
    },
    recoveryAction: {
      ar: 'أعد إدخال مفتاحك ليتم تشفيره بالمفتاح الجديد',
      en: 'Re-enter your key to encrypt with the new key',
    },
    retryable: false,
    showInUI: true,
  },

  CRYPTO_ENVELOPE_INVALID: {
    code: 'CRYPTO_ENVELOPE_INVALID',
    httpStatus: 400,
    userMessage: {
      ar: 'تنسيق الغلاف المشفر غير صالح.',
      en: 'Invalid encrypted envelope format.',
    },
    recoveryAction: {
      ar: 'أعد إدخال المفتاح',
      en: 'Re-enter the key',
    },
    retryable: false,
    showInUI: true,
  },

  CRYPTO_KEY_NOT_IN_VAULT: {
    code: 'CRYPTO_KEY_NOT_IN_VAULT',
    httpStatus: 400,
    userMessage: {
      ar: 'مفتاحك غير مخزن على هذا الجهاز.',
      en: 'Your key is not stored on this device.',
    },
    recoveryAction: {
      ar: 'أضف المفتاح من الإعدادات على هذا الجهاز',
      en: 'Add the key from Settings on this device',
    },
    retryable: false,
    showInUI: true,
  },

  CRYPTO_VAULT_UNAVAILABLE: {
    code: 'CRYPTO_VAULT_UNAVAILABLE',
    httpStatus: 503,
    userMessage: {
      ar: 'مخزن المفاتيح غير متاح (وضع التصفح الخاص أو متصفح غير مدعوم).',
      en: 'Key vault unavailable (private browsing or unsupported browser).',
    },
    recoveryAction: {
      ar: 'استخدم وضع التصفح العادي وأعد إضافة المفتاح',
      en: 'Use normal browsing mode and re-add the key',
    },
    retryable: false,
    showInUI: true,
  },

  // ============ Network/Client Errors ============
  NETWORK_OFFLINE: {
    code: 'NETWORK_OFFLINE',
    httpStatus: 0,
    userMessage: {
      ar: 'أنت غير متصل بالإنترنت.',
      en: 'You are offline.',
    },
    recoveryAction: {
      ar: 'تحقق من اتصالك بالإنترنت',
      en: 'Check your internet connection',
    },
    retryable: true,
    showInUI: true,
  },

  NETWORK_TIMEOUT: {
    code: 'NETWORK_TIMEOUT',
    httpStatus: 408,
    userMessage: {
      ar: 'انتهت مهلة الاتصال. الخادم يستغرق وقتاً طويلاً للرد.',
      en: 'Connection timed out. Server is taking too long to respond.',
    },
    recoveryAction: {
      ar: 'أعد المحاولة',
      en: 'Retry',
    },
    retryable: true,
    showInUI: true,
  },

  NETWORK_CORS_ERROR: {
    code: 'NETWORK_CORS_ERROR',
    httpStatus: 0,
    userMessage: {
      ar: 'خطأ CORS: لا يمكن الاتصال بالمزود من المتصفح مباشرة.',
      en: 'CORS error: Cannot connect to provider directly from browser.',
    },
    recoveryAction: {
      ar: 'استخدم الوكيل (Proxy) أو فعّل CORS على المزود المحلي',
      en: 'Use the Proxy or enable CORS on local provider',
    },
    retryable: false,
    showInUI: true,
  },

  NETWORK_OLLAMA_CONNECTION_FAILED: {
    code: 'NETWORK_OLLAMA_CONNECTION_FAILED',
    httpStatus: 0,
    userMessage: {
      ar: 'لا يمكن الاتصال بـ Ollama المحلي. تأكد من تشغيله على المنفذ 11434.',
      en: 'Cannot connect to local Ollama. Ensure it\'s running on port 11434.',
    },
    recoveryAction: {
      ar: 'شغل Ollama وتأكد من إعداد CORS',
      en: 'Start Ollama and verify CORS settings',
    },
    retryable: true,
    showInUI: true,
  },

  NETWORK_OLLAMA_CORS: {
    code: 'NETWORK_OLLAMA_CORS',
    httpStatus: 0,
    userMessage: {
      ar: 'Ollama يرفض الطلب من المتصفح. فعّل OLLAMA_ORIGINS للسماح بالوصول.',
      en: 'Ollama rejected the browser request. Enable OLLAMA_ORIGINS to allow access.',
    },
    recoveryAction: {
      ar: 'أضف Origin موقعك إلى OLLAMA_ORIGINS وأعد تشغيل Ollama',
      en: 'Add your site Origin to OLLAMA_ORIGINS and restart Ollama',
    },
    retryable: false,
    showInUI: true,
  },

  NETWORK_UNKNOWN: {
    code: 'NETWORK_UNKNOWN',
    httpStatus: 0,
    userMessage: {
      ar: 'حدث خطأ شبكة غير معروف.',
      en: 'An unknown network error occurred.',
    },
    recoveryAction: {
      ar: 'تحقق من اتصالك وأعد المحاولة',
      en: 'Check connection and retry',
    },
    retryable: true,
    showInUI: true,
  },

  // ============ Validation Errors ============
  VALIDATION_REQUIRED_FIELD: {
    code: 'VALIDATION_REQUIRED_FIELD',
    httpStatus: 400,
    userMessage: {
      ar: 'حقل مطلوب مفقود.',
      en: 'Required field is missing.',
    },
    recoveryAction: {
      ar: 'املأ جميع الحقول المطلوبة',
      en: 'Fill in all required fields',
    },
    retryable: false,
    showInUI: true,
  },

  VALIDATION_INVALID_AMOUNT: {
    code: 'VALIDATION_INVALID_AMOUNT',
    httpStatus: 400,
    userMessage: {
      ar: 'المبلغ يجب أن يكون رقماً موجباً.',
      en: 'Amount must be a positive number.',
    },
    recoveryAction: {
      ar: 'أدخل مبلغاً صحيحاً',
      en: 'Enter a valid amount',
    },
    retryable: false,
    showInUI: true,
  },

  VALIDATION_INVALID_DATE: {
    code: 'VALIDATION_INVALID_DATE',
    httpStatus: 400,
    userMessage: {
      ar: 'التاريخ غير صالح. استخدم تنسيق YYYY-MM-DD.',
      en: 'Invalid date. Use YYYY-MM-DD format.',
    },
    recoveryAction: {
      ar: 'اختر تاريخاً صحيحاً',
      en: 'Select a valid date',
    },
    retryable: false,
    showInUI: true,
  },

  VALIDATION_INVALID_CATEGORY: {
    code: 'VALIDATION_INVALID_CATEGORY',
    httpStatus: 400,
    userMessage: {
      ar: 'الفئة المختارة غير صحيحة لهذا النوع.',
      en: 'Selected category is invalid for this type.',
    },
    recoveryAction: {
      ar: 'اختر فئة من القائمة المناسبة',
      en: 'Choose a category from the appropriate list',
    },
    retryable: false,
    showInUI: true,
  },

  VALIDATION_INVALID_MODEL: {
    code: 'VALIDATION_INVALID_MODEL',
    httpStatus: 400,
    userMessage: {
      ar: 'النموذج المحدد غير متاح للمزود.',
      en: 'Selected model is not available for this provider.',
    },
    recoveryAction: {
      ar: 'اختر نموذجاً من القائمة',
      en: 'Choose a model from the list',
    },
    retryable: false,
    showInUI: true,
  },
}

// Helper to get error entry with fallback
export function getErrorRescue(code: string): ErrorRescueEntry {
  return ERROR_RESCUE_MAP[code as ErrorCode] ?? {
    code: code as ErrorCode,
    httpStatus: 500,
    userMessage: {
      ar: 'حدث خطأ غير متوقع.',
      en: 'An unexpected error occurred.',
    },
    recoveryAction: {
      ar: 'أعد المحاولة أو تواصل مع الدعم',
      en: 'Retry or contact support',
    },
    retryable: true,
    showInUI: true,
  }
}

// Get user message in preferred language
export function getErrorMessage(code: string, lang: 'ar' | 'en' = 'ar'): string {
  return getErrorRescue(code).userMessage[lang]
}

// Get recovery action in preferred language
export function getErrorRecovery(code: string, lang: 'ar' | 'en' = 'ar'): string {
  return getErrorRescue(code).recoveryAction[lang]
}

// Check if error is retryable
export function isErrorRetryable(code: string): boolean {
  return getErrorRescue(code).retryable
}

// Check if error should be shown in UI
export function shouldShowErrorInUI(code: string): boolean {
  return getErrorRescue(code).showInUI
}