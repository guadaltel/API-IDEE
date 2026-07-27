import RasterManagement from 'facade/rastermanagement';

IDEE.language.setLang('es');
//IDEE.language.setLang('en');

const map = IDEE.map({
  container: 'mapjs',
  bbox: [3226511.5398818217, 1735204.4920150614, 4207995.393869615, 2056231.5025902353],
  // bbox: [-757523.4071233872, 4442339.45919535, -731974.5591508334, 4476483.050592874]
  // bbox: [2713214.478758277, 5389452.879113358, 2719331.5689785494, 5391744.30804452]
  // bbox: [-482568.7151175922, 4903327.95112306, -328387.66404849157, 4945968.648059358]
});
window.map = map;


map.addLayers(new IDEE.layer.GeoTIFF({
  url: 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif',
  name: 'Sentinel TCI',
  legend: 'Sentinel-2 color verdadero',
}, {
  normalize: true,
  nodata: 0,
  style: new IDEE.style.Raster({
    saturation: 1,
  }),
}));


// NDWI: 4 Y 2
// NDVI: 4 Y 1
// map.addLayers(new IDEE.layer.GeoTIFF({
//   url: './files/IMG_PH1A_PHR_MS___3_20180718T112527_20180718T112530_TOU_1234_e991_R1C1_COG.tif',
//   name: 'NDVI_Extremadura Severidad',
//   legend: 'NDVI_Extremadura Severidad',
// }, {
//   normalize: true,
//   convertToRGB: false,
//   style: new IDEE.style.Raster({
//     "bands": [
//     3,
//     1,
//     4
//     ],
//     "nodata": 0,
//     "gamma": 2,
//     "saturation": 0,
//     "exposure": 0,
//     "contrast": 0,
//     "brightness": 0
//     }),
//   nodata: 0,
// }));

// // NIR SWIR1: 4 Y 5
// map.addLayers(new IDEE.layer.GeoTIFF({
//   url: './files/AnnualCrop_RGB_NIR_SWIR1.tif',
//   name: 'Sentinel RGB+NIR+SWIR',
//   legend: 'Sentinel RGB+NIR+SWIR',
// }, {
//   normalize: true,
//   convertToRGB: false,
//   nodata: 0,
// }));


const mp = new RasterManagement({
  position: 'TL', // TR, BR, TL, BL
  collapsed: false,
  collapsible: true,
  tooltip: 'Gestor de estilos ráster',
  // order: 1, //
});
window.mp = mp;

map.addPlugin(mp);