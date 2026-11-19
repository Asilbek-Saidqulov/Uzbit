import { test, expect } from '@playwright/test';

// These specs run without a Supabase backend, so progress lives in the browser.

test('answering a lesson question wrong marks it in progress, right completes it', async ({ page }) => {
  await page.goto('/learn/algebra/quadratics');
  await page.getByRole('button', { name: /Crosses the x-axis twice/ }).click();
  await expect(page.getByText('Not quite')).toBeVisible();
  await page.getByRole('button', { name: /Never reaches the x-axis/ }).click();
  await expect(page.getByText('Lesson complete')).toBeVisible();
  await expect(page.getByRole('link', { name: /Next: Solving two equations at once/ })).toBeVisible();
});

test('a finished lesson shows on the dashboard and survives a reload', async ({ page }) => {
  await page.goto('/learn/algebra/quadratics');
  await page.getByRole('button', { name: /Never reaches the x-axis/ }).click();
  await page.goto('/dashboard');
  await expect(page.getByText('1/21')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1/21')).toBeVisible();
  await expect(page.getByRole('button', { name: /Quadratics and the discriminant, done/ })).toBeVisible();
});

test('a new learner is pointed at the first lesson', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your dashboard');
  await page.getByRole('link', { name: /Start lesson/ }).click();
  await expect(page).toHaveURL(/\/learn\/algebra\/quadratics$/);
});

test('opening a track goes to its first unfinished lesson', async ({ page }) => {
  await page.goto('/learn/algebra');
  await expect(page).toHaveURL(/\/learn\/algebra\/quadratics$/);
});

test('a lesson fills the graph with its equations, and the graph links back', async ({ page }) => {
  await page.goto('/learn/algebra/linear-systems');
  await page.getByRole('button', { name: /Plot two lines that never meet/ }).click();
  await expect(page).toHaveURL(/\/explore\/graph\?expr=.*&expr=/);
  const back = page.getByRole('link', { name: /Back to Solving two equations at once/ });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/learn\/algebra\/linear-systems$/);
});

test('the graph stays empty, with no back link, when opened directly', async ({ page }) => {
  await page.goto('/explore/graph');
  await expect(page.getByText('Type an equation', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Back to/ })).toHaveCount(0);
});

test('the activity grid is one tab stop and moves with the arrow keys', async ({ page }) => {
  await page.goto('/dashboard');
  const grid = page.getByRole('group', { name: /Your activity/ });
  const stops = grid.locator('button[tabindex="0"]');
  await expect(stops).toHaveCount(1);
  const before = await stops.first().getAttribute('aria-label');
  await stops.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(grid.locator('button[tabindex="0"]')).toHaveCount(1);
  expect(await grid.locator('button[tabindex="0"]').first().getAttribute('aria-label')).not.toBe(before);
});

test('selecting a day in the activity grid describes it', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('group', { name: /Your activity/ }).getByRole('button').nth(3).click();
  await expect(page.getByText(/: no activity/).first()).toBeVisible();
});

test('log in and sign up have their own pages', async ({ page }) => {
  for (const [path, heading] of [['/login', 'Log in'], ['/signup', 'Create your account']] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
});

test('a crafted next address cannot leave the site', async ({ page }) => {
  await page.goto('/login?next=' + encodeURIComponent('https://example.com'));
  await expect(page).toHaveURL(/\/login/);
});

test('a link to a problem opens it, and the hint stays hidden until asked for', async ({ page }) => {
  await page.goto('/practice?problem=ab-sum');
  await expect(page.getByText('A+B').first()).toBeVisible();
  await page.getByRole('button', { name: /^Hint/ }).click();
  await expect(page.getByRole('button', { name: /Show the hint/ })).toBeVisible();
});

test('the practice list recommends a first problem', async ({ page }) => {
  await page.goto('/practice');
  await expect(page.getByText('Recommended next')).toBeVisible();
});

test('the footer links go to real pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Formulas' }).click();
  await expect(page).toHaveURL(/\/learn\/formulas$/);
});

test('the background choice is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('button', { name: 'Still' }).click();
  await page.reload();
  await expect(page.getByRole('contentinfo').getByRole('button', { name: 'Still' })).toHaveAttribute('aria-pressed', 'true');
});

test('page text can be selected and copied', async ({ page }) => {
  await page.goto('/learn/algebra/quadratics');
  const userSelect = await page.locator('h1').evaluate((el) => getComputedStyle(el).userSelect);
  expect(userSelect).not.toBe('none');
});
