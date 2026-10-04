import AxeBuilder from '@axe-core/playwright';
import { expect, type Download, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

export async function downloadedText(download: Download): Promise<string> {
  const path = await download.path();
  return readFile(path, 'utf8');
}

/** Moves focus off any input so the app-level undo shortcut is used. */
export async function blur(page: Page): Promise<void> {
  await page.locator('#main').focus();
}

export function field(page: Page, label: string | RegExp) {
  return page.getByLabel(label, { exact: typeof label === 'string' });
}

export async function setField(page: Page, label: string | RegExp, value: string): Promise<void> {
  const input = field(page, label);
  await input.fill(value);
}
