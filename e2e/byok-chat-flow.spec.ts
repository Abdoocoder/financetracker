import { test, expect } from '@playwright/test';

// Reuse the authenticated session created by global-setup
test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('BYOK Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
      localStorage.setItem('fajrak_welcome_shown', 'true');
    });
    await page.goto('/dashboard');
  });

  test('should open chat assistant and send a message', async ({ page }) => {
    // Open chat assistant - look for chat icon/button in dashboard
    const chatButton = page.getByRole('button', { name: /chat|مساعد|ai/i }).first();
    await expect(chatButton).toBeVisible({ timeout: 10000 });
    await chatButton.click();

    // Wait for chat panel to open
    await expect(page.getByRole('heading', { name: /chat|مساعد|ai assistant/i })).toBeVisible();

    // Select Ollama provider (clientDirect - no key needed)
    const providerSelect = page.getByLabel(/provider|مزود/i).first();
    await providerSelect.selectOption('ollama');

    // Type a message
    const input = page.getByPlaceholder(/ask|اسأل|رسالة/i).first();
    await input.fill('ما هو رصيدي الحالي؟');

    // Send message
    const sendButton = page.getByRole('button', { name: /send|إرسال/i }).first();
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.getByText('ما هو رصيدي الحالي؟')).toBeVisible();

    // Wait for assistant response (streaming)
    await expect(page.getByText(/thinking|جاري التفكير|تفكير/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error when no API key for proxy provider', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|مساعد|ai/i }).first();
    await chatButton.click();

    // Select OpenRouter (proxy provider - needs key)
    const providerSelect = page.getByLabel(/provider|مزود/i).first();
    await providerSelect.selectOption('openrouter');

    // Try to send without key
    const input = page.getByPlaceholder(/ask|اسأل|رسالة/i).first();
    await input.fill('اختبار');

    const sendButton = page.getByRole('button', { name: /send|إرسال/i }).first();
    await sendButton.click();

    // Should show error about missing key
    await expect(page.getByText(/no key|لا يوجد مفتاح|مفتاح غير موجود/i)).toBeVisible({ timeout: 5000 });
  });

  test('should clear chat history', async ({ page }) => {
    const chatButton = page.getByRole('button', { name: /chat|مساعد|ai/i }).first();
    await chatButton.click();

    const providerSelect = page.getByLabel(/provider|مزود/i).first();
    await providerSelect.selectOption('ollama');

    const input = page.getByPlaceholder(/ask|اسأل|رسالة/i).first();
    await input.fill('رسالة اختبار');
    const sendButton = page.getByRole('button', { name: /send|إرسال/i }).first();
    await sendButton.click();

    await expect(page.getByText('رسالة اختبار')).toBeVisible();

    // Click clear button
    const clearButton = page.getByRole('button', { name: /clear|مسح/i }).first();
    await clearButton.click();

    // Chat should be empty (showing greeting)
    await expect(page.getByText(/hi|مرحباً|greeting|تحية/i)).toBeVisible({ timeout: 5000 });
  });
});