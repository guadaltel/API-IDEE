// eslint-disable-next-line import/no-extraneous-dependencies
import { test, expect } from '@playwright/test';

test('Test MaxExtZoom', async ({ page }) => {
  await page.goto('/src/plugins/maxextzoom/test/playwright/ol/maxextzoom-ol.html');
  await page.evaluate(() => {
    window.mapjs = IDEE.map({
      container: 'mapjs',
    });
    window.mp = new IDEE.plugin.MaxExtZoom({
      position: 'left',
      order: 1,
      tooltip: 'Zoom a la extensión del mapa',
    });
    window.mapjs.addPlugin(window.mp);
  });

  const nPlugins = await page.evaluate(() => window.mapjs.getPlugins().length);
  expect(nPlugins).toBe(1);
});
