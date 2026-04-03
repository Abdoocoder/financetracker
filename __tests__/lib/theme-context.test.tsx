import { render, screen } from '@testing-library/react'
import { ThemeProvider, type Theme } from '@/lib/theme-context'

describe('theme-context', () => {
  it('should render children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Test Content</div>
      </ThemeProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('should export Theme type with system option', () => {
    const themes: Theme[] = ['system', 'dark', 'light']
    expect(themes).toContain('system')
    expect(themes).toContain('dark')
    expect(themes).toContain('light')
  })
})