# Coding Patterns & Conventions — Fajrak

## Component Patterns

### Client Components
- All interactive components use `'use client'` directive
- Pages are client components that fetch their own data
- Server Components used only for layout structure and metadata generation

### Dynamic Imports
Heavy components are dynamically imported with SSR disabled:
```tsx
const MiniBarChart = nextDynamic(
  () => import('@/components/dashboard/Charts').then(m => ({ default: m.MiniBarChart })),
  { ssr: false, loading: () => <div className={`skeleton ${styles.skeletonChart}`} /> }
)
```
Convention: Always provide a skeleton `loading` fallback.

### State Management
- **Local state**: `useState` for UI state (loading, errors, form values)
- **Server state**: React Query for data fetching and caching
- **Global state**: Context providers for auth (`UserProvider`), i18n (`I18nProvider`), theme (`ThemeProvider`)
- **Layout state**: `localStorage` for dashboard card visibility preferences

### Forms
- Native React state + controlled inputs
- No form library (no react-hook-form, no formik)
- Manual validation with user-facing error messages
- `autoFocus` on first input
- Loading state: button shows spinner text + `disabled` + `cursor: not-allowed`

### Error Handling
- Client: `ErrorBoundary` component wraps dashboard content
- API routes: `try/catch` with `console.error` + 500 JSON response
- Cron routes: `verifyCronAuth` throws on misconfiguration (fail-loud)
- BYOK: Encryption failures return generic error (never expose key material)

## API Route Patterns

### Authentication
Three auth patterns depending on route type:

1. **Cron routes**: `verifyCronAuth(request)` → `CRON_SECRET` timing-safe comparison
2. **External API**: `verifyApiKey(token)` → PAT validation + `writeAuditLog()`
3. **User-facing**: Supabase session token via `Authorization: Bearer` header

### Request Validation
```typescript
const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().max(500).optional().nullable(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
```
- Zod for API route validation (server-side)
- Manual validation for client forms

### Response Format
```typescript
// Success
return NextResponse.json({ data: result })
// Error
return NextResponse.json({ error: 'Message' }, { status: 4xx })
```

### Rate Limiting
```typescript
const result = rateLimit(request, { limit: 10, windowMs: 60_000 })
if (!result.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
// Attach result.headers to response
```

## Supabase Patterns

### Client-Side Query
```typescript
const supabase = createClient()
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id)
  .order('transaction_date', { ascending: false })
```

### Server-Side Admin Query
```typescript
const supabase = createAdminClient()
// Bypasses RLS — use for cross-user operations only
const { data } = await supabase.from('profiles').select('*')
```

### Real-Time
```typescript
const channel = supabase
  .channel('alerts-count')
  .on('postgres_changes', { event: '*', table: 'alerts', filter: `user_id=eq.${id}` }, callback)
  .subscribe()
// Cleanup: supabase.removeChannel(channel)
```

## Testing Patterns

### Mock Structure
```typescript
// Fluent query builder mock (chainable)
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: (t: string) => mockFrom(t),
  })),
}))
```

### Test Organization
- Tests in `__tests__/` mirroring source structure
- `@jest-environment node` for API route tests
- `@/` path alias mapping
- Shared mock helpers in `__tests__/helpers/supabase-mock.ts`

### E2E Patterns
- Global auth setup via Supabase PKCE (saves `storageState`)
- Arabic as default language for locators
- Chromium-only (single browser)
- Tests are independent (no shared state between specs)

## i18n Patterns

### Client-Side
```typescript
const { t, lang } = useI18n()
t('auth_login_title')  // Returns translated string
```

### Category Translation
```typescript
const { tCategory } = useI18n()
tCategory('طعام وشراب')  // Returns translated category name
```

### RTL Support
```html
<html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
```

## CSS Patterns

### CSS Modules
- Dashboard components use `.module.css` files
- Scoped class names prevent conflicts

### CSS Variables (Theming)
```css
var(--text-primary)    /* Main text color */
var(--bg-card)         /* Card background */
var(--border)          /* Border color */
var(--accent-blue)     /* Primary accent */
```

### Skeleton Loading
```tsx
<div className="skeleton" />  /* CSS class for loading skeleton */
```

## Naming Conventions
- **Files**: `kebab-case` for components (`quick-add.tsx`), `camelCase` for utilities (`useAccounts.ts`)
- **Components**: `PascalCase` (`HeroBalanceCard`, `DashboardCustomizer`)
- **Hooks**: `use` prefix (`useAccounts`, `useDashboardData`)
- **API routes**: `kebab-case` directories (`daily-reminder/`, `push-send/`)
- **Types**: `PascalCase` interfaces (`Transaction`, `Profile`, `Debt`)
- **Constants**: `UPPER_SNAKE_CASE` (`EXPENSE_CATEGORIES`, `MAX_DESCRIPTION_LENGTH`)
- **i18n keys**: `snake_case` with prefix (`auth_login_title`, `dash_total_balance`)

## Code Style
- TypeScript strict mode — no `any` without justification
- No comments in code (unless requested)
- Tailwind utility classes preferred over custom CSS
- Arabic comments in codebase (bilingual project)
- Dynamic imports for heavy components (Recharts, gamification, modals)
- Cleanup functions in `useEffect` for subscriptions and timers
