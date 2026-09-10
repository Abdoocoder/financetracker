# Stack Details — Fajrak

## Core Dependencies

### Framework
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.3.4 | App Router framework |
| react | 19.2.8 | UI library |
| react-dom | 19.2.8 | React DOM renderer |
| typescript | 5.9.3 | Type system |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | 2.x | Supabase client SDK |
| @supabase/ssr | 0.x | Supabase SSR helpers |
| zod | 4.4.3 | API input validation |
| @modelcontextprotocol/server | latest | MCP server SDK |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| recharts | 3.8.x | Chart components |
| @tanstack/react-query | 5.96.x | Server state management |
| next/font/google | built-in | Cairo font loading |

### Observability
| Package | Version | Purpose |
|---------|---------|---------|
| @sentry/nextjs | 10.46.x | Error tracking + replay |
| @vercel/speed-insights | latest | Performance analytics |

### Push Notifications
| Package | Version | Purpose |
|---------|---------|---------|
| firebase | 11.x | Client-side Firebase |
| firebase-admin | 13.x | Server-side Firebase |
| web-push | 3.6.7 | Web Push Protocol |

### Build & Dev
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | 9.x | Linting |
| @eslint/eslintrc | latest | ESLint config |
| tailwindcss | 4.x | CSS framework |
| @tailwindcss/postcss | latest | PostCSS integration |
| postcss | 8.x | CSS processing |
| autoprefixer | 10.x | CSS vendor prefixes |

### Testing
| Package | Version | Purpose |
|---------|---------|---------|
| jest | 30.3.x | Unit testing |
| jest-environment-jsdom | 30.3.x | Browser simulation |
| @playwright/test | latest | E2E testing |
| @testing-library/react | latest | React component testing |
| @testing-library/jest-dom | latest | DOM matchers |
| dotenv | latest | Env loading for E2E |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| @types/node | 22.x | Node.js types |
| @types/react | 19.x | React types |
| @types/react-dom | 19.x | React DOM types |
| @types/jest | latest | Jest types |
| ts-node | 10.x | TypeScript execution |

## Environment Variables

### Required
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY      # Supabase service role key (server-only)
CRON_SECRET                    # Bearer token for cron job authentication
```

### Optional (Feature-Specific)
```
NEXT_PUBLIC_SENTRY_DSN         # Sentry DSN for error tracking
SENTRY_AUTH_TOKEN              # Sentry source maps upload token
FIREBASE_PROJECT_ID            # Firebase project config
FIREBASE_CLIENT_EMAIL          # Firebase admin SDK
FIREBASE_PRIVATE_KEY           # Firebase admin SDK (PEM format)
NEXT_PUBLIC_VAPID_KEY          # Web Push public key
VAPID_PRIVATE_KEY              # Web Push private key
E2E_TEST_EMAIL                 # E2E test account email
E2E_TEST_PASSWORD              # E2E test account password
```

### Environment Files
- `.env.local` — Local development (gitignored)
- `.env.example` — Template with placeholder values
- Vercel dashboard — Production environment variables

## Database Schema (Supabase Tables)

### Core Tables
- `profiles` — User profiles (currency, monthly_income, plan, timezone, assets)
- `transactions` — Income/expense/transfer records
- `accounts` — Bank accounts, cash, credit cards
- `debts` — Debt tracking (owed/receivable)
- `debt_payments` — Payment history against debts
- `investments` — Investment portfolio (stocks, ETFs, crypto)
- `investment_transactions` — Buy/sell history
- `budgets` — Monthly category budgets
- `savings_goals` — Savings targets with progress
- `recurring_transactions` — Recurring income/expenses

### Supporting Tables
- `alerts` — User notifications (warning, motivation, reminder, achievement)
- `user_stats` — Gamification (streaks, points, badges, level)
- `zakat_history` — Annual zakat calculations
- `api_keys` — Personal access tokens for external API
- `api_audit_log` — API access audit trail

### Category Constants
```typescript
EXPENSE_CATEGORIES = [
  'إيجار / قسط', 'مواصلات', 'طعام وشراب', 'فواتير',
  'صحة', 'تعليم', 'ترفيه', 'صلة رحم', 'ملابس', 'أخرى'
]
INCOME_CATEGORIES = ['راتب', 'عمل حر', 'استثمار', 'مكافأة', 'أخرى']
```

## Deployment

### Web (Vercel)
- **Build**: `next build` → standalone output
- **Node**: 26.x
- **Region**: Auto (Vercel edge network)
- **Domain**: fajrak.com
- **SSL**: Auto (Vercel managed)

### Mobile (Flutter)
- **Platform**: Android (Google Play Store)
- **Version**: 3.40.0+51
- **Build**: `flutter build apk --release`
- **Package**: com.fajrak.app
