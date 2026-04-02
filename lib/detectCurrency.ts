'use client'

export interface DetectionResult {
  currency: string
  confidence: 'high' | 'low'
  countryName: string
}

// IANA Timezone → ISO 4217 + Arabic country name
const TZ_MAP: Record<string, { currency: string; countryName: string }> = {
  // الخليج
  'Asia/Amman':          { currency: 'JOD', countryName: 'الأردن' },
  'Asia/Riyadh':         { currency: 'SAR', countryName: 'السعودية' },
  'Asia/Dubai':          { currency: 'AED', countryName: 'الإمارات' },
  'Asia/Kuwait':         { currency: 'KWD', countryName: 'الكويت' },
  'Asia/Bahrain':        { currency: 'BHD', countryName: 'البحرين' },
  'Asia/Muscat':         { currency: 'OMR', countryName: 'عُمان' },
  'Asia/Qatar':          { currency: 'QAR', countryName: 'قطر' },
  // شمال أفريقيا
  'Africa/Cairo':        { currency: 'EGP', countryName: 'مصر' },
  'Africa/Tripoli':      { currency: 'LYD', countryName: 'ليبيا' },
  'Africa/Tunis':        { currency: 'TND', countryName: 'تونس' },
  'Africa/Algiers':      { currency: 'DZD', countryName: 'الجزائر' },
  'Africa/Casablanca':   { currency: 'MAD', countryName: 'المغرب' },
  'Africa/El_Aaiun':     { currency: 'MAD', countryName: 'المغرب' },
  'Africa/Khartoum':     { currency: 'SDG', countryName: 'السودان' },
  // المشرق
  'Asia/Baghdad':        { currency: 'IQD', countryName: 'العراق' },
  'Asia/Damascus':       { currency: 'SYP', countryName: 'سوريا' },
  'Asia/Beirut':         { currency: 'LBP', countryName: 'لبنان' },
  'Asia/Aden':           { currency: 'YER', countryName: 'اليمن' },
  'Asia/Gaza':           { currency: 'ILS', countryName: 'فلسطين' },
  'Asia/Hebron':         { currency: 'ILS', countryName: 'فلسطين' },
  // إسلامية
  'Asia/Karachi':        { currency: 'PKR', countryName: 'باكستان' },
  'Asia/Jakarta':        { currency: 'IDR', countryName: 'إندونيسيا' },
  'Asia/Makassar':       { currency: 'IDR', countryName: 'إندونيسيا' },
  'Asia/Jayapura':       { currency: 'IDR', countryName: 'إندونيسيا' },
  'Asia/Kuala_Lumpur':   { currency: 'MYR', countryName: 'ماليزيا' },
  'Asia/Kuching':        { currency: 'MYR', countryName: 'ماليزيا' },
  'Europe/Istanbul':     { currency: 'TRY', countryName: 'تركيا' },
  'Asia/Dhaka':          { currency: 'BDT', countryName: 'بنغلاديش' },
  'Africa/Lagos':        { currency: 'NGN', countryName: 'نيجيريا' },
  'Asia/Tehran':         { currency: 'IRR', countryName: 'إيران' },
  // عالمية
  'America/New_York':    { currency: 'USD', countryName: 'الولايات المتحدة' },
  'America/Chicago':     { currency: 'USD', countryName: 'الولايات المتحدة' },
  'America/Denver':      { currency: 'USD', countryName: 'الولايات المتحدة' },
  'America/Los_Angeles': { currency: 'USD', countryName: 'الولايات المتحدة' },
  'America/Toronto':     { currency: 'CAD', countryName: 'كندا' },
  'America/Vancouver':   { currency: 'CAD', countryName: 'كندا' },
  'Europe/London':       { currency: 'GBP', countryName: 'المملكة المتحدة' },
  'Europe/Paris':        { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Berlin':       { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Rome':         { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Madrid':       { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Amsterdam':    { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Brussels':     { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Vienna':       { currency: 'EUR', countryName: 'أوروبا' },
  'Europe/Zurich':       { currency: 'CHF', countryName: 'سويسرا' },
  'Asia/Tokyo':          { currency: 'JPY', countryName: 'اليابان' },
  'Asia/Shanghai':       { currency: 'CNY', countryName: 'الصين' },
  'Asia/Hong_Kong':      { currency: 'HKD', countryName: 'هونغ كونغ' },
  'Asia/Kolkata':        { currency: 'INR', countryName: 'الهند' },
  'Asia/Colombo':        { currency: 'LKR', countryName: 'سريلانكا' },
  'Australia/Sydney':    { currency: 'AUD', countryName: 'أستراليا' },
  'Australia/Melbourne': { currency: 'AUD', countryName: 'أستراليا' },
  'Africa/Nairobi':      { currency: 'KES', countryName: 'كينيا' },
  'Europe/Moscow':       { currency: 'RUB', countryName: 'روسيا' },
}

// Country code (ISO 3166-1) → currency fallback
const LOCALE_MAP: Record<string, { currency: string; countryName: string }> = {
  JO: { currency: 'JOD', countryName: 'الأردن' },
  SA: { currency: 'SAR', countryName: 'السعودية' },
  AE: { currency: 'AED', countryName: 'الإمارات' },
  KW: { currency: 'KWD', countryName: 'الكويت' },
  BH: { currency: 'BHD', countryName: 'البحرين' },
  OM: { currency: 'OMR', countryName: 'عُمان' },
  QA: { currency: 'QAR', countryName: 'قطر' },
  EG: { currency: 'EGP', countryName: 'مصر' },
  IQ: { currency: 'IQD', countryName: 'العراق' },
  LY: { currency: 'LYD', countryName: 'ليبيا' },
  TN: { currency: 'TND', countryName: 'تونس' },
  DZ: { currency: 'DZD', countryName: 'الجزائر' },
  MA: { currency: 'MAD', countryName: 'المغرب' },
  SD: { currency: 'SDG', countryName: 'السودان' },
  YE: { currency: 'YER', countryName: 'اليمن' },
  LB: { currency: 'LBP', countryName: 'لبنان' },
  SY: { currency: 'SYP', countryName: 'سوريا' },
  PK: { currency: 'PKR', countryName: 'باكستان' },
  ID: { currency: 'IDR', countryName: 'إندونيسيا' },
  MY: { currency: 'MYR', countryName: 'ماليزيا' },
  TR: { currency: 'TRY', countryName: 'تركيا' },
  BD: { currency: 'BDT', countryName: 'بنغلاديش' },
  NG: { currency: 'NGN', countryName: 'نيجيريا' },
  IR: { currency: 'IRR', countryName: 'إيران' },
  US: { currency: 'USD', countryName: 'الولايات المتحدة' },
  GB: { currency: 'GBP', countryName: 'المملكة المتحدة' },
  DE: { currency: 'EUR', countryName: 'أوروبا' },
  FR: { currency: 'EUR', countryName: 'أوروبا' },
  CA: { currency: 'CAD', countryName: 'كندا' },
  AU: { currency: 'AUD', countryName: 'أستراليا' },
  JP: { currency: 'JPY', countryName: 'اليابان' },
  CN: { currency: 'CNY', countryName: 'الصين' },
  IN: { currency: 'INR', countryName: 'الهند' },
  CH: { currency: 'CHF', countryName: 'سويسرا' },
  KE: { currency: 'KES', countryName: 'كينيا' },
  RU: { currency: 'RUB', countryName: 'روسيا' },
}

/**
 * يكتشف العملة المحلية للمستخدم من Timezone وLocale الجهاز.
 * لا يستخدم أي API خارجي — يعمل client-side فقط.
 * يُستدعى داخل useEffect فقط.
 */
export function detectCurrency(): DetectionResult {
  // 1. Timezone — الأكثر دقة
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const match = TZ_MAP[tz]
    if (match) return { currency: match.currency, confidence: 'high', countryName: match.countryName }
  } catch {}

  // 2. navigator.language country code (e.g. "ar-SA" → "SA")
  try {
    const lang = navigator.language ?? ''
    const cc = lang.split('-')[1]?.toUpperCase()
    if (cc) {
      const match = LOCALE_MAP[cc]
      if (match) return { currency: match.currency, confidence: 'high', countryName: match.countryName }
    }
  } catch {}

  // 3. Fallback
  const isArabic = (typeof navigator !== 'undefined' ? navigator.language : '').startsWith('ar')
  return { currency: isArabic ? 'JOD' : 'USD', confidence: 'low', countryName: '' }
}
