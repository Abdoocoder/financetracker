import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lang', 'ar');
    });
  });

  test('should show validation errors on invalid login', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.getByPlaceholder('you@example.com').fill('wrong@example.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    
    // Click on "تسجيل الدخول" (Login)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // Check for specific Arabic error message
    // "البريد الإلكتروني أو كلمة المرور غير صحيحة"
    await expect(page.locator('text=البريد الإلكتروني أو كلمة المرور غير صحيحة')).toBeVisible();
  });

  test('should allow switching between Login and Register', async ({ page }) => {
    await page.goto('/login');
    
    // Click on "سجل مجانا" (Register Free) link
    await page.getByRole('link', { name: 'سجل مجانا' }).click();
    
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByRole('heading', { name: 'ابدأ رحلتك المالية' })).toBeVisible();
    
    // Switch back to login
    await page.getByText('سجل الدخول').click();
    await expect(page).toHaveURL(/\/login/);
  });
});
