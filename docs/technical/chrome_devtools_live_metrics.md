# Chrome DevTools "Live metrics" console noise

## Status

Investigated and concluded — documentation only. **No runtime behavior
change.** No app code was changed.

## Artifact

While debugging with Chrome DevTools open, the page console shows
seemingly-unbounded `VM<n>:<line> Uncaught TypeError: ...` errors that
are not produced by the app.

Example class of stack trace:

```
VM73:2 Uncaught TypeError: Cannot read properties of undefined (reading '...')
    at VM73:2:...
```

## Root cause

This is the Chrome DevTools **"Live metrics"** feature's injected
script crashing on its own. The exact error shape matches the publicly
reported Chrome bug:

- Chrome issue **553614970**
- Angular project issue for the identical signature: **angular/angular#70464**

The faulting script is injected by DevTools into every inspected page to
probe runtime metrics; when that injected probe throws, the exception
surfaces in the app's console with a `VM<n>` source label. It is
unrelated to application code, does not throw in the app's JavaScript,
and has no effect on page behavior or Sentry.

## How to verify / avoid

- Confirm the error source is `VM<n>:...` (an injected, non-file source).
- The errors appear only while DevTools is attached (reproducible by
  opening DevTools; they do not appear in the same page session's log
  once DevTools is closed, nor in runtime/log providers).
- No fix is needed in the FinanceTracker codebase.

## Reporting

If the noise becomes more than cosmetic, file against the Chromium bug
rather than treating it as a FinanceTracker defect.