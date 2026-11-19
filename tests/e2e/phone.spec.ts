import { test, expect } from '@playwright/test';

test('the graph toolbar stays inside a phone screen', async ({ page }) => {
  await page.goto('/explore/graph');
  const right = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => /Export/.test(b.textContent ?? ''))
      .map((b) => Math.round(b.getBoundingClientRect().right))
  );
  expect(right.length).toBeGreaterThan(0);
  for (const r of right) expect(r).toBeLessThanOrEqual(390);
});

test('the phone navigation is reachable and named', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Dashboard', 'Learn', 'Explore', 'Practice']) {
    await expect(page.locator('nav[aria-label="Main"]').getByRole('button', { name })).toBeVisible();
  }
});

test('the dashboard does not scroll sideways on a phone', async ({ page }) => {
  await page.goto('/dashboard');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a lesson does not scroll sideways on a phone', async ({ page }) => {
  await page.goto('/learn/probability/bayes');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
