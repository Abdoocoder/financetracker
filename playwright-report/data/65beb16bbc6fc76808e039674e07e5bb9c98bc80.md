# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: transaction-management.spec.ts >> Transaction Management >> should allow searching transactions
- Location: e2e\transaction-management.spec.ts:33:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder('بحث...')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: ف
      - heading "مرحباً بعودتك" [level=1] [ref=e6]
      - paragraph [ref=e7]: سجل دخولك لمتابعة وضعك المالي
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: البريد الإلكتروني
        - textbox "you@example.com" [ref=e11]
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
  3  | test.describe('Transaction Management', () => {
  4  |   // We skip authentication setup for now and assume the page can be rendered (or logic tested)
  5  |   // or that we are using a dev environment where auth can be bypassed.
  6  |   
  7  |   test.beforeEach(async ({ page }) => {
  8  |     // In a real scenario, we would use page.addInitScript to mock the user session
  9  |     // Or use playwright.config storageState.
  10 |     await page.goto('/dashboard/transactions');
  11 |   });
  12 | 
  13 |   test('should open add transaction form', async ({ page }) => {
  14 |     const addButton = page.getByRole('button', { name: 'إضافة معاملة' }).first();
  15 |     await addButton.click();
  16 |     
  17 |     await expect(page.getByText('معاملة جديدة')).toBeVisible();
  18 |     await expect(page.getByLabel('المبلغ')).toBeVisible();
  19 |     await expect(page.getByLabel('الفئة')).toBeVisible();
  20 |   });
  21 | 
  22 |   test('should show validation errors on invalid transaction', async ({ page }) => {
  23 |     const addButton = page.getByRole('button', { name: 'إضافة معاملة' }).first();
  24 |     await addButton.click();
  25 |     
  26 |     // Submit empty
  27 |     await page.getByRole('button', { name: 'حفظ' }).click();
  28 |     
  29 |     await expect(page.locator('text=المبلغ مطلوب')).toBeVisible();
  30 |     await expect(page.locator('text=الفئة مطلوبة')).toBeVisible();
  31 |   });
  32 | 
  33 |   test('should allow searching transactions', async ({ page }) => {
  34 |     const searchInput = page.getByPlaceholder('بحث...');
> 35 |     await searchInput.fill('Test Transaction');
     |                       ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  36 |     
  37 |     // Check if the list updates or the empty state is shown if no matches
  38 |     // Since it's a dynamic list, we just check if the UI reacts
  39 |     await expect(page.locator('.transaction-item')).toBeHidden(); // If none match
  40 |   });
  41 | });
  42 | 
```