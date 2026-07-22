import Catalogmanager from 'facade/catalogmanager';

// IDEE.language.setLang('es');
// IDEE.language.setLang('en');

const map = IDEE.map({
  container: 'mapjs',
  projection: 'EPSG:4326',
});
window.map = map;

const PREDEFINED_CATALOGS = [
  {
    title: 'GNEIS',
    url: 'http://localhost:8090',
    authUrl: 'https://gneis.desarrollo.guadaltel.es/o/custom-auth/token',
    collectionsUrl: 'https://gneis.desarrollo.guadaltel.es/o/custom-auth/collections',
    public: false,
    user: 'test@liferay.com',
    password: 'testt',
  }, {
    title: 'Astraea Earth',
    url: 'https://eod-catalog-svc-prod.astraea.earth',
    public: true,
  }, {
    title: 'AWS Element84',
    url: 'https://earth-search.aws.element84.com/v1',
    public: true,
  }, {
    title: 'Copernicus',
    url: 'https://stac.dataspace.copernicus.eu/v1',
    public: true,
  }
];

const mp = new Catalogmanager({
  position: 'TL', // TR, BR, TL, BL
  collapsed: true,
  collapsible: true,
  tooltip: 'Gestor de catálogos',
  isDraggable: true,
  predefinedCatalogs: PREDEFINED_CATALOGS,
});
window.mp = mp;

map.addPlugin(mp);

map.addPlugin(new IDEE.plugin.Layerswitcher({}));

IDEE.config.API_IDEE_URL = 'http://localhost:9090/api-idee/';
