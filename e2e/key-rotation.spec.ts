import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('BYOK Keys Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      localStorage.setItem('fajrak_welcome_shown', 'true');
    });
    await page.goto('/dashboard/settings');
  });

  test('should navigate to BYOK keys section and show providers', async ({ page }) => {
    // Find BYOK keys section (accordion is open by default now)
    const byokSection = page.getByText(/BYOK|مفاتيح|llm/i).first();
    await expect(byokSection).toBeVisible({ timeout: 10000 });

    // Should show supported providers
    await expect(page.getByText(/ollama|openrouter|nvidia/i)).toBeVisible();
  });

  test('should allow adding a new BYOK key', async ({ page }) => {
    // The add key form is always visible at the bottom of the BYOK section
    // Select provider
    const providerSelect = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect.selectOption('openrouter');

    // Fill in key details
    const nameInput = page.getByPlaceholder(/اسم المفتاح|key name/i).first();
    await nameInput.fill('E2E Test Key');

    const keyInput = page.getByPlaceholder(/مفتاح api|api key/i).first();
    await keyInput.fill('sk-or-test-' + Date.now());

    // Save - button says "+ إضافة مفتاح"
    const saveButton = page.getByRole('button', { name: /إضافة|add/i }).first();
    await saveButton.click();

    // Should show success toast
    await expect(page.getByText(/تم الحفظ|saved|تمت الإضافة|added/i)).toBeVisible({ timeout: 10000 });
  });

  test('should rotate a BYOK key (add → revoke → re-add)', async ({ page }) => {
    // Add a key first
    const providerSelect = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect.selectOption('openrouter');

    const nameInput = page.getByPlaceholder(/اسم المفتاح|key name/i).first();
    await nameInput.fill('Rotation Test Key');

    const keyInput = page.getByPlaceholder(/مفتاح api|api key/i).first();
    await keyInput.fill('sk-or-rotate-' + Date.now());

    const saveButton = page.getByRole('button', { name: /إضافة|add/i }).first();
    await saveButton.click();

    await expect(page.getByText(/تم الحفظ|saved|تمت الإضافة|added/i)).toBeVisible({ timeout: 10000 });

    // Revoke the key
    const revokeButton = page.getByRole('button', { name: /حذف|remove/i }).first();
    await revokeButton.click();

    // Confirm revocation dialog
    const confirmButton = page.getByRole('button', { name: /حذف|remove/i }).last();
    await confirmButton.click();

    await expect(page.getByText(/تم الحذف|removed|تم حذف/i)).toBeVisible({ timeout: 10000 });

    // Re-add a new key
    const providerSelect2 = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect2.selectOption('openrouter');

    const nameInput2 = page.getByPlaceholder(/اسم المفتاح|key name/i).first();
    await nameInput2.fill('Rotation Test Key 2');

    const keyInput2 = page.getByPlaceholder(/مفتاح api|api key/i).first();
    await keyInput2.fill('sk-or-rotate2-' + Date.now());

    const saveButton2 = page.getByRole('button', { name: /إضافة|add/i }).first();
    await saveButton2.click();

    await expect(page.getByText(/تم الحفظ|saved|تمت الإضافة|added/i)).toBeVisible({ timeout: 10000 });
  });
});