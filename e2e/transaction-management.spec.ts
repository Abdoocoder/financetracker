import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  // TODO: These tests require a logged-in user. Add auth setup via storageState
  // (e.g. a shared auth fixture that logs in and saves cookies) before enabling.
  test.skip(true, 'Requires authenticated session — add auth fixture before enabling');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
    });
    await page.goto('/dashboard/transactions');
  });

  test('should open add transaction form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'إضافة معاملة' }).first();
    await addButton.click();
    
    await expect(page.getByText('معاملة جديدة')).toBeVisible();
    await expect(page.getByLabel('المبلغ')).toBeVisible();
    await expect(page.getByLabel('الفئة')).toBeVisible();
  });

  test('should show validation errors on invalid transaction', async ({ page }) => {
    const addButton = page.getByRole('button', { name: 'إضافة معاملة' }).first();
    await addButton.click();
    
    // Submit empty
    await page.getByRole('button', { name: 'حفظ' }).click();
    
    await expect(page.locator('text=المبلغ مطلوب')).toBeVisible();
    await expect(page.locator('text=الفئة مطلوبة')).toBeVisible();
  });

  test('should allow searching transactions', async ({ page }) => {
    const searchInput = page.getByPlaceholder('بحث...');
    await searchInput.fill('Test Transaction');
    
    // Check if the list updates or the empty state is shown if no matches
    // Since it's a dynamic list, we just check if the UI reacts
    await expect(page.locator('.transaction-item')).toBeHidden(); // If none match
  });
});
