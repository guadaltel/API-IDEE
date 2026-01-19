import { map as Mmap } from 'IDEE/api-idee';
import Feature from 'IDEE/feature/Feature';
import Vector from 'IDEE/layer/Vector';
import Generic from 'IDEE/style/Generic';
import { CLAMP_TO_GROUND, CLAMP_TO_TERRAIN, NONE } from 'IDEE/style/HeightReference';

const mapa = Mmap({
  container: 'map',
  center: [-3.913643280093657, 37.730089374170156],
  zoom: 8,
});
window.mapa = mapa;

const capa = new Vector({
  name: 'Capa vectorial',
});

// Example #1: Etiquetas en puntos 2D
const point = new Feature('point_2d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'Point',
    'coordinates': [
      -3.7038,
      40.4168,
    ],
  },
});
window.point = point;

// Example #2: Etiquetas en puntos 3D
const point_3d = new Feature('point_3d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'Point',
    'coordinates': [
      -3.7038,
      40.4168,
      667,
    ],
  },
});
window.point_3d = point_3d;

// Example #3: Etiquetas en polígonos 2D
const polygon = new Feature('polygon_2d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'Polygon',
    'coordinates': [
      [
        [-3.7156228440037515, 38.53704121621672],
        [-1.2900078769890575, 38.544780365403625],
        [-2.3691589242827553, 38.26563992005367],
        [-3.171097541564646, 37.586610085487976],
        [-4.933381112424118, 38.2423293549536],
        [-3.161196642485784, 39.13052967351828],
        [-3.7156228440037515, 38.53704121621672],
      ],
    ],
  },
});
window.polygon = polygon;

// Example #4: Etiquetas en polígonos 3D
const polygon_3d = new Feature('polygon_3d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'Polygon',
    'coordinates': [
      [
        [-3.897084726562509, 37.843534777598265, 394.376],
        [-3.4686179296875093, 38.11199327312772, 345.8],
        [-3.4026999609375093, 38.00819035261267, 740.267],
        [-3.8915915625000093, 37.84787254170713, 467.741],
        [-3.897084726562509, 37.843534777598265, 394.376],
      ],
    ],
  },
});
window.polygon_3d = polygon_3d;

// Example #5: Etiquetas en líneas 2D
const line = new Feature('line_2d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'LineString',
    'coordinates': [
      [-5.973815917968764, 37.38761749978394],
      [-4.784545898437513, 37.907366581454966],
    ],
  },
});
window.line = line;

// Example #6: Etiquetas en líneas 3D
const line_3d = new Feature('line_3d', {
  'type': 'Feature',
  'properties': {},
  'geometry': {
    'type': 'LineString',
    'coordinates': [
      [-3.7982077734375097, 38.10767109165957, 408.312],
      [-7.725820078125008, 38.12495828299171, 0],
    ],
  },
});
window.line_3d = line_3d;

const estilo = new Generic({
  point: {
    radius: 20,
    fill: {
      color: 'red',
    },
    label: {
      text: 'Punto',
      font: 'bold 16px Courier New',
      scale: 0.8,
      align: 'center',
      baseline: 'center',
      color: 'yellow',
      offset: [0, -20],
    },
    // heightReference: CLAMP_TO_TERRAIN, // Para coordenadas 2D
  },
  line: {
    fill: {
      color: 'green',
      width: 15,
    },
    stroke: {
      color: 'red',
      width: 20,
    },
    label: {
      text: 'Polígono',
      font: 'bold 16px Courier New',
      scale: 0.8,
    },
  },
  polygon: {
    fill: {
      color: 'blue',
      // opacity: 0.5,
    },
    label: {
      text: 'Polígono',
      font: 'bold 16px Courier New',
      scale: 0.8,
    },
    // extrudedHeight: 10000,
  },
});

capa.addFeatures([point]);
// capa.addFeatures([point_3d]);
// capa.addFeatures([polygon]);
// capa.addFeatures([polygon_3d]);
// capa.addFeatures([line]);
// capa.addFeatures([line_3d]);
capa.setStyle(estilo);
mapa.addLayers(capa);