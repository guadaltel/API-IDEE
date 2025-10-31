import { test, expect } from '@playwright/test';

test.describe('IDEE.Utils', () => {
  let map;
  test('Comprobando funcionalidades de utils', async ({ page }) => {
    await page.goto('/test/playwright/ol/basic-ol.html');
    const res = await page.evaluate(() => {
      map = IDEE.map({ container: 'map' });
      window.map = map;

      const xyz = new IDEE.layer.XYZ({
        url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
        name: 'AtlasDeCresques',
        visibility: true,
        isBase: true,
      });

      map.addLayers([xyz]);

      const nombreBase1 = map.getBaseLayers()[0].name;

      map.removeLayers(map.getLayers()[0]);

      const nombreBase2 = map.getBaseLayers()[0].name;
      return [nombreBase1, nombreBase2, map.getBaseLayers()[0].isVisible()];
    });
    expect(res[0]).not.toBe(res[1]);
    expect(res[2]).toBe(true);
  });
});
