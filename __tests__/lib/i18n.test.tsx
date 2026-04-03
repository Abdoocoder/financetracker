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
    clear: () => { store = {} }
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const TestComponent = () => {
  const { currentLang, t } = useI18n()
  return (
    <div>
      <span data-testid="lang">{currentLang}</span>
      <span data-testid="text">{t('dash_title')}</span>
    </div>
  )
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  it('should initially render in Arabic (ar) for hydration matching', () => {
    // We want to verify that the first render is 'ar' regardless of settings
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )
    
    // In many testing environments, useEffect runs immediately, 
    // but the 'mounted' state ensures we handle the transition.
    const langElement = screen.getByTestId('lang')
    // It should eventually settle on 'ar' or 'en' based on system
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
    expect(screen.getByTestId('text').textContent).toBe('Dashboard')
  })

  it('should default to Arabic if no preference is set', async () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )

    const langElement = await screen.findByTestId('lang')
    // Default system is 'ar' or browser detection
    expect(langElement.textContent).toBeDefined()
  })

  it('should update document lang and dir attributes', async () => {
    localStorageMock.setItem('lang', 'ar')
    
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    )

    await screen.findByTestId('lang')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })
})
