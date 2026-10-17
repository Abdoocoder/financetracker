/**
 * BYOK assistant formatting rules for chat
 */
export function buildChatFormatRules(options: {
  plainText?: boolean
  currency?: string
} = {}): string {
  const { plainText = true, currency = 'JOD' } = options

  const rules: string[] = []

  // Arabic language rules - simplified MSA (الفصحى المبسطة)
  rules.push(
    'استخدم الفصحى المبسطة دائماً في الردود العربية. تجنب الكلمات الإنجليزية غير الضرورية. تجنب استخدام كلمات مثل modest أو filler إنجليزي داخل النص العربي. لا تستخدم English words داخل النص العربي إلا عند الضرورة التقنية.'
  )
  rules.push('اكتب بالعربية الفصحى المبسطة، بدون إدخال كلمات إنجليزية عشوائية.')

  // Currency formatting - JOD with 3 decimals
  rules.push(
    `استخدم عملة ${currency} بالتنسيق الصحيح. اعرض القيم دائماً مع 3 decimal places مثل 73.240 د.أ.`
  )
  rules.push('عرض الأرقام بعملتين بثلاثة أرقام عشرية.')

  // Markdown rules
  if (plainText) {
    rules.push(
      'never output raw Markdown symbols ** or ### in the plain text response.'
    )
    rules.push('لا تستخدم رموز Markdown الخام مثل ** و ### في النص العادي.')
  } else {
    rules.push('يمكن استخدام Markdown للتنسيق عندما يكون العميل يدعمه.')
  }

  // Always one actionable suggestion at the end
  rules.push('End every response with exactly one actionable suggestion.')

  return rules.join('\n')
}
