import { test, expect } from '@playwright/test';

test.describe('Landing Page Smoke Test', () => {
  test('should load the landing page and show key brand elements', async ({ page }) => {
    // Go to the home page
    await page.goto('/');

    // Check for the brand name "فجرك" in the nav
    const brandName = page.getByText('فجرك').first();
    await expect(brandName).toBeVisible();

    // Check for the main hero heading
    const heroHeading = page.getByRole('heading', { name: 'كلنا نحلم بالثراء' });
    await expect(heroHeading).toBeVisible();

    // Check for the "تسجيل الدخول" (Login) button
    const loginBtn = page.getByRole('link', { name: 'تسجيل الدخول' });
    await expect(loginBtn).toBeVisible();

    // Check for "ابدأ مجاناً" (Start for free) CTA
    const startBtn = page.getByRole('link', { name: 'ابدأ مجاناً ←' });
    await expect(startBtn).toBeVisible();
  });

  test('should have a working link to the login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'تسجيل الدخول' }).click();
    
    // Should navigate to /login
    await expect(page).toHaveURL(/\/login/);
    
    const loginHeading = page.getByRole('heading', { level: 1 });
    // Check if login heading is present (assuming it contains "تسجيل الدخول" or similar)
    await expect(loginHeading).toBeVisible();
  });
});
