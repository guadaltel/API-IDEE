import RasterManagement from 'facade/rastermanagement';

IDEE.language.setLang('es');
//IDEE.language.setLang('en');

const map = IDEE.map({
  container: 'mapjs',
  bbox: [3226511.5398818217, 1735204.4920150614, 4207995.393869615, 2056231.5025902353],
});
window.map = map;


map.addLayers(new IDEE.layer.GeoTIFF({
  url: 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif',
  name: 'Sentinel TCI',
  legend: 'Sentinel-2 color verdadero',
}, {
  // convertToRGB: false,
  normalize: true,
}));

const mp = new RasterManagement({
  position: 'TL', // TR, BR, TL, BL
  collapsed: false,
  collapsible: true,
  tooltip: 'Gestor de estilos ráster',
  // order: 1, //
});
window.mp = mp;

map.addPlugin(mp);