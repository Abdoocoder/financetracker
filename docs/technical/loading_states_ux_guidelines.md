# Loading States UX Guidelines

This document defines the minimum loading and failure UX standards for dashboard pages.

## Scope

- Next.js dashboard routes under `app/(dashboard)/dashboard/*`
- Route-level loading boundaries (`loading.tsx`)
- In-page async loading states (widgets, modals, fetch retries)

## Required Standards

- Use skeletons (`className="skeleton"`) for initial loading of pages and heavy sections.
- Avoid plain loading text or spinner-only states for primary content areas.
- Dynamic imports must provide a `loading` fallback with a visual placeholder.
- For icon-only controls, include `aria-label`.
- While saving or loading actions:
  - Disable action buttons.
  - Show waiting feedback (`⏳ ...` or localized equivalent).
  - Use `cursor: not-allowed` for disabled interactive controls.

## Failure Handling

- Every async load path should have explicit error handling:
  - Show a user-facing localized message.
  - Provide a retry action.
  - Ensure loading state is released in `finally`.
- On partial data failure, avoid rendering stale mixed state without explanation.

## Consistency Checklist

- `loading.tsx` exists for major dashboard sections.
- Modal-level loading uses skeleton rows/cards where data density is high.
- Empty states are visually distinct from loading and error states.
- Arabic and English copy are both available for user-facing loading/error labels.

## Verification Steps

1. Slow network simulation (DevTools) confirms skeleton visibility before content.
2. Offline/API failure simulation confirms:
   - no infinite loading lock,
   - clear error text,
   - retry button works.
3. Keyboard navigation confirms interactive retry/action controls are reachable.
