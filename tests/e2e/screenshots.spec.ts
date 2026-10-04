import { test } from '@playwright/test';

/** Regenerates docs/screenshots from the running image: npm run screenshots */
const dir = 'docs/screenshots';

test('documentation screenshots', async ({ page, browser, baseURL }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Apprentice \+ bigger space/ }).click();
  await page.screenshot({ path: `${dir}/plan-branch.png` });

  await page.goto('/compare');
  await page.getByRole('group', { name: /Closing balance/ }).focus();
  for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: `${dir}/compare.png` });

  await page.goto('/print');
  await page.emulateMedia({ media: 'print' });
  await page.screenshot({ path: `${dir}/print.png`, fullPage: true });
  await page.emulateMedia({ media: 'screen' });

  const dark = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await dark.goto(`${baseURL}/compare`);
  await dark.screenshot({ path: `${dir}/compare-dark.png` });
  await dark.close();

  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await phone.goto(`${baseURL}/`);
  await phone.screenshot({ path: `${dir}/mobile.png` });
  await phone.close();
});
