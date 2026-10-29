import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe.configure({ mode: 'serial' });

test.describe('BYOK Keys Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      localStorage.setItem('fajrak_welcome_shown', 'true');
    });
    await page.goto('/dashboard/settings');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any keys created during the test to avoid state pollution
    const revokeButtons = page.getByRole('button', { name: /حذف|remove/i });
    const count = await revokeButtons.count();
    for (let i = 0; i < count; i++) {
      try {
        await revokeButtons.first().click();
        const confirmButton = page.getByRole('button', { name: /حذف|remove/i }).last();
        await confirmButton.click();
        // Wait for toast to confirm removal
        await page.locator('[role="status"], [role="alert"]').first().waitFor({ timeout: 5000 });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('should navigate to BYOK keys section and show providers', async ({ page }) => {
    // Find BYOK keys section (accordion is open by default now)
    const byokSection = page.getByText(/BYOK|مفاتيخ|llm/i).first();
    await expect(byokSection).toBeVisible({ timeout: 10000 });

    // Open the Supported Providers <details> to reveal the provider chips
    const details = page.locator('details').filter({ hasText: /المزوّدون المدعومون|Supported Providers/i });
    await details.locator('summary').click();

    // Should show supported providers (PROXY_PROVIDERS only - Ollama is clientDirect)
    // Scope to the chips inside the opened details to avoid matching <option> elements
    // Use .first() to satisfy strict mode - at least one provider chip must be visible
    await expect(details.locator('span').filter({ hasText: /NVIDIA NIM|OpenRouter|OpenAI|Anthropic|Gemini/i }).first()).toBeVisible();
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

    // Should show success toast (using accessible role)
    await expect(page.locator('[role="status"], [role="alert"]').first()).toBeVisible({ timeout: 10000 });
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

    await expect(page.locator('[role="status"], [role="alert"]').first()).toBeVisible({ timeout: 10000 });

    // Revoke the key - find the key card by its name and click the revoke button within it
    const keyCard = page.locator('div', { hasText: 'Rotation Test Key' }).filter({ has: page.getByRole('button', { name: /حذف|remove/i }) }).first();
    await keyCard.getByRole('button', { name: /حذف|remove/i }).first().click();

    // Confirm revocation dialog
    const confirmButton = page.getByRole('button', { name: /حذف|remove/i }).last();
    await confirmButton.click();

    await expect(page.locator('[role="status"], [role="alert"]').first()).toBeVisible({ timeout: 10000 });

    // Re-add a new key
    const providerSelect2 = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect2.selectOption('openrouter');

    const nameInput2 = page.getByPlaceholder(/اسم المفتاح|key name/i).first();
    await nameInput2.fill('Rotation Test Key 2');

    const keyInput2 = page.getByPlaceholder(/مفتاح api|api key/i).first();
    await keyInput2.fill('sk-or-rotate2-' + Date.now());

    const saveButton2 = page.getByRole('button', { name: /إضافة|add/i }).first();
    await saveButton2.click();

    await expect(page.locator('[role="status"], [role="alert"]').first()).toBeVisible({ timeout: 10000 });
  });
});