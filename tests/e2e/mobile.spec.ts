import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

test('phone layout: scenario picker, stacked lines, no sideways scrolling', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: 'Scenario' }).selectOption('slow-year');
  await expect(page.getByRole('heading', { level: 1, name: 'Slow first year' })).toBeVisible();
  await expect(page.getByLabel(/^Amount per month for Repairs and servicing/)).toHaveValue('23000');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);

  await page.getByRole('link', { name: 'Compare' }).click();
  await expect(page.getByRole('heading', { name: 'Compare scenarios' })).toBeVisible();
  const overflowCompare = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflowCompare).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});
