/* eslint-disable camelcase */
import GeoJSON from 'M/layer/GeoJSON';
import Generic from 'M/style/Generic';// eslint-disable-line no-unused-vars
import { bbox as bboxStrategy } from 'ol/loadingstrategy';// eslint-disable-line no-unused-vars
import VectorSource from 'ol/source/Vector';// eslint-disable-line no-unused-vars

export const geojson_001 = new GeoJSON({
  name: 'Municipios',
  url: 'http://geostematicos-sigc.juntadeandalucia.es/geoserver/tematicos/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=tematicos:Municipios&maxFeatures=50&outputFormat=application/json',
  // source: new VectorSource({
  //   format: new GeoJSON(),
  //   url: 'https://geostematicos-sigc.juntadeandalucia.es/geoserver/tematicos/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=tematicos:Provincias&maxFeatures=50&outputFormat=application%2Fjson',
  //   strategy: bboxStrategy,
  // }),
  extract: true,
  // extract: false,
  // crs: 'EPSG:3857',
  infoEventType: 'hover',
  // infoEventType: 'click',
  // isBase: false,
  // isBase: true,
  // transparent: false,
  // transparent: true,
  // maxExtent: [-1259872.4694101033, 4359275.566199489, -85799.71494979598, 4620384.454821652],
  // attribution: {
  //   name: 'Name Prueba GeoJSON',
  //   description: 'Description Prueba',
  //   url: 'https://www.ign.es',
  //   contentAttributions: 'https://componentes.cnig.es/api-core/files/attributions/WMTS_PNOA_20170220/atribucionPNOA_Url.kml',
  //   contentType: 'kml',
  // },
  // minZoom: 1,
  // maxZoom: 5,
}, {
  // minZoom: 5,
  // maxZoom: 10,
  // predefinedStyles: [],
  // style: new Generic({
  //   point: {
  //     radius: 10,
  //     fill: {
  //       color: 'blue'
  //     }
  //   },
  //   polygon: {
  //     fill: {
  //       color: 'red'
  //     }
  //   },
  //   line: {
  //     stroke: {
  //       color: 'black'
  //     }
  //   }
  // }),
  // hide: ['provincia', 'municipio'],
  // show: ['municipio'],
  // visibility: false,
  // visibility: true,
  // displayInLayerSwitcher: false,
  // displayInLayerSwitcher: true,
  // opacity: 0,
  // opacity: 0.5,
  // opacity: 1,
}, {
  // source:{},
});

// ERROR: infoEventType en hover no cierra el popup al salir
// ERROR: No funciona opacity al 0

export const geojson_002 = new GeoJSON({
  name: 'jsonejemplo',
  url: 'http://www.ign.es/resources/geodesia/GNSS/SPTR_geo.json',
  extract: false,
});

const source_003 = {
  'crs': {
    'properties': {
      'name': 'urn:ogc:def:crs:OGC:1.3:CRS84',
    },
    'type': 'name',
  },
  'features': [
    {
      'geometry': {
        'coordinates': [
          [
            -5.973815917968764,
            37.38761749978394,
          ],
          [
            -4.784545898437513,
            37.907366581454966,
          ],
        ],
        'type': 'LineString',
      },
      'id': 'mapea_feature_9958312891707717',
      'properties': {
        'final': '100',
        'inicio': '10',
      },
      'type': 'Feature',
    },
    {
      'geometry': {
        'coordinates': [
          [
            -5.984802246093764,
            37.37015718405753,
          ],
          [
            -4.471435546875014,
            36.721273880045004,
          ],
        ],
        'type': 'LineString',
      },
      'id': 'mapea_feature_9655197141670062',
      'properties': {
        'final': '150',
        'inicio': '15',
      },
      'type': 'Feature',
    },
    {
      'geometry': {
        'coordinates': [
          [
            -6.0024084328844065,
            37.38146225526987,
          ],
          [
            -6.2660803078844065,
            36.50782495921966,
          ],
        ],
        'type': 'LineString',
      },
      'id': 'mapea_feature_6519584169947557',
      'properties': {
        'final': '100',
        'inicio': '15',
      },
      'type': 'Feature',
    },
  ],
  'type': 'FeatureCollection',
};

export const geojson_003 = new GeoJSON({
  source: source_003,
  extract: false,
});

export const geojson_004 = new GeoJSON({
  name: 'capas',
  source: {
    'type': 'FeatureCollection',
    'name': 'sql_statement',
    'crs': { 'type': 'name', 'properties': { 'name': 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    'features': [
    ],
  },
});

export const geojson_005 = new GeoJSON({
  url: 'https://visores-cnig-gestion-publico.desarrollo.guadaltel.es/fototeca/static/media/mtn50.eb820be5.geojson',
  extract: false,
});