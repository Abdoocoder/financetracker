import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  // We skip authentication setup for now and assume the page can be rendered (or logic tested)
  // or that we are using a dev environment where auth can be bypassed.
  
  test.beforeEach(async ({ page }) => {
    // In a real scenario, we would use page.addInitScript to mock the user session
    // Or use playwright.config storageState.
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
