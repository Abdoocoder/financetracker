import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { I18nProvider } from '../../lib/i18n'
import { ZakatHawlBanner } from '../../components/dashboard/ZakatHawlBanner'

// The provider reads `lang` from localStorage on mount; force Arabic (the
// app's default) so assertions match the shipped copy in lib/locales/ar.
beforeEach(() => {
  localStorage.setItem('lang', 'ar')
})

function renderBanner(props: Partial<React.ComponentProps<typeof ZakatHawlBanner>> = {}) {
  return render(
    <I18nProvider>
      <ZakatHawlBanner daysRemaining={150} zakatDue={125} currency="JOD" {...props} />
    </I18nProvider>
  )
}

describe('ZakatHawlBanner', () => {
  it('active hawl: shows the countdown banner with the due amount', () => {
    renderBanner({ daysRemaining: 150 })

    expect(screen.getByTestId('zakat-hawl-banner')).toHaveAttribute('data-tone', 'safe')
    expect(
      screen.getByText('🕒 حولك الحالي: بقي 150 يوماً (المستحق: 125 JOD)')
    ).toBeInTheDocument()
  })

  it('urgent band (<= 7 days): red tone', () => {
    renderBanner({ daysRemaining: 3 })

    expect(screen.getByTestId('zakat-hawl-banner')).toHaveAttribute('data-tone', 'urgent')
    expect(
      screen.getByText('🕒 حولك الحالي: بقي 3 يوماً (المستحق: 125 JOD)')
    ).toBeInTheDocument()
  })

  it('overdue (<= 0): shows the due-now message in the overdue tone', () => {
    renderBanner({ daysRemaining: -4 })

    expect(screen.getByTestId('zakat-hawl-banner')).toHaveAttribute('data-tone', 'overdue')
    expect(screen.getByText(/حان موعد زكاتك/)).toBeInTheDocument()
    expect(screen.getByText(/المستحق: 125 JOD/)).toBeInTheDocument()
  })

  it('below nisab (null days): renders nothing', () => {
    renderBanner({ daysRemaining: null })

    expect(screen.queryByTestId('zakat-hawl-banner')).not.toBeInTheDocument()
  })
})
