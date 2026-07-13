import { map as Mmap } from 'IDEE/api-idee';
import GeoTIFF from 'IDEE/layer/GeoTIFF';
import Layer from 'IDEE/layer/Layer';
import Raster from 'IDEE/style/Raster';

const RAMP_PRESETS = {
  2: ['#000080', '#ff0000'],
  3: ['#000080', '#00ff80', '#ff0000'],
  5: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000'],
};

const DEFAULT_RAMP = RAMP_PRESETS[5];

const DEFAULT_FORM = {
  bandsInput: '1, 2, 3',
  min: 0,
  max: 1,
  ramp: DEFAULT_RAMP,
  interpolation: 'linear',
  interpolationBase: 2,
  gamma: 1,
  nodata: '',
};

const mapjs = Mmap({
  container: 'map',
  bbox: [3226511.5398818217, 1735204.4920150614, 4207995.393869615, 2056231.5025902353],
});

const layerGeoTIFF = new GeoTIFF({
  url: 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/TCI.tif',
  name: 'Sentinel TCI',
  legend: 'Sentinel-2 color verdadero',
}, {
  // bands: [1, 2, 3],
  // convertToRGB: false,
  normalize: true,
  // style: new Raster({
  //   bands: [1, 2, 3],
  //   min: 0,
  //   max: 1,
  //   ramp: DEFAULT_RAMP,
  //   interpolation: 'linear',
  //   interpolationBase: 2,
  //   gamma: 1,
  // }),
});

// layerGeoTIFF.setStyle(new Raster({
//   bands: [1, 2, 3],
//   min: 0,
//   max: 1,
//   ramp: DEFAULT_RAMP,
//   interpolation: 'linear',
//   interpolationBase: 2,
//   gamma: 1,
// }));

let rasterStyle = null;

// Función para obtener el elemento del DOM por su id
const $ = (id) => document.getElementById(id);

// Función para cambiar los inputs de colores según el número de colores seleccionados
const renderRampColors = (ramp) => {
  const container = $('ramp-colors');
  container.innerHTML = '';
  ramp.forEach((color, index) => {
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'ramp-color';
    input.dataset.index = String(index);
    input.value = color;
    input.addEventListener('input', applyRasterStyle);
    container.appendChild(input);
  });
  updateRampPresetButtons(ramp.length);
};

// Actualiza el botón activo de rampas de colores
const updateRampPresetButtons = (size) => {
  document.querySelectorAll('.ramp-preset-btn').forEach((button) => {
    const isActive = parseInt(button.dataset.rampSize, 10) === size;
    button.classList.toggle('active', isActive);
  });
};

// Establece la rampa de colores seleccionada
const setRampPreset = (size) => {
  const preset = RAMP_PRESETS[size];
  if (!preset) {
    return;
  }
  renderRampColors([...preset]);
  applyRasterStyle();
};

// Obtiene la rampa de colores seleccionada desde el formulario
const getRampFromForm = () => {
  return Array.from(document.querySelectorAll('.ramp-color')).map((input) => input.value);
};

// Analiza la entrada de bandas y devuelve un array de números
const parseBandsInput = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return 1;
  }

  const cleaned = trimmed.replace(/^\[|\]$/g, '');
  const parts = cleaned.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return 1;
  }

  const numbers = parts.map((part) => parseInt(part, 10));
  if (numbers.length === 1) {
    return numbers[0];
  }
  return numbers;
};

// Formatea el array de bandas para mostrarlo en el formulario
const formatBands = (bands) => {
  if (Array.isArray(bands)) {
    return `[${bands.join(', ')}]`;
  }
  return String(bands);
};

// Lee el valor del input de nodata y lo convierte a número
const readNodataFromForm = () => {
  const raw = $('nodata').value.trim();
  if (raw === '') {
    return undefined;
  }
  return parseFloat(raw);
};

// Lee los valores del formulario y los convierte a números
const readForm = () => {
  const options = {
    bands: parseBandsInput($('bands-input').value),
    min: parseFloat($('min').value),
    max: parseFloat($('max').value),
    ramp: getRampFromForm(),
    gamma: parseFloat($('gamma').value),
    interpolation: $('interpolation').value,
    interpolationBase: parseFloat($('interpolationBase').value),
  };

  const nodata = readNodataFromForm();
  if (nodata !== undefined) {
    options.nodata = nodata;
  }

  return options;
};

// Establece los valores del formulario
const setFormValues = (values) => {
  $('bands-input').value = values.bandsInput;
  $('min').value = values.min;
  $('max').value = values.max;
  $('interpolation').value = values.interpolation;
  $('interpolationBase').value = values.interpolationBase;
  $('gamma').value = values.gamma;
  let nodataValue = '';
  if (values.nodata !== '' && values.nodata !== undefined && values.nodata !== null) {
    nodataValue = values.nodata;
  }
  $('nodata').value = nodataValue;
  renderRampColors(values.ramp);
  updateFormVisibility();
};

// Actualiza la visibilidad de los elementos del formulario
const updateFormVisibility = () => {
  $('interpolation-base-row').classList.toggle('hidden', $('interpolation').value !== 'exponential');

  const bandsLabel = formatBands(parseBandsInput($('bands-input').value));
  $('legend-title').textContent = `Rampa bands ${bandsLabel} (${$('min').value}–${$('max').value})`;
};

const isValidLegendUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  if (url.indexOf(Layer.LEGEND_ERROR) !== -1) {
    return false;
  }
  if (url.indexOf(Layer.LEGEND_DEFAULT) !== -1) {
    return false;
  }
  return true;
};

const clearLegendImage = () => {
  const legend = $('legend');
  const legendImg = $('legend-img');
  if (legendImg) {
    legendImg.removeAttribute('src');
  }
  if (legend) {
    legend.classList.add('hidden');
  }
};

const showLegendImage = (url) => {
  const legend = $('legend');
  const legendImg = $('legend-img');
  if (!legendImg) {
    return;
  }
  legendImg.src = url;
  if (legend) {
    legend.classList.remove('hidden');
  }
};

// Actualiza la imagen de la leyenda
const updateLegendImage = () => {
  if (!layerGeoTIFF.getStyle()) {
    clearLegendImage();
    return;
  }
  const legendUrl = layerGeoTIFF.getLegendURL();
  if (legendUrl instanceof Promise) {
    legendUrl.then((url) => {
      if (isValidLegendUrl(url)) {
        showLegendImage(url);
      } else {
        clearLegendImage();
      }
    }).catch(() => {
      clearLegendImage();
    });
    return;
  }
  if (isValidLegendUrl(legendUrl)) {
    showLegendImage(legendUrl);
  } else {
    clearLegendImage();
  }
};

// Establece el mensaje de estado
const setStatus = (message) => {
  $('status').textContent = message;
};

// Aplica el estilo ráster
const applyRasterStyle = () => {
  const options = readForm();
  if (!rasterStyle) {
    rasterStyle = new Raster(options);
  } else {
    rasterStyle.setBands(options.bands);
    rasterStyle.setMin(options.min);
    rasterStyle.setMax(options.max);
    rasterStyle.setRamp(options.ramp);
    rasterStyle.setGamma(options.gamma);
    rasterStyle.setInterpolation(options.interpolation, options.interpolationBase);
    if (options.nodata !== undefined) {
      rasterStyle.setNodata(options.nodata);
    } else {
      delete rasterStyle.options_.nodata;
      rasterStyle.update_();
    }
  }
  window.rasterStyle = rasterStyle;
  layerGeoTIFF.setStyle(rasterStyle);
  updateLegendImage();
  updateFormVisibility();

  const interp = $('interpolation').value;
  let status = `Aplicado: bands ${formatBands(options.bands)}, rango ${options.min}–${options.max}`;
  status += `, ${options.ramp.length} colores`;
  if (options.nodata !== undefined) {
    status += `, nodata ${options.nodata}`;
  }
  status += `, ${interp}`;
  if (interp === 'exponential') {
    status += ` (base ${$('interpolationBase').value})`;
  }
  setStatus(status);
};

// Restablece el formulario
const resetForm = () => {
  setFormValues(DEFAULT_FORM);
  rasterStyle = null;
  layerGeoTIFF.clearStyle();
  $('legend-title').textContent = 'Rampa de colores';
  clearLegendImage();
  setStatus('Formulario restablecido. Estilo ráster eliminado de la capa.');
};

$('interpolation').addEventListener('change', () => {
  updateFormVisibility();
  applyRasterStyle();
});

$('bands-input').addEventListener('change', applyRasterStyle);
$('interpolationBase').addEventListener('change', applyRasterStyle);
$('nodata').addEventListener('change', applyRasterStyle);

document.querySelectorAll('.ramp-preset-btn').forEach((button) => {
  button.addEventListener('click', () => {
    setRampPreset(parseInt(button.dataset.rampSize, 10));
  });
});

['min', 'max', 'gamma'].forEach((id) => {
  $(id).addEventListener('change', () => {
    updateFormVisibility();
    applyRasterStyle();
  });
});

$('reset-btn').addEventListener('click', resetForm);

window.mapjs = mapjs;
window.layerGeoTIFF = layerGeoTIFF;
window.applyRasterStyle = applyRasterStyle;

setFormValues(DEFAULT_FORM);
mapjs.addGeoTIFF(layerGeoTIFF);