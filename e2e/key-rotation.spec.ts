import { test, expect } from '@playwright/test';

test.describe('Key Rotation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      localStorage.setItem('fajrak_welcome_shown', 'true');
    });
    await page.goto('/dashboard/settings');
  });

  test('should navigate to BYOK keys section and show providers', async ({ page }) => {
    // Find BYOK keys section
    const byokSection = page.getByText(/BYOK|مفاتيح|llm/i).first();
    await expect(byokSection).toBeVisible({ timeout: 10000 });

    // Should show supported providers
    await expect(page.getByText(/ollama|openrouter|nvidia/i)).toBeVisible();
  });

  test('should allow adding a new BYOK key', async ({ page }) => {
    // Navigate to add key form
    const addKeyButton = page.getByRole('button', { name: /add key|إضافة مفتاح|مفتاح جديد/i }).first();
    await expect(addKeyButton).toBeVisible({ timeout: 10000 });
    await addKeyButton.click();

    // Fill in key details
    const providerSelect = page.getByLabel(/provider|مزود/i).first();
    await providerSelect.selectOption('openrouter');

    const nameInput = page.getByPlaceholder(/key name|اسم المفتاح/i).first();
    await nameInput.fill('E2E Test Key');

    const keyInput = page.getByPlaceholder(/api key|مفتاح api/i).first();
    await keyInput.fill('sk-or-test-' + Date.now());

    // Save
    const saveButton = page.getByRole('button', { name: /add|save|إضافة|حفظ/i }).first();
    await saveButton.click();

    // Should show success
    await expect(page.getByText(/saved|تم الحفظ|added|تمت الإضافة/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show key rotation UI', async ({ page }) => {
    // Look for key rotation button/link
    const rotationButton = page.getByRole('button', { name: /rotate|تدوير|تدوير المفتاح/i }).first();
    await expect(rotationButton).toBeVisible({ timeout: 10000 });
  });
});