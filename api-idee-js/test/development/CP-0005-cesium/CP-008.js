import { map as Mmap } from 'IDEE/api-idee';
import WFS from 'IDEE/layer/WFS';
import Cluster from 'IDEE/style/Cluster';
import Generic from 'IDEE/style/Generic';
import GeoJSON from 'IDEE/layer/GeoJSON';
import Choropleth from 'IDEE/style/Choropleth';
import { JENKS } from 'IDEE/style/Quantification';

const mapa = Mmap({
  container: 'map',
});
window.mapa = mapa;

const campamentos = new WFS({
  url: 'https://hcsigc.juntadeandalucia.es/geoserver/wfs',
  namespace: 'IECA',
  name: 'sigc_campamentos_1724753464727',
  geometry: 'POINT',
  version: '1.0.0',
});

mapa.addLayers(campamentos);

// Example #1: Se aplica un cluster por defecto
campamentos.setStyle(new Cluster());

// // Example #2: Se aplica un clúster personalizado
// const clusterOpts = {
//   ranges: [{
//     min: 151,
//     max: 171,
//     style: new Generic({
//       point: {
//         stroke: {
//           color: '#5789aa',
//         },
//         fill: {
//           color: '#3399ff',
//         },
//         icon: {
//           src: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/mozilla.svg',
//           rotation: 0.5,
//           scale: 0.2,
//           opacity: 0.8,
//           anchor: [2, 2],
//           anchororigin: 'bottom-right',
//           // Unidades de desplazamiento de anchor. fraction | pixel
//           anchorxunits: 'pixel',
//           anchoryunits: 'pixel',
//           // Offset permite recortar la imagen
//           // Punto de referencia para el corte. bottom-left/right|top-left/right
//           offsetorigin: 'bottom-left',
//           offset: [20, 0],
//           size: [300, 300],
//           // Relleno del SVG
//           fill: {
//             // Color de relleno. Hexadecimal, nominal
//             color: 'grey',
//             // Transparencia. 0(transparente)|1(opaco)
//             opacity: 0.5,
//           },
//           // Halo del SVG
//           stroke: {
//             // Hexadecimal, nominal
//             color: 'white',
//             // Tamaño
//             width: 2,
//           },
//         },
//         radius: 30,
//       },
//     }),
//   }, {
//     min: 0,
//     max: 150,
//     style: new Generic({
//       point: {
//         stroke: {
//           color: '#5789aa',
//         },
//         fill: {
//           color: '#99ccff',
//         },
//         radius: 20,
//       },
//     }),
//   }],
//   distance: 80,
//   label: {
//     font: 'bold 19px Comic Sans MS',
//     color: '#FFFFFF',
//   },
// };
// campamentos.setStyle(new Cluster(clusterOpts));
