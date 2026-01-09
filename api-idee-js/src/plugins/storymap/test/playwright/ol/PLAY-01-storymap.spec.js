import { test, expect } from '@playwright/test';

test('Test storymap', async ({ page }) => {
  await page.goto('/src/plugins/storymap/test/playwright/ol/storymap-ol.html');
  await page.evaluate(() => {
    window.mapjs = IDEE.map({
      container: 'mapjs',
    });
    window.mp = new IDEE.plugin.StoryMap({
      collapsed: false,
      collapsible: true,
      position: 'TR',
      tooltip: 'Tooltip Storymap',
      content: {
        es: StoryMapJSON2,
        en: StoryMapJSON1,
      },
      indexInContent: {
        title: 'Índice StoryMap',
        subtitle: 'Visualizador de Cervantes y el Madrid del siglo XVII',
        js: "console.log('Visualizador de Cervantes');",
      },
      delay: 2000,
    });
    window.mapjs.addPlugin(window.mp);
  });
  
  const nPlugins = await page.evaluate(() => window.mapjs.getPlugins().length);
  expect(nPlugins).toBe(1);
});
