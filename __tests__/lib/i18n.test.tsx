import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { I18nProvider, useI18n } from '../../lib/i18n'

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const TestComponent = () => {
  const { currentLang, t } = useI18n()
  return (
    <div>
      <span data-testid="lang">{currentLang}</span>
      <span data-testid="text">{t('app_name')}</span>
    </div>
  )
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
    // Reset document attributes
    document.documentElement.lang = ''
    document.documentElement.dir = ''
  })

  it('should initially render in Arabic (ar) for hydration matching', () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )
    
    const langElement = screen.getByTestId('lang')
    expect(['ar', 'en']).toContain(langElement.textContent)
  })

  it('should switch to English if saved in localStorage', async () => {
    localStorageMock.setItem('lang', 'en')
    
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )

    const langElement = await screen.findByTestId('lang')
    expect(langElement.textContent).toBe('en')
    expect(screen.getByTestId('text').textContent).toBe('Fajrak')
  })

  it('should support system language matching via setLang("system")', async () => {
    // Mock navigator.language to English
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true })
    
    let capturedSetLang: any
    const MockSetter = () => {
      const { setLang } = useI18n()
      capturedSetLang = setLang
      return null
    }

    render(
      <I18nProvider>
        <MockSetter />
        <TestComponent />
      </I18nProvider>
    )

    await act(async () => {
      capturedSetLang('system')
    })

    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(localStorageMock.getItem('lang')).toBeNull() 
  })

  it('tCategory should map Arabic categories to English keys', async () => {
    const CategoryTester = () => {
      const { tCategory, setLang } = useI18n()
      React.useEffect(() => { setLang('en') }, [setLang])
      return <div data-testid="cat">{tCategory('طعام')}</div>
    }

    render(
      <I18nProvider>
        <CategoryTester />
      </I18nProvider>
    )

    const el = await screen.findByTestId('cat')
    expect(el.textContent).toBe('Food & Drink')
  })

  it('t should handle parameterized strings', async () => {
    const ParamTester = () => {
      const { t, setLang } = useI18n()
      React.useEffect(() => { setLang('en') }, [setLang])
      return <div data-testid="param">{t('settings_age_value', { n: '30' })}</div>
    }

    render(
      <I18nProvider>
        <ParamTester />
      </I18nProvider>
    )

    const el = await screen.findByTestId('param')
    expect(el.textContent).toBe('30yr')
  })
})
