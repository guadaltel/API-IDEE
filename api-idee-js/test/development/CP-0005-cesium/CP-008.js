import { map as Mmap } from 'IDEE/api-idee';
import WFS from 'IDEE/layer/WFS';
import Cluster from 'IDEE/style/Cluster';
import Generic from 'IDEE/style/Generic';
import GeoJSON from 'IDEE/layer/GeoJSON';

const mapa = Mmap({
  container: 'map',
  center: [-4.955234548683441, 37.91842330548027],
  zoom: 9,
});
window.mapa = mapa;

const campamentos = new WFS({
  url: 'https://hcsigc.juntadeandalucia.es/geoserver/wfs',
  namespace: 'IECA',
  name: 'sigc_campamentos_1724753464727',
  geometry: 'POINT',
  version: '1.0.0',
});

// const campamentos = new WFS({
//   name: 'reservas_biosfera',
//   namespace: 'reservas_biosfera',
//   legend: 'Reservas biosferas',
//   geometry: 'POLYGON',
//   url: 'https://www.juntadeandalucia.es/medioambiente/mapwms/REDIAM_WFS_Patrimonio_Natural?',
//   version: '1.1.0',
// }, {
//   getFeatureOutputFormat: 'geojson',
//   describeFeatureTypeOutputFormat: 'geojson',
// });

mapa.addLayers(campamentos);

// Example #1: Se aplica un cluster por defecto
// campamentos.setStyle(new Cluster());

// Example #2: Se aplica un clúster personalizado
const estilo = new Generic({
  point: {
    fill: {
      color: 'red',
    },
  },
});

const clusterOptions = {
  ranges: [{
    min: 2,
    max: 4,
    style: new Generic({
      point: {
        stroke: {
          color: '#5789aa',
        },
        fill: {
          color: '#99ccff',
        },
        radius: 20,
      },
    }),
  }, {
    min: 5,
    max: 9,
    style: new Generic({
      point: {
        stroke: {
          color: '#5789aa',
        },
        fill: {
          color: '#3399ff',
        },
        radius: 30,
      },
    }),
  },
  ],
  // animated: true, // En Cesium siempre está activado
  hoverInteraction: true,
  // hoverInteraction: false,
  // displayAmount: false,
  displayAmount: true,
  selectInteraction: true,
  // selectInteraction: false,
  distance: 80,
  maxFeaturesToSelect: 6,
  label: {
    font: 'bold 15px Comic Sans MS',
    color: '#FFFFFF',
  },
};

const optionsVendor = {
  // distanceSelectFeatures: 5000,
  convexHullStyle: {
    fill: {
      color: '#000000',
      opacity: 0.5,
    },
    stroke: {
      color: '#000000',
      width: 1,
    },
  },
};

// const styleCluster = new Cluster(clusterOptions);
const styleCluster = new Cluster(clusterOptions, optionsVendor);
campamentos.setStyle(estilo);
campamentos.setStyle(styleCluster);
