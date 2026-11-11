import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/learn', name: 'learning paths' },
  { path: '/learn/formulas', name: 'formulas' },
  { path: '/explore/graph', name: 'graph' },
  { path: '/explore/geometry', name: 'geometry' },
  { path: '/explore/3d', name: '3D shapes' },
  { path: '/practice', name: 'coding practice' },
];

for (const route of ROUTES) {
  test(`${route.name} (${route.path}) renders without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(route.path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('an unknown address goes to the home page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page).toHaveURL(/\/$/);
});

test('a page survives a refresh', async ({ page }) => {
  await page.goto('/learn/formulas');
  await page.reload();
  await expect(page).toHaveURL(/\/learn\/formulas$/);
  await expect(page.locator('h1').first()).toContainText('Key formulas');
});

test('the back button steps back through pages', async ({ page }) => {
  await page.goto('/');
  await page.locator('nav[aria-label="Main"]').getByRole('button', { name: 'Practice' }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test('the graph starts empty, with no example expression', async ({ page }) => {
  await page.goto('/explore/graph');
  await expect(page.getByText('Type an equation', { exact: true })).toBeVisible();
  await expect(page.getByText('f(x) = x', { exact: false })).toHaveCount(0);
});

test('plotting a formula puts it in the address', async ({ page }) => {
  await page.goto('/learn/formulas');
  await page.getByRole('button', { name: 'Plot in the grapher' }).first().click();
  await expect(page).toHaveURL(/\/explore\/graph\?expr=/);
});

test('quick keyboard presses on a slider are not lost', async ({ page }) => {
  // A quadratic opened straight from its address, so the coefficient sliders appear.
  await page.goto('/explore/graph?expr=' + encodeURIComponent('f(x) = x^2 - 4'));
  const slider = page.getByLabel('c (constant) coefficient');
  await slider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('-3');
});
