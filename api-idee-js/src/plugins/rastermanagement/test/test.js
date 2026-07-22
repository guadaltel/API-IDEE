import RasterManagement from 'facade/rastermanagement';

IDEE.language.setLang('es');
//IDEE.language.setLang('en');

const map = IDEE.map({
  container: 'mapjs',
});
window.map = map;

const mp = new RasterManagement({
  position: 'TL', // TR, BR, TL, BL
  collapsed: false,
  collapsible: true,
  tooltip: 'Gestor de estilos ráster',
  // order: 1, //
});
window.mp = mp;

map.addPlugin(mp);

