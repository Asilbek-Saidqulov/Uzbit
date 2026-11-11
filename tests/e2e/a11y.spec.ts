import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const AXE = readFileSync(join(here, '../../node_modules/axe-core/axe.min.js'), 'utf8');

const ROUTES = ['/', '/learn', '/learn/formulas', '/explore/graph', '/explore/geometry', '/practice'];

for (const path of ROUTES) {
  test(`${path} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.addScriptTag({ content: AXE });
    const violations = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).axe.run(document, { resultTypes: ['violations'] });
      return result.violations
        .filter((v: { impact: string }) => v.impact === 'serious' || v.impact === 'critical')
        .map((v: { id: string; impact: string; nodes: unknown[] }) => ({ id: v.id, impact: v.impact, count: v.nodes.length }));
    });
    expect(violations).toEqual([]);
  });
}
