# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flow.spec.ts >> Authentication Flow >> should show validation errors on empty login
- Location: e2e\auth-flow.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=خطأ')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=خطأ')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: ف
      - heading "مرحباً بعودتك" [level=1] [ref=e6]
      - paragraph [ref=e7]: سجل دخولك لمتابعة وضعك المالي
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: البريد الإلكتروني
        - textbox "you@example.com" [active] [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: كلمة المرور
          - link "نسيت كلمة المرور؟" [ref=e15] [cursor=pointer]:
            - /url: /forgot-password
        - textbox "••••••••" [ref=e16]
      - button "تسجيل الدخول" [ref=e17] [cursor=pointer]
      - paragraph [ref=e18]:
        - text: ليس لديك حساب؟
        - link "سجل مجاناً" [ref=e19] [cursor=pointer]:
          - /url: /register
  - generic [ref=e20]:
    - img [ref=e22]
    - button "Open Tanstack query devtools" [ref=e70] [cursor=pointer]:
      - img [ref=e71]
  - button "Open Next.js Dev Tools" [ref=e124] [cursor=pointer]:
    - img [ref=e125]
  - alert [ref=e128]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should show validation errors on empty login', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     
  7  |     // Attempt to submit empty form
  8  |     await page.getByRole('button', { name: 'دخول' }).click();
  9  |     
  10 |     // Check for error message "البريد الإلكتروني مطلوب" or similar
  11 |     // Since we don't know the exact error message, we check for visibility of any error
  12 |     // Assuming UI shows a toast or message
> 13 |     await expect(page.locator('text=خطأ')).toBeVisible();
     |                                            ^ Error: expect(locator).toBeVisible() failed
  14 |   });
  15 | 
  16 |   test('should allow switching between Login and Register', async ({ page }) => {
  17 |     await page.goto('/login');
  18 |     
  19 |     // Click on "سجل الآن" (Register now)
  20 |     await page.getByText('سجل الآن').click();
  21 |     
  22 |     await expect(page).toHaveURL(/\/login\?mode=register/);
  23 |     await expect(page.getByRole('heading', { name: 'ابدأ رحلتك المالية' })).toBeVisible();
  24 |     
  25 |     // Switch back to login
  26 |     await page.getByText('سجل دخولك').click();
  27 |     await expect(page).toHaveURL(/\/login/);
  28 |   });
  29 | });
  30 | 
```