import { test, expect } from '@playwright/test';

// Reuse the authenticated session created by global-setup (requires
// E2E_TEST_EMAIL/E2E_TEST_PASSWORD env vars). If global-setup couldn't log in
// it skips building the file, so the storageState will be missing and these
// tests fail because the authenticated page can't be loaded.
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Transaction Management', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      // Suppress the first-visit welcome modal (WelcomeModal.tsx, key
      // 'fajrak_welcome_shown') which renders a full-screen fixed overlay,
      // and the onboarding tour for the transactions page (OnboardingTour.tsx,
      // key 'tour_transactions'). Both would block interaction otherwise.
      localStorage.setItem('fajrak_welcome_shown', 'true');
      localStorage.setItem('tour_transactions', 'true');
    });
    await page.goto('/dashboard/transactions');
  });

  test('should open add transaction form', async ({ page }) => {
    // The header + empty-state add buttons both render as "+ + إضافة".
    const addButton = page.getByRole('button', { name: '+ + إضافة' }).first();
    await addButton.click();

    await expect(page.getByRole('heading', { name: '+ إضافة' })).toBeVisible();
  });

  test('should show validation errors on invalid transaction', async ({ page }) => {
    const addButton = page.getByRole('button', { name: '+ + إضافة' }).first();
    await addButton.click();

    // The modal's save button is labelled "إضافة" (trans_add). Use exact match
    // so it doesn't collide with the "+ + إضافة" add buttons.
    await page.getByRole('button', { name: 'إضافة', exact: true }).click();

    await expect(page.getByText('المبلغ مطلوب')).toBeVisible();
    await expect(page.getByText('الفئة مطلوبة')).toBeVisible();
  });

  test('should allow searching transactions', async ({ page }) => {
    const searchInput = page.getByPlaceholder('🔍 ابحث عن معاملة...');
    await searchInput.fill('xxxx-non-existent-transaction');

    // A string that can't match any real transaction should collapse the list
    // to the empty state, regardless of what data the test account has.
    await expect(page.getByText('لا توجد معاملات')).toBeVisible();
  });
});
