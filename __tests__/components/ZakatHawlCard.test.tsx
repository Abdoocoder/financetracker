import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { I18nProvider } from '../../lib/i18n'
import { ZakatHawlCard, hawlTone } from '../../components/dashboard/ZakatHawlCard'

// The provider reads `lang` from localStorage on mount; force Arabic (the
// app's default) so assertions match the shipped copy in lib/locales/ar.
beforeEach(() => {
  localStorage.setItem('lang', 'ar')
})

function renderCard(props: Partial<React.ComponentProps<typeof ZakatHawlCard>> = {}) {
  return render(
    <I18nProvider>
      <ZakatHawlCard daysRemaining={150} zakatDue={125} currency="JOD" {...props} />
    </I18nProvider>
  )
}

describe('hawlTone', () => {
  it('maps day bands to the specified color themes', () => {
    expect(hawlTone(null)).toBe('below')     // below nisab
    expect(hawlTone(0)).toBe('overdue')      // due today
    expect(hawlTone(-5)).toBe('overdue')     // past due
    expect(hawlTone(7)).toBe('urgent')       // <= 7 days
    expect(hawlTone(8)).toBe('soon')
    expect(hawlTone(60)).toBe('soon')        // 7–60 days
    expect(hawlTone(61)).toBe('safe')        // > 60 days
    expect(hawlTone(150)).toBe('safe')
  })
})

describe('ZakatHawlCard', () => {
  it('active hawl > 60 days: green tone with countdown and due amount', () => {
    renderCard({ daysRemaining: 150 })

    expect(screen.getByTestId('zakat-hawl-card')).toHaveAttribute('data-tone', 'safe')
    expect(screen.getByText('بقي 150 يوماً')).toBeInTheDocument()
    expect(screen.getByText('المستحق: 125 JOD')).toBeInTheDocument()
  })

  it('7–60 days: orange tone', () => {
    renderCard({ daysRemaining: 30 })

    expect(screen.getByTestId('zakat-hawl-card')).toHaveAttribute('data-tone', 'soon')
    expect(screen.getByText('بقي 30 يوماً')).toBeInTheDocument()
  })

  it('<= 7 days: urgent red tone', () => {
    renderCard({ daysRemaining: 5 })

    expect(screen.getByTestId('zakat-hawl-card')).toHaveAttribute('data-tone', 'urgent')
    expect(screen.getByText('بقي 5 يوماً')).toBeInTheDocument()
  })

  it('overdue (<= 0): red tone with the due-now message', () => {
    renderCard({ daysRemaining: 0 })

    expect(screen.getByTestId('zakat-hawl-card')).toHaveAttribute('data-tone', 'overdue')
    expect(screen.getByText('حان موعد زكاتك')).toBeInTheDocument()
  })

  it('below nisab (null): muted tone with a link to the zakat page', () => {
    renderCard({ daysRemaining: null, zakatDue: 0 })

    expect(screen.getByTestId('zakat-hawl-card')).toHaveAttribute('data-tone', 'below')
    expect(screen.getByText('أنت تحت النصاب')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'احسب زكاتك' })
    expect(link).toHaveAttribute('href', '/dashboard/zakat')
  })

  it('formats fractional due amounts with two decimals', () => {
    renderCard({ daysRemaining: 150, zakatDue: 127.5 })

    expect(screen.getByText('المستحق: 127.5 JOD')).toBeInTheDocument()
  })
})
