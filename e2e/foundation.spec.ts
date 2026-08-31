import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('foundation shell', () => {
  test('renders the phase 00 placeholder at responsive widths', async ({ page }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page).toHaveTitle(/ClapOut Studio - Foundation/);
      await expect(page.getByRole('heading', { name: /frontend foundation/i })).toBeVisible();
      await expect(page.getByText('MOCKED')).toBeVisible();
      await expect(page.getByText('PrimeNG 22 + Tailwind v4')).toBeVisible();
    }
  });

  test('has no critical accessibility violations on the placeholder route', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === 'critical',
    );

    expect(criticalViolations).toEqual([]);
  });
});
