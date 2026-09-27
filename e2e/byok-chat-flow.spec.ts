import { test, expect } from '@playwright/test';

// Reuse the authenticated session created by global-setup
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('BYOK Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      localStorage.setItem('fajrak_welcome_shown', 'true');
    });
    await page.goto('/dashboard/chat');
  });

  test('should open chat assistant and send a message', async ({ page }) => {
    // Wait for chat page to load - check for chat title
    await expect(page.getByRole('heading', { name: /المساعد الذكي|ai assistant/i })).toBeVisible({ timeout: 10000 });

    // Select Ollama provider (clientDirect - no key needed)
    const providerSelect = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect.selectOption('ollama');

    // Type a message
    const input = page.getByPlaceholder(/اسأل|ask|رسالة/i).first();
    await input.fill('ما هو رصيدي الحالي؟');

    // Send message
    const sendButton = page.getByRole('button', { name: /إرسال|send/i }).first();
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.getByText('ما هو رصيدي الحالي؟')).toBeVisible();

    // Wait for assistant response (streaming)
    await expect(page.getByText(/جارٍ التفكير|thinking|تفكير/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error when no API key for proxy provider', async ({ page }) => {
    // Wait for chat page to load
    await expect(page.getByRole('heading', { name: /المساعد الذكي|ai assistant/i })).toBeVisible({ timeout: 10000 });

    // Select OpenRouter (proxy provider - needs key)
    const providerSelect = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect.selectOption('openrouter');

    // Try to send without key
    const input = page.getByPlaceholder(/اسأل|ask|رسالة/i).first();
    await input.fill('اختبار');

    const sendButton = page.getByRole('button', { name: /إرسال|send/i }).first();
    await sendButton.click();

    // Should show error about missing key
    await expect(page.getByText(/لا يوجد مفتاح API مخزّن/i)).toBeVisible({ timeout: 5000 });
  });

  test('should clear chat history', async ({ page }) => {
    // Wait for chat page to load
    await expect(page.getByRole('heading', { name: /المساعد الذكي|ai assistant/i })).toBeVisible({ timeout: 10000 });

    const providerSelect = page.getByLabel(/المزوّد|provider/i).first();
    await providerSelect.selectOption('ollama');

    const input = page.getByPlaceholder(/اسأل|ask|رسالة/i).first();
    await input.fill('رسالة اختبار');
    const sendButton = page.getByRole('button', { name: /إرسال|send/i }).first();
    await sendButton.click();

    await expect(page.getByText('رسالة اختبار')).toBeVisible();

    // Click clear button
    const clearButton = page.getByRole('button', { name: /مسح|clear/i }).first();
    await clearButton.click();

    // Chat should be empty (showing greeting)
    await expect(page.getByText(/مرحبًا/i)).toBeVisible({ timeout: 5000 });
  });
});