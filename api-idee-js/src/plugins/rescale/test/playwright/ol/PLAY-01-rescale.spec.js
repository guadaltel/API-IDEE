import { test, expect } from '@playwright/test';

test('Test Rescale', async ({ page }) => {
  await page.goto('/src/plugins/rescale/test/playwright/ol/rescale-ol.html');
  await page.evaluate(() => {
    window.mapjs = IDEE.map({
      container: 'mapjs',
    });
    window.mp = new IDEE.plugin.Rescale({
      position: 'TL',
    });
    window.mapjs.addPlugin(window.mp);
  });
  
  const nPlugins = await page.evaluate(() => window.mapjs.getPlugins().length);
  expect(nPlugins).toBe(1);
});
