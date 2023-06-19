import Locator from 'facade/locator';

M.language.setLang('es');

const map = M.map({
  container: 'mapjs',
  zoom: 5,
  maxZoom: 20,
  minZoom: 4,
  center: [-467062.8225, 4783459.6216],
});

window.map = map;

const mp = new Locator({
  isDraggable: true,
  position: 'TL',
  collapsible: true,
  collapsed: false,
  order: 1,
  tooltip: 'Plugin Localizador',
  zoom: 5,
  pointStyle: 'pinRojo',
  byCoordinates: true,
  // byCoordinates: {
  //   projections: [
  //     { title: 'ETRS89 geographic (4258) dd', code: 'EPSG:4258', units: 'd' },
  //     { title: 'ETRS89 geographic (4258) dms', code: 'EPSG:4258', units: 'dms' },
  //   ],
  //   help: 'https://www.google.com/',
  // },
  byParcelCadastre: true,
  // byParcelCadastre: {
  //   cadastreWMS: 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR',
  //   CMC_url: 'http://ovc.catastro.meh.es/ovcservweb/ConsultaMunicipioCodigos',
  //   DNPPP_url: 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejeroCodigos.asmx/Consulta_DNPPP_Codigos',
  //   CPMRC_url: 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC',
  // },
  byPlaceAddressPostal: true,
  // byPlaceAddressPostal: {
  //   servicesToSearch: 'n',
  //   maxResults: 5,
  //   noProcess: 'poblacion',
  //   countryCode: 'es',
  //   reverse: false,
  //   resultVisibility: true,
  //   urlCandidates: 'http://www.cartociudad.es/geocoder/api/geocoder/candidatesJsonp',
  //   urlFind: 'http://www.cartociudad.es/geocoder/api/geocoder/findJsonp',
  //   urlReverse: 'http://www.cartociudad.es/geocoder/api/geocoder/reverseGeocode',
  //   urlPrefix: 'http://www.idee.es/',
  //   urlAssistant: 'https://www.idee.es/communicationsPoolServlet/SearchAssistant',
  //   urlDispatcher: 'https://www.idee.es/communicationsPoolServlet/Dispatcher',
  //   searchPosition: 'nomenclator,geocoder',
  //   // locationID: 'ES.IGN.NGBE.2805347',
  //   // geocoderCoords: [-5.741757, 41.512058],
  //   // requestStreet: 'https://www.cartociudad.es/geocoder/api/geocoder/findJsonp?q=Sevilla&type=provincia&tip_via=null&id=41&portal=null&extension=null',
  // },
});

map.addPlugin(mp);

window.map = map;
window.mp = mp;