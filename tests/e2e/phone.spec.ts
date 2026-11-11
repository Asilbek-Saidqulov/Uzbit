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
  for (const name of ['Learn', 'Explore', 'Practice']) {
    await expect(page.locator('nav[aria-label="Main"]').getByRole('button', { name })).toBeVisible();
  }
});
