import { map as Mmap } from 'IDEE/api-idee';
import GeoTIFF from 'IDEE/layer/GeoTIFF';
import Layer from 'IDEE/layer/Layer';
import Raster from 'IDEE/style/Raster';
window.Raster = Raster;

const RAMP_PRESETS = {
  2: ['#000080', '#ff0000'],
  3: ['#000080', '#00ff80', '#ff0000'],
  5: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000'],
};

const DEFAULT_RAMP = RAMP_PRESETS[5];

const DEFAULT_FORM = {
  styleMode: 'ramp',
  bandsInput: '1, 2, 3',
  min: 0,
  max: 1,
  ramp: DEFAULT_RAMP,
  colorSimple: '#3388ff',
  interpolation: 'linear',
  interpolationBase: 2,
  gamma: 1,
  saturation: 0,
  exposure: 0,
  contrast: 0,
  brightness: 0,
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
  // convertToRGB: false,
  normalize: true,
});

let rasterStyle = null;

// Función para obtener el elemento del DOM por su id
const $ = (id) => document.getElementById(id);

const getStyleMode = () => $('style-mode').value;

const isRampMode = () => getStyleMode() === 'ramp';

const isColorMode = () => getStyleMode() === 'color';

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

const readColorFromForm = () => {
  return $('color-simple').value;
};

const formatColorForStatus = (color) => {
  if (Array.isArray(color)) {
    return JSON.stringify(color);
  }
  return String(color);
};

// Lee los valores del formulario y los convierte a números
const readForm = () => {
  const options = {
    gamma: parseFloat($('gamma').value),
    saturation: parseFloat($('saturation').value),
    exposure: parseFloat($('exposure').value),
    contrast: parseFloat($('contrast').value),
    brightness: parseFloat($('brightness').value),
  };

  if (isRampMode()) {
    options.bands = parseBandsInput($('bands-input').value);
    options.min = parseFloat($('min').value);
    options.max = parseFloat($('max').value);
    options.ramp = getRampFromForm();
    options.interpolation = $('interpolation').value;
    options.interpolationBase = parseFloat($('interpolationBase').value);
  }

  if (isColorMode()) {
    options.color = readColorFromForm();
  }

  const nodata = readNodataFromForm();
  if (nodata !== undefined) {
    options.nodata = nodata;
    if (!isRampMode()) {
      options.bands = parseBandsInput($('bands-input').value);
    }
  }

  return options;
};

// Establece los valores del formulario
const setFormValues = (values) => {
  $('style-mode').value = values.styleMode;
  $('bands-input').value = values.bandsInput;
  $('min').value = values.min;
  $('max').value = values.max;
  $('color-simple').value = values.colorSimple;
  $('interpolation').value = values.interpolation;
  $('interpolationBase').value = values.interpolationBase;
  $('gamma').value = values.gamma;
  $('saturation').value = values.saturation;
  $('saturation-value').textContent = String(values.saturation);
  $('exposure').value = values.exposure;
  $('exposure-value').textContent = String(values.exposure);
  $('contrast').value = values.contrast;
  $('contrast-value').textContent = String(values.contrast);
  $('brightness').value = values.brightness;
  $('brightness-value').textContent = String(values.brightness);
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
  const styleMode = getStyleMode();
  const useRamp = isRampMode();
  const useColor = isColorMode();
  const isExponential = $('interpolation').value === 'exponential';
  $('ramp-options').classList.toggle('hidden', !useRamp);
  $('color-options').classList.toggle('hidden', !useColor);
  $('interpolationBase').disabled = !isExponential;
  $('interpolation-base-row').classList.toggle('disabled', !isExponential);

  if (useRamp) {
    const bandsLabel = formatBands(parseBandsInput($('bands-input').value));
    $('legend-title').textContent = `Rampa bands ${bandsLabel} (${$('min').value}–${$('max').value})`;
    return;
  }

  if (useColor) {
    $('legend-title').textContent = `Color personalizado (${$('color-simple').value})`;
    return;
  }

  $('legend-title').textContent = 'Solo filtros WebGL';
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

  try {
    layerGeoTIFF.setStyle(options);
    rasterStyle = layerGeoTIFF.getStyle();
    window.rasterStyle = rasterStyle;
  } catch (err) {
    console.error(err);
    setStatus('Error al aplicar el estilo. Revisa rampa, color, nodata o filtros.');
    return;
  }

  updateLegendImage();
  updateFormVisibility();

  if (!rasterStyle) {
    setStatus('Sin estilo activo. Color nativo de la capa restaurado.');
    return;
  }

  let status = 'Aplicado: ';
  if (isRampMode()) {
    status += `bands ${formatBands(options.bands)}, rango ${options.min}–${options.max}`;
    status += `, ${options.ramp.length} colores`;
    status += `, ${options.interpolation}`;
    if (options.interpolation === 'exponential') {
      status += ` (base ${$('interpolationBase').value})`;
    }
  } else if (isColorMode()) {
    status += `color ${formatColorForStatus(options.color)}`;
  } else {
    status += 'solo filtros WebGL';
  }
  if (options.nodata !== undefined) {
    status += `, nodata ${options.nodata}`;
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

$('style-mode').addEventListener('change', () => {
  updateFormVisibility();
  applyRasterStyle();
});

$('interpolation').addEventListener('change', () => {
  updateFormVisibility();
  applyRasterStyle();
});

$('bands-input').addEventListener('change', applyRasterStyle);
$('interpolationBase').addEventListener('change', applyRasterStyle);
$('nodata').addEventListener('change', applyRasterStyle);
$('color-simple').addEventListener('input', applyRasterStyle);

const updateSaturationLabel = () => {
  $('saturation-value').textContent = $('saturation').value;
};

$('saturation').addEventListener('input', () => {
  updateSaturationLabel();
  applyRasterStyle();
});

const updateExposureLabel = () => {
  $('exposure-value').textContent = $('exposure').value;
};

$('exposure').addEventListener('input', () => {
  updateExposureLabel();
  applyRasterStyle();
});

const updateContrastLabel = () => {
  $('contrast-value').textContent = $('contrast').value;
};

$('contrast').addEventListener('input', () => {
  updateContrastLabel();
  applyRasterStyle();
});

const updateBrightnessLabel = () => {
  $('brightness-value').textContent = $('brightness').value;
};

$('brightness').addEventListener('input', () => {
  updateBrightnessLabel();
  applyRasterStyle();
});

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
applyRasterStyle();
