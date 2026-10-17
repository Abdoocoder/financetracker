class ChatPromptRules {
  static String buildChatFormatRules({bool plainText = false}) {
    final rules = <String>[];

    rules.add(
      'استخدم الفصحى المبسطة دائماً في الردود العربية. تجنب الكلمات الإنجليزية غير الضرورية. لا تستخدم English words داخل النص العربي إلا عند الضرورة التقنية.',
    );
    rules.add('اكتب بالعربية الفصحى المبسطة، بدون إدخال كلمات إنجليزية عشوائية.');

    rules.add(
      'استخدم عملة JOD بالتنسيق الصحيح. اعرض القيم دائماً مع 3 decimal places مثل 73.240 د.أ.',
    );
    rules.add('عرض الأرقام بعملتين بثلاثة أرقام عشرية.');

    if (plainText) {
      rules.add(
        'never output raw Markdown symbols ** or ### in the plain text response.',
      );
      rules.add('لا تستخدم رموز Markdown الخام مثل ** و ### في النص العادي.');
    } else {
      rules.add('يمكن استخدام Markdown للتنسيق عندما يكون العميل يدعمه.');
    }

    rules.add('End every response with exactly one actionable suggestion.');

    return rules.join('\n');
  }
}
