import { expect, test } from '@playwright/test';
import { blur, downloadedText, expectNoAxeViolations } from './helpers';

const rentAmount = /^Amount per month for Workshop rent/;

test.describe('editing and history', () => {
  test('a branch stores an override; undo and redo work from the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Hire an apprentice/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Hire an apprentice' })).toBeFocused();

    const rent = page.getByLabel(rentAmount);
    await rent.fill('9000');
    await expect(page.getByText('Changed here')).toBeVisible();
    await expect(
      page.getByLabel('Amount per month for Workshop rent (changed in this scenario)'),
    ).toHaveValue('9000');

    await blur(page);
    await page.keyboard.press('Control+z');
    await expect(rent).toHaveValue('7800');
    await expect(
      page.getByRole('status').filter({ hasText: 'Undid: Change amount of Workshop rent' }),
    ).toBeVisible();
    await page.keyboard.press('Control+Shift+z');
    await expect(rent).toHaveValue('9000');

    await page.getByRole('button', { name: 'Revert Workshop rent' }).click();
    await expect(rent).toHaveValue('7800');
    await expect(page.getByText('Changed here')).toHaveCount(0);

    // The baseline was never touched.
    await page.getByRole('link', { name: /^Baseline/ }).click();
    await expect(rent).toHaveValue('7800');
  });

  test('typing coalesces into one undo step and invalid drafts never reach the plan', async ({ page }) => {
    await page.goto('/');
    const rent = page.getByLabel(rentAmount);
    await rent.fill('');
    await expect(page.getByRole('alert').filter({ hasText: 'Enter a number' })).toBeVisible();
    await rent.pressSequentially('8100', { delay: 30 });
    await blur(page);
    await page.getByRole('button', { name: /^Undo/ }).click();
    await expect(rent).toHaveValue('7800');
    await expect(page.getByRole('button', { name: /^Undo/ })).toBeDisabled();
  });

  test('branch, remove and restore a line, delete the branch and undo the delete', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Branch from here' }).click();
    await page.getByPlaceholder('Name of the new branch').fill('Lean year');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Lean year' })).toBeVisible();
    await expect(page.getByText('Branch of Baseline')).toBeVisible();

    await page.getByRole('button', { name: 'Remove Utilities' }).click();
    const removed = page.getByRole('region', { name: 'Removed in this scenario' });
    await expect(removed).toContainText('Utilities');
    await removed.getByRole('button', { name: 'Restore Utilities' }).click();
    await expect(removed).toHaveCount(0);

    await page.getByRole('button', { name: 'Delete scenario' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Baseline' })).toBeVisible();
    const toast = page.getByRole('status').filter({ hasText: 'Deleted Lean year.' });
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('link', { name: /Lean year/ })).toBeVisible();
  });

  test('changes persist across reloads', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(rentAmount).fill('8000');
    await expect(page.getByText(/Saved in this browser \d\d:\d\d/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(rentAmount)).toHaveValue('8000');
  });
});

test.describe('comparison, export and import', () => {
  test('compare scenarios with an accessible chart and export CSV', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.getByRole('heading', { name: 'Compare scenarios' })).toBeVisible();
    const metrics = page.locator('table.metrics');
    await expect(metrics.getByRole('columnheader')).toHaveText([
      'Figure',
      'Baseline',
      'Hire an apprentice',
      'Slow first year',
      'Apprentice + bigger space',
    ]);
    await expect(metrics.getByRole('row', { name: /Cash runs out/ })).toContainText('Apr 2027');

    await page.getByRole('checkbox', { name: 'Slow first year' }).uncheck();
    await expect(metrics.getByRole('columnheader')).toHaveCount(4);

    const plot = page.getByRole('group', { name: /Closing balance/ });
    await plot.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.chart__tooltip')).toContainText('Jan 2027');
    await page.keyboard.press('End');
    await expect(page.locator('.chart__tooltip')).toContainText('Dec 2028');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^planwright-comparison-\d{8}-\d{4}\.csv$/);
    const csv = await downloadedText(download);
    expect(csv.startsWith('\uFEFFMonth,Baseline: net,Baseline: balance,')).toBe(true);
    expect(csv.split('\r\n')).toHaveLength(26);
    await expectNoAxeViolations(page);
  });

  test('CSV export neutralises formulas typed into line names', async ({ page }) => {
    await page.goto('/');
    const add = page.getByRole('form', { name: 'Add expense line' });
    await add.getByPlaceholder('Name').fill('=HYPERLINK("http://example.invalid","click")');
    await add.getByPlaceholder('0').fill('10');
    await add.getByRole('button', { name: /Add to/ }).click();
    await page.getByRole('link', { name: 'Data' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Lines of Baseline/ }).click(),
    ]);
    const csv = await downloadedText(download);
    expect(csv).toContain(`"'=HYPERLINK(""http://example.invalid"",""click"")"`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  test('export a plan, replace it, then import it back; bad files are explained', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Plan settings').click();
    await page.getByLabel('Plan name').fill('Exported plan');
    await page.getByRole('link', { name: 'Data' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Plan file (JSON)' }).click(),
    ]);
    const json = await downloadedText(download);
    expect(JSON.parse(json)).toMatchObject({ format: 'planwright', version: 1 });

    await page.getByRole('button', { name: 'Load sample plan' }).click();
    await expect(page.locator('.brand__plan')).toHaveText('Riverside Bike Workshop (sample)');

    const input = page.getByLabel(/Choose a Planwright plan file/);
    await input.setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"planwright","version":9}'),
    });
    await expect(page.getByRole('alert')).toContainText('reads up to format 1');

    await input.setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(json) });
    await expect(page.getByRole('status').filter({ hasText: 'plan.json' })).toContainText(
      '"Exported plan": 4 scenarios',
    );
    await page.getByRole('button', { name: 'Replace current plan' }).click();
    await expect(page.locator('.brand__plan')).toHaveText('Exported plan');
    await expectNoAxeViolations(page);
  });
});

test.describe('offline, print and hardening', () => {
  test('keeps working offline once loaded', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByText('Works offline')).toBeVisible({ timeout: 15_000 });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Baseline' })).toBeVisible();
    await expect(page.getByText(/Offline, still working/)).toBeVisible();
    // Lazy views are precached as well.
    await page.getByRole('link', { name: 'Compare' }).click();
    await expect(page.getByRole('heading', { name: 'Compare scenarios' })).toBeVisible();
    await context.setOffline(false);
  });

  test('print view hides the app chrome and keeps the report', async ({ page }) => {
    await page.goto('/print');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Riverside Bike Workshop (sample)' }),
    ).toBeVisible();
    await expectNoAxeViolations(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden();
    await expect(page.getByText('What each scenario assumes')).toBeVisible();
    await expect(page.getByText('Opening balance ₪35,000 instead of ₪60,000')).toBeVisible();
  });

  test('plan editor passes axe checks', async ({ page }) => {
    await page.goto('/');
    await expectNoAxeViolations(page);
    await page.getByRole('link', { name: /Apprentice \+ bigger space/ }).click();
    await expectNoAxeViolations(page);
  });

  test('server sends security headers and only serves files', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("script-src 'self'");
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['cache-control']).toBe('no-cache');
    expect((await request.get('/assets/missing.js')).status()).toBe(404);
    expect((await request.post('/')).status()).toBe(405);
    expect(await (await request.get('/healthz')).text()).toBe('ok\n');
  });
});
