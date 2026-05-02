# Audit Remediation Tasks

## Overview
These tasks come from a technical quality audit (score: 10/20). Fix them in priority order.

---

## Task 1: Fix accessibility — aria-labels and aria-expanded on interactive elements

Add `aria-label` to every icon-only button and `aria-expanded` to every toggle/collapse component. Affected files:
- `components/transactions/TransactionFormModal.tsx` (close button, type toggle buttons)
- `components/dashboard/DashboardCustomizer.tsx` (all icon buttons)
- `components/dashboard/NetWorthCard.tsx` (expand toggle)
- `components/dashboard/Section.tsx` (expand toggle)
- `components/ui/financial-health-combined.tsx:318` (expand/collapse button)
- Any other icon-only button discovered during the pass

Every collapsible section button must also receive `aria-expanded={boolean}` to communicate open/closed state to screen readers. This is a WCAG 4.1.2 Level A requirement.

## Task 2: Remove gradient text and fix hard-coded hex colors

**Gradient text (BAN — must remove):**
- `app/download/download.module.css:144-149` — `.titleGradient` class
- `components/landing/LandingPageClient.module.css:169-174` — `.heroTitleGradient` class
- `components/landing/LandingPageClient.module.css:622-628` — `.journeySubtitle` class
Replace all three with solid color text. Use font weight or size for emphasis.

**Hard-coded hex colors (147 instances):**
Replace all occurrences of `#10B981`, `#3B7EF6`, `#EF4444`, `#F59E0B`, `#8B5CF6`, `#9CA3AF`, `#DC2626`, `#059669` in `app/` and `components/` with their corresponding CSS variables (`var(--accent-green)`, `var(--accent-blue)`, etc.). Priority files: `app/privacy/page.tsx` (8 inline hex colors on h3 headings), `components/dashboard/GamificationCard.tsx`, `components/dashboard/Charts.tsx`.

**Nav active indicator (side-stripe pattern):**
In `app/globals.css:490-500`, `.nav-item-active::after` creates a 3px vertical strip with glow. Remove the `::after` pseudo-element — the `--accent-blue-dim` background already communicates active state sufficiently.

## Task 3: Fix motion — replace bounce easing and restrict infinite animations

**Bounce easing:**
In `app/globals.css:524`, `.animate-scale-in` uses `cubic-bezier(0.34, 1.56, 0.64, 1)` which overshoots and bounces. Replace with `cubic-bezier(0.16, 1, 0.3, 1)` (smooth expo deceleration, no overshoot). Apply same fix to the FAB `fabSlideUp` animation.

**Infinite glow pulse:**
`.animate-glow-pulse` runs `glowPulse` infinitely on decorative elements. Audit all usages of this class — restrict it to genuine live-status indicators only. Remove from purely decorative elements.

## Task 4: Define --font-mono CSS variable and replace all raw monospace usage

In `app/globals.css` (`:root` section), add:
```css
--font-mono: 'Courier Prime', 'Noto Sans Mono', ui-monospace, monospace;
```

Then replace all 13+ instances of `font-family: monospace` (or `fontFamily: 'monospace'`) with `var(--font-mono)` (CSS) or `'var(--font-mono)'` (inline). Affected files:
- `components/dashboard/Cards.module.css` (lines 35, 60, 123, 186, 285)
- `components/dashboard/HeroBalanceCard.module.css` (line 25)
- `components/dashboard/ChallengesCard.tsx` (inline styles)
- `components/dashboard/Charts.tsx` (inline styles)
- `components/dashboard/GamificationCard.tsx` (inline styles)
- `components/dashboard/MonthSummaryBanner.tsx` (inline styles)

## Task 5: Polish — glassmorphism, inline styles, scrollbar, z-index

**Glassmorphism on sidebar:**
In `app/globals.css:454-459`, `.glass-sidebar` applies `backdrop-filter: blur(8px)` to the sidebar. Remove the backdrop-filter — the sidebar sits over a solid background so blur adds visual noise and GPU cost with no benefit. Keep the background opacity.

**Inline style sprawl in transaction components:**
Extract inline style objects from:
- `components/transactions/TransactionFormModal.tsx:33` (type toggle buttons)
- `components/transactions/TransactionFilters.tsx:59` (filter buttons)
- `components/transactions/RecurringList.tsx:182` (type toggle buttons)
Move these to CSS modules or Tailwind classes.

**Firefox scrollbar:**
In `app/globals.css`, add to the `html` selector:
```css
scrollbar-width: thin;
scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
```

**z-index scale:**
In `app/globals.css` (`:root` section), define:
```css
--z-dropdown: 200;
--z-sticky: 300;
--z-overlay: 1000;
--z-modal: 1100;
```
Then replace scattered z-index numeric values throughout the codebase with these variables.

## Task 6: Dashboard layout hierarchy — break the uniform card grid

The dashboard (`app/(dashboard)/dashboard/page.tsx`) renders all cards at the same visual weight. Introduce hierarchy:
- Hero balance card should span full width at the top
- Recent transactions and monthly summary should be visually heavier (larger) than budget/challenges cards
- Use `grid-template-areas` or varied column spans to break the identical-card-grid pattern
- At least one card should occupy a different size than the others to create visual rhythm

## Task 7: Redesign HeroBalanceCard — escape the hero-metrics template

`components/dashboard/HeroBalanceCard.tsx` and `components/dashboard/HeroBalanceCard.module.css` implement the "big number + small label + trend badge + gradient background" template — the most recognizable AI dashboard pattern.

Redesign to engage the "dawn" brand concept:
- Replace the gradient background with a more intentional visual treatment
- The animated count-up is good — keep it
- Add contextual framing (e.g., time period label, or a subtle 6-month balance sparkline below the number) to make the number meaningful, not just large
- Remove the emoji (🏦) from the label — use a proper icon or none at all
- The card should feel grounded and informative, not like a KPI widget

## Task 8: Final polish pass

After all above tasks are complete, do a holistic review:
- Verify reduced-motion works correctly for all new animations
- Check light mode renders correctly for all color token replacements
- Verify RTL layout is preserved for any layout changes
- Add `sizes="42px"` to the Sidebar logo `<Image>` component (`components/layout/Sidebar.tsx:58`)
- Run `npm run typecheck` and `npm run lint` to ensure no regressions
