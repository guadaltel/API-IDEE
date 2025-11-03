import { map as Mmap } from 'IDEE/api-idee';
import WFS from 'IDEE/layer/WFS';
import Cluster from 'IDEE/style/Cluster';
import Generic from 'IDEE/style/Generic';
import { BAN } from 'IDEE/style/Form';

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
// campamentos.setStyle(new Cluster());

// Example #2: Se aplica un clúster personalizado
const clusterOpts = {
  ranges: [{
    min: 151,
    max: 181,
    style: new Generic({
      point: {
        stroke: {
          color: '#5789aa',
        },
        fill: {
          color: '#3399ff',
        },
        // icon: {
        //   // // src
        //   // src: 'https://dev.w3.org/SVG/tools/svgweb/samples/svg-files/mozilla.svg',
        //   // rotation: 0.5,
        //   // scale: 0.2,
        //   // opacity: 0.4,
        //   // anchor: [2, 2],
        //   // anchororigin: 'bottom-right',
        //   // anchorxunits: 'pixel',
        //   // anchoryunits: 'pixel',
        //   // offsetorigin: 'bottom-left',
        //   // offset: [20, 0],
        //   // size: [300, 300],
        //   // fill: {
        //   //   color: 'grey',
        //   //   opacity: 0.5,
        //   // },
        //   // stroke: {
        //   //   color: 'white',
        //   //   width: 2,
        //   // },
        //   // // form
        //   form: BAN,
        //   class: 'g-cartografia-pin',
        //   fontsize: 0.5,
        //   radius: 20,
        //   rotation: 0,
        //   color: '#006CFF' || 'blue',
        //   offset: [0, 0],
        //   fill: '#8A0829' || 'red',
        //   // opacity: 0.5,
        // },
        radius: 30,
      },
    }),
  }, {
    min: 0,
    max: 150,
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
  }],
  distance: 80,
  label: {
    font: 'bold 19px Comic Sans MS',
    color: '#FFFFFF',
  },
  hoverInteraction: true,
};
campamentos.setStyle(new Cluster(clusterOpts));
