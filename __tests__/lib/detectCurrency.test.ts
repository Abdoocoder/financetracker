import { detectCurrency } from '@/lib/detectCurrency'

describe('lib/detectCurrency', () => {
  const originalIntl = global.Intl;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset mocks
    jest.restoreAllMocks();
  })

  it('should detect currency based on Timezone (High Confidence)', () => {
    // Mock Intl.DateTimeFormat().resolvedOptions().timeZone
    const mockIntl = {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({
          timeZone: 'Asia/Riyadh'
        })
      })
    };
    global.Intl = mockIntl as any;

    const result = detectCurrency();
    expect(result.currency).toBe('SAR');
    expect(result.confidence).toBe('high');
    expect(result.countryName).toBe('السعودية');
    
    global.Intl = originalIntl;
  });

  it('should detect currency based on navigator.language (High Confidence)', () => {
    // Mock Intl to return unknown TZ
    const mockIntl = {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({
          timeZone: 'UTC'
        })
      })
    };
    global.Intl = mockIntl as any;

    // Mock navigator.language
    Object.defineProperty(global, 'navigator', {
      value: { language: 'en-JO' },
      configurable: true
    });

    const result = detectCurrency();
    expect(result.currency).toBe('JOD');
    expect(result.confidence).toBe('high');
    expect(result.countryName).toBe('الأردن');

    global.Intl = originalIntl;
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
  });

  it('should fallback to USD with low confidence for unknown locale/TZ', () => {
     // Mock Intl to return unknown TZ
     const mockIntl = {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({
          timeZone: 'UTC'
        })
      })
    };
    global.Intl = mockIntl as any;

    // Mock navigator.language to unknown
    Object.defineProperty(global, 'navigator', {
      value: { language: 'xx-YY' },
      configurable: true
    });

    const result = detectCurrency();
    expect(result.currency).toBe('USD');
    expect(result.confidence).toBe('low');

    global.Intl = originalIntl;
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
  });

  it('should fallback to JOD for Arabic locale even if country is unknown', () => {
    const mockIntl = {
     DateTimeFormat: () => ({
       resolvedOptions: () => ({
         timeZone: 'UTC'
       })
     })
   };
   global.Intl = mockIntl as any;

   Object.defineProperty(global, 'navigator', {
     value: { language: 'ar' },
     configurable: true
   });

   const result = detectCurrency();
   expect(result.currency).toBe('JOD');
   expect(result.confidence).toBe('low');

   global.Intl = originalIntl;
   Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
 });

  it('should handle errors gracefully during detection', () => {
    // Force an error in Intl
    const mockIntl = {
      DateTimeFormat: () => { throw new Error('Intl fail') }
    };
    global.Intl = mockIntl as any;

    Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US' },
        configurable: true
    });

    const result = detectCurrency();
    // Should fallback using navigator.language CC
    expect(result.currency).toBe('USD');
    expect(result.confidence).toBe('high');

    global.Intl = originalIntl;
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
  });
});
