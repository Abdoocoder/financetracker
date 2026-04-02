export interface CurrencyInfo {
  value: string
  labelAr: string
  labelEn: string
  flag: string
  decimals: number
}

export type CurrencyGroup = 'arabic' | 'islamic' | 'global'

export interface GroupedCurrency extends CurrencyInfo {
  group: CurrencyGroup
}

export const CURRENCIES: GroupedCurrency[] = [
  // ── العربية ──────────────────────────────────────────────────────────
  { value: 'JOD', labelAr: 'دينار أردني',       labelEn: 'Jordanian Dinar',     flag: '🇯🇴', decimals: 3, group: 'arabic' },
  { value: 'SAR', labelAr: 'ريال سعودي',         labelEn: 'Saudi Riyal',          flag: '🇸🇦', decimals: 2, group: 'arabic' },
  { value: 'AED', labelAr: 'درهم إماراتي',       labelEn: 'UAE Dirham',           flag: '🇦🇪', decimals: 2, group: 'arabic' },
  { value: 'KWD', labelAr: 'دينار كويتي',        labelEn: 'Kuwaiti Dinar',        flag: '🇰🇼', decimals: 3, group: 'arabic' },
  { value: 'BHD', labelAr: 'دينار بحريني',       labelEn: 'Bahraini Dinar',       flag: '🇧🇭', decimals: 3, group: 'arabic' },
  { value: 'OMR', labelAr: 'ريال عماني',         labelEn: 'Omani Rial',           flag: '🇴🇲', decimals: 3, group: 'arabic' },
  { value: 'QAR', labelAr: 'ريال قطري',          labelEn: 'Qatari Riyal',         flag: '🇶🇦', decimals: 2, group: 'arabic' },
  { value: 'EGP', labelAr: 'جنيه مصري',          labelEn: 'Egyptian Pound',       flag: '🇪🇬', decimals: 2, group: 'arabic' },
  { value: 'IQD', labelAr: 'دينار عراقي',        labelEn: 'Iraqi Dinar',          flag: '🇮🇶', decimals: 3, group: 'arabic' },
  { value: 'LYD', labelAr: 'دينار ليبي',         labelEn: 'Libyan Dinar',         flag: '🇱🇾', decimals: 3, group: 'arabic' },
  { value: 'TND', labelAr: 'دينار تونسي',        labelEn: 'Tunisian Dinar',       flag: '🇹🇳', decimals: 3, group: 'arabic' },
  { value: 'DZD', labelAr: 'دينار جزائري',       labelEn: 'Algerian Dinar',       flag: '🇩🇿', decimals: 2, group: 'arabic' },
  { value: 'MAD', labelAr: 'درهم مغربي',         labelEn: 'Moroccan Dirham',      flag: '🇲🇦', decimals: 2, group: 'arabic' },
  { value: 'SDG', labelAr: 'جنيه سوداني',        labelEn: 'Sudanese Pound',       flag: '🇸🇩', decimals: 2, group: 'arabic' },
  { value: 'YER', labelAr: 'ريال يمني',          labelEn: 'Yemeni Rial',          flag: '🇾🇪', decimals: 2, group: 'arabic' },
  { value: 'LBP', labelAr: 'ليرة لبنانية',      labelEn: 'Lebanese Pound',       flag: '🇱🇧', decimals: 2, group: 'arabic' },
  { value: 'SYP', labelAr: 'ليرة سورية',        labelEn: 'Syrian Pound',         flag: '🇸🇾', decimals: 2, group: 'arabic' },
  // ── الإسلامية ─────────────────────────────────────────────────────────
  { value: 'PKR', labelAr: 'روبية باكستانية',   labelEn: 'Pakistani Rupee',      flag: '🇵🇰', decimals: 2, group: 'islamic' },
  { value: 'IDR', labelAr: 'روبية إندونيسية',   labelEn: 'Indonesian Rupiah',    flag: '🇮🇩', decimals: 0, group: 'islamic' },
  { value: 'MYR', labelAr: 'رينغيت ماليزي',     labelEn: 'Malaysian Ringgit',    flag: '🇲🇾', decimals: 2, group: 'islamic' },
  { value: 'TRY', labelAr: 'ليرة تركية',        labelEn: 'Turkish Lira',         flag: '🇹🇷', decimals: 2, group: 'islamic' },
  { value: 'BDT', labelAr: 'تاكا بنغلاديشي',   labelEn: 'Bangladeshi Taka',     flag: '🇧🇩', decimals: 2, group: 'islamic' },
  { value: 'NGN', labelAr: 'نيرة نيجيرية',      labelEn: 'Nigerian Naira',       flag: '🇳🇬', decimals: 2, group: 'islamic' },
  { value: 'IRR', labelAr: 'ريال إيراني',        labelEn: 'Iranian Rial',         flag: '🇮🇷', decimals: 2, group: 'islamic' },
  // ── العالمية ──────────────────────────────────────────────────────────
  { value: 'USD', labelAr: 'دولار أمريكي',      labelEn: 'US Dollar',            flag: '💵',  decimals: 2, group: 'global' },
  { value: 'EUR', labelAr: 'يورو',               labelEn: 'Euro',                 flag: '🇪🇺', decimals: 2, group: 'global' },
  { value: 'GBP', labelAr: 'جنيه إسترليني',     labelEn: 'British Pound',        flag: '🇬🇧', decimals: 2, group: 'global' },
  { value: 'JPY', labelAr: 'ين ياباني',          labelEn: 'Japanese Yen',         flag: '🇯🇵', decimals: 0, group: 'global' },
  { value: 'CHF', labelAr: 'فرنك سويسري',       labelEn: 'Swiss Franc',          flag: '🇨🇭', decimals: 2, group: 'global' },
  { value: 'CAD', labelAr: 'دولار كندي',        labelEn: 'Canadian Dollar',      flag: '🇨🇦', decimals: 2, group: 'global' },
  { value: 'AUD', labelAr: 'دولار أسترالي',     labelEn: 'Australian Dollar',    flag: '🇦🇺', decimals: 2, group: 'global' },
  { value: 'CNY', labelAr: 'يوان صيني',          labelEn: 'Chinese Yuan',         flag: '🇨🇳', decimals: 2, group: 'global' },
  { value: 'INR', labelAr: 'روبية هندية',        labelEn: 'Indian Rupee',         flag: '🇮🇳', decimals: 2, group: 'global' },
  { value: 'RUB', labelAr: 'روبل روسي',          labelEn: 'Russian Ruble',        flag: '🇷🇺', decimals: 2, group: 'global' },
  { value: 'KES', labelAr: 'شلن كيني',           labelEn: 'Kenyan Shilling',      flag: '🇰🇪', decimals: 2, group: 'global' },
]

export const CURRENCIES_BY_GROUP: Record<CurrencyGroup, CurrencyInfo[]> = {
  arabic:  CURRENCIES.filter(c => c.group === 'arabic'),
  islamic: CURRENCIES.filter(c => c.group === 'islamic'),
  global:  CURRENCIES.filter(c => c.group === 'global'),
}

export const CURRENCY_MAP: Record<string, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map(c => [c.value, c])
)

export function getCurrencyDecimals(code: string): number {
  return CURRENCY_MAP[code]?.decimals ?? 2
}
