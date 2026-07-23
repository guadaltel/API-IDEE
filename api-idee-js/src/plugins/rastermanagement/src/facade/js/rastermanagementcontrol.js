/**
 * @module IDEE/control/RasterManagementControl
 */

import RasterManagementImplControl from 'impl/rastermanagementcontrol';
import template from 'templates/rastermanagement';
import { getValue } from './i18n/language';

/**
 * Valores por defecto de los filtros
 * @constant
 * @type {object}
 */
const FILTER_DEFAULTS = {
  saturation: 0,
  gamma: 1,
  brightness: 0,
  contrast: 0,
  exposure: 0,
};

/**
 * Identificadores de índices espectrales
 * @constant
 * @type {Array<string>}
 */
const SPECTRAL_INDICES = ['ndvi', 'ndwi', 'nbr'];

/**
 * Modos de rampa de color
 * @constant
 * @type {Array<string>}
 */
const COLOR_RAMP_MODES = ['monoband', 'mean'];

/**
 * Bandas por defecto para el modo media
 * @constant
 * @type {Array<number>}
 */
const MEAN_DEFAULT_BANDS = [1, 2, 3];

/**
 * Identificadores de bandas por índice
 * @constant
 * @type {object}
 */
const INDEX_BAND_IDS = {
  ndvi: ['nir', 'red'],
  ndwi: ['green', 'nir'],
  nbr: ['nir', 'swir'],
};

export default class RasterManagementControl extends IDEE.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {IDEE.Control}
   * @api stable
   */
  constructor(values) {
    // 1. checks if the implementation can create PluginControl
    if (IDEE.utils.isUndefined(RasterManagementImplControl)
      || (IDEE.utils.isObject(RasterManagementImplControl)
      && IDEE.utils.isNullOrEmpty(Object.keys(RasterManagementImplControl)))) {
      IDEE.exception(getValue('exception.impl'));
    }
    // 2. implementation of this control
    const impl = new RasterManagementImplControl();
    super(impl, 'RasterManagement');

    /**
     * Template
     * @public
     * @type { HTMLElement }
     */
    this.template = null;

    /**
     *@private
     *@type { Number }
     */
    this.order = values.order >= -1 ? values.order : null;

    /**
     * Capas GeoTIFF disponibles en el selector
     * @private
     * @type { Array<{value: string, text: string}> }
     */
    this.layers_ = [];

    /**
     * Capa GeoTIFF seleccionada
     * @private
     * @type { IDEE.layer.GeoTIFF|null }
     */
    this.selectedLayer = null;
  }

  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {IDEE.Map} map to add the control
   * @api stable
   */
  createView(map) {
    this.map = map;
    const ndviDefaults = IDEE.style.Raster.DEFAULT_NDVI;
    const ndwiDefaults = IDEE.style.Raster.DEFAULT_NDWI;
    const nbrDefaults = IDEE.style.Raster.DEFAULT_NBR;
    const rasterDefaults = IDEE.style.Raster.DEFAULT_OPTIONS;
    const interpolationBase = rasterDefaults.interpolationBase;
    return new Promise((success, fail) => {
      const html = IDEE.template.compileSync(template, {
        vars: {
          title: getValue('title'),
          colorRamps: getValue('colorRamps'),
          monoband: getValue('monoband'),
          bandsMean: getValue('bandsMean'),
          band: getValue('band'),
          bands: getValue('bands'),
          addBand: getValue('addBand'),
          removeBand: getValue('removeBand'),
          spectralIndices: getValue('spectralIndices'),
          ndvi: getValue('ndvi'),
          ndwi: getValue('ndwi'),
          nbr: getValue('nbr'),
          filters: getValue('filters'),
          saturation: getValue('saturation'),
          gamma: getValue('gamma'),
          brightness: getValue('brightness'),
          contrast: getValue('contrast'),
          exposure: getValue('exposure'),
          selectLayer: getValue('selectLayer'),
          selectLayerDefault: getValue('selectLayerDefault'),
          apply: getValue('apply'),
          clearStyle: getValue('clearStyle'),
          copyStyle: getValue('copyStyle'),
          bandNir: getValue('bandNir'),
          bandRed: getValue('bandRed'),
          bandGreen: getValue('bandGreen'),
          bandSwir: getValue('bandSwir'),
          min: getValue('min'),
          max: getValue('max'),
          ramp: getValue('ramp'),
          interpolation: getValue('interpolation'),
          interpolationLinear: getValue('interpolationLinear'),
          interpolationExponential: getValue('interpolationExponential'),
          interpolationBase: getValue('interpolationBase'),
          nodata: getValue('nodata'),
          nodataOptional: getValue('nodataOptional'),
          addColor: getValue('addColor'),
          removeColor: getValue('removeColor'),
          defaults: FILTER_DEFAULTS,
          rampDefaults: {
            band: rasterDefaults.bands,
            meanBands: MEAN_DEFAULT_BANDS,
            min: rasterDefaults.min,
            max: rasterDefaults.max,
            ramp: rasterDefaults.ramp,
            interpolationBase,
          },
          ndviDefaults: {
            nir: ndviDefaults.bands[0],
            red: ndviDefaults.bands[1],
            min: ndviDefaults.min,
            max: ndviDefaults.max,
            ramp: ndviDefaults.ramp,
            interpolationBase,
          },
          ndwiDefaults: {
            green: ndwiDefaults.bands[0],
            nir: ndwiDefaults.bands[1],
            min: ndwiDefaults.min,
            max: ndwiDefaults.max,
            ramp: ndwiDefaults.ramp,
            interpolationBase,
          },
          nbrDefaults: {
            nir: nbrDefaults.bands[0],
            swir: nbrDefaults.bands[1],
            min: nbrDefaults.min,
            max: nbrDefaults.max,
            ramp: nbrDefaults.ramp,
            interpolationBase,
          },
        },
      });
      this.accessibilityTab(html);
      this.html = html;
      this.addTabEvents(html);
      this.addIndexEvents(html);
      this.addRampModeEvents(html);
      this.addLayerSelectorEvents(html);
      this.addFilterEvents(html);
      this.addSpectralIndexEvents(html);
      this.addColorRampEvents(html);
      this.refreshLayers();

      success(html);
    });
  }

  /**
   * Añade los eventos de cambio de pestaña
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addTabEvents(html) {
    const tabsContainer = html.querySelector('#m-rastermanagement-tabs');
    tabsContainer.addEventListener('click', (evt) => this.toggleTabs(evt));
  }

  /**
   * Añade los eventos de selección de índices espectrales
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addIndexEvents(html) {
    const indicesContainer = html.querySelector('#m-rastermanagement-indices');
    indicesContainer.addEventListener('click', (evt) => this.toggleIndices(evt));
  }

  /**
   * Añade los eventos de selección de modos de rampa
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addRampModeEvents(html) {
    const rampsContainer = html.querySelector('#m-rastermanagement-ramps');
    rampsContainer.addEventListener('click', (evt) => this.toggleRampModes(evt));
  }

  /**
   * Añade los eventos de los formularios de índices espectrales
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addSpectralIndexEvents(html) {
    SPECTRAL_INDICES.forEach((index) => {
      const interpolationSelect = html.querySelector(`#m-rastermanagement-${index}-interpolation`);
      const addColorBtn = html.querySelector(`#m-rastermanagement-${index}-add-color`);
      const rampContainer = html.querySelector(`#m-rastermanagement-${index}-ramp`);
      interpolationSelect.addEventListener('change', () => this.toggleIndexInterpolationBase(index));
      addColorBtn.addEventListener('click', () => this.addIndexRampColor(index));
      rampContainer.addEventListener('click', (evt) => this.onIndexRampClick(evt, index));
      this.updateIndexRampRemoveButtons(index);
    });
  }

  /**
   * Añade los eventos de los formularios de rampas de color
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addColorRampEvents(html) {
    COLOR_RAMP_MODES.forEach((mode) => {
      const interpolationSelect = html.querySelector(`#m-rastermanagement-${mode}-interpolation`);
      const addColorBtn = html.querySelector(`#m-rastermanagement-${mode}-add-color`);
      const rampContainer = html.querySelector(`#m-rastermanagement-${mode}-ramp`);
      interpolationSelect.addEventListener('change', () => this.toggleIndexInterpolationBase(mode));
      addColorBtn.addEventListener('click', () => this.addIndexRampColor(mode));
      rampContainer.addEventListener('click', (evt) => this.onIndexRampClick(evt, mode));
      this.updateIndexRampRemoveButtons(mode);
    });

    const addBandBtn = html.querySelector('#m-rastermanagement-mean-add-band');
    const bandsContainer = html.querySelector('#m-rastermanagement-mean-bands');
    addBandBtn.addEventListener('click', () => this.addMeanBand());
    bandsContainer.addEventListener('click', (evt) => this.onMeanBandsClick(evt));
    this.updateMeanBandRemoveButtons();
  }

  /**
   * Obtiene los valores por defecto del índice indicado
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   * @returns {object}
   */
  getIndexDefaults(index) {
    if (index === 'ndwi') {
      return IDEE.style.Raster.DEFAULT_NDWI;
    }
    if (index === 'nbr') {
      return IDEE.style.Raster.DEFAULT_NBR;
    }
    return IDEE.style.Raster.DEFAULT_NDVI;
  }

  /**
   * Obtiene la fórmula del índice indicado
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   * @returns {string}
   */
  getIndexFormula(index) {
    if (index === 'ndwi') {
      return IDEE.style.Raster.FORMULA.NDWI;
    }
    if (index === 'nbr') {
      return IDEE.style.Raster.FORMULA.NBR;
    }
    return IDEE.style.Raster.FORMULA.NDVI;
  }

  /**
   * Gestiona los clics en la rampa de un índice (eliminar color)
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic
   * @param {string} index Identificador del índice
   */
  onIndexRampClick(evt, index) {
    const removeBtn = evt.target.closest('.m-rastermanagement-ramp-remove');
    if (!removeBtn) {
      return;
    }
    this.removeIndexRampColor(index, removeBtn);
  }

  /**
   * Añade un color a la rampa de un índice
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   */
  addIndexRampColor(index) {
    const rampContainer = this.html.querySelector(`#m-rastermanagement-${index}-ramp`);
    const colorInputs = rampContainer.querySelectorAll('.m-rastermanagement-ramp-color');
    let color = '#018571';
    if (colorInputs.length > 0) {
      color = colorInputs[colorInputs.length - 1].value;
    }
    rampContainer.appendChild(this.createIndexRampItem(color));
    this.updateIndexRampRemoveButtons(index);
    this.accessibilityTab(this.html);
  }

  /**
   * Elimina un color de la rampa de un índice
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   * @param {HTMLElement} removeBtn Botón de eliminar
   */
  removeIndexRampColor(index, removeBtn) {
    const rampContainer = this.html.querySelector(`#m-rastermanagement-${index}-ramp`);
    const items = rampContainer.querySelectorAll('.m-rastermanagement-ramp-item');
    if (items.length <= 2) {
      IDEE.toast.warning(getValue('exception.invalidRamp'), null, 6000);
      return;
    }
    const item = removeBtn.closest('.m-rastermanagement-ramp-item');
    if (item) {
      item.remove();
    }
    this.updateIndexRampRemoveButtons(index);
  }

  /**
   * Crea un elemento de color de rampa
   *
   * @private
   * @function
   * @param {string} color Color hexadecimal
   * @returns {HTMLElement}
   */
  createIndexRampItem(color) {
    const item = document.createElement('div');
    item.className = 'm-rastermanagement-ramp-item';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'm-rastermanagement-ramp-color';
    colorInput.value = color;
    colorInput.setAttribute('tabindex', '0');
    colorInput.setAttribute('aria-label', getValue('ramp'));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'm-rastermanagement-ramp-remove';
    removeBtn.title = getValue('removeColor');
    removeBtn.setAttribute('aria-label', getValue('removeColor'));
    removeBtn.setAttribute('tabindex', '0');
    removeBtn.textContent = '−';

    item.appendChild(colorInput);
    item.appendChild(removeBtn);
    return item;
  }

  /**
   * Actualiza el estado de los botones de eliminar color de la rampa
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   */
  updateIndexRampRemoveButtons(index) {
    const rampContainer = this.html.querySelector(`#m-rastermanagement-${index}-ramp`);
    const items = rampContainer.querySelectorAll('.m-rastermanagement-ramp-item');
    const canRemove = items.length > 2;
    items.forEach((item) => {
      const removeBtn = item.querySelector('.m-rastermanagement-ramp-remove');
      removeBtn.disabled = !canRemove;
    });
  }

  /**
   * Reconstruye la rampa de un índice con los colores indicados
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   * @param {Array<string>} colors Colores de la rampa
   */
  renderIndexRamp(index, colors) {
    const rampContainer = this.html.querySelector(`#m-rastermanagement-${index}-ramp`);
    rampContainer.innerHTML = '';
    colors.forEach((color) => {
      rampContainer.appendChild(this.createIndexRampItem(color));
    });
    this.updateIndexRampRemoveButtons(index);
    this.accessibilityTab(this.html);
  }

  /**
   * Muestra u oculta la base de interpolación de un índice
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   */
  toggleIndexInterpolationBase(index) {
    const interpolationSelect = this.html.querySelector(`#m-rastermanagement-${index}-interpolation`);
    const baseControl = this.html.querySelector(`.m-rastermanagement-${index}-base-control`);
    if (interpolationSelect.value === 'exponential') {
      baseControl.classList.remove('hidden');
    } else {
      baseControl.classList.add('hidden');
    }
  }

  /**
   * Indica si la pestaña de índices espectrales está activa
   *
   * @private
   * @function
   * @returns {boolean}
   */
  isSpectralIndicesTabActive() {
    const tab = this.html.querySelector('#m-rastermanagement-spectralindices-tab');
    return tab.classList.contains('active');
  }

  /**
   * Devuelve el índice espectral activo
   *
   * @private
   * @function
   * @returns {string|null}
   */
  getActiveSpectralIndex() {
    for (let i = 0; i < SPECTRAL_INDICES.length; i += 1) {
      const index = SPECTRAL_INDICES[i];
      const button = this.html.querySelector(`#m-rastermanagement-${index}-index`);
      if (button.classList.contains('active')) {
        return index;
      }
    }
    return null;
  }

  /**
   * Cambia el índice espectral activo
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en un índice
   */
  toggleIndices(evt) {
    evt.stopPropagation();
    let index = evt.target;
    if (!index.classList.contains('m-rastermanagement-index')) {
      index = index.closest('.m-rastermanagement-index');
    }
    if (!index) {
      return;
    }

    const indices = index.parentNode.children;
    for (let i = 0; i < indices.length; i += 1) {
      const child = indices.item(i);
      child.classList.remove('active');
      child.setAttribute('aria-selected', 'false');
    }
    index.classList.add('active');
    index.setAttribute('aria-selected', 'true');

    const indicesContent = this.html.querySelector('#m-rastermanagement-indices-contents').children;
    for (let i = 0; i < indicesContent.length; i += 1) {
      const child = indicesContent.item(i);
      if (child.id !== `${index.id}-content`) {
        child.classList.add('hidden');
      } else if (child.classList.contains('hidden')) {
        child.classList.remove('hidden');
      }
    }
  }

  /**
   * Cambia el modo de rampa de color activo
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en un modo
   */
  toggleRampModes(evt) {
    evt.stopPropagation();
    let mode = evt.target;
    if (!mode.classList.contains('m-rastermanagement-index')) {
      mode = mode.closest('.m-rastermanagement-index');
    }
    if (!mode) {
      return;
    }

    const modes = mode.parentNode.children;
    for (let i = 0; i < modes.length; i += 1) {
      const child = modes.item(i);
      child.classList.remove('active');
      child.setAttribute('aria-selected', 'false');
    }
    mode.classList.add('active');
    mode.setAttribute('aria-selected', 'true');

    const modesContent = this.html.querySelector('#m-rastermanagement-ramps-contents').children;
    for (let i = 0; i < modesContent.length; i += 1) {
      const child = modesContent.item(i);
      if (child.id !== `${mode.id}-content`) {
        child.classList.add('hidden');
      } else if (child.classList.contains('hidden')) {
        child.classList.remove('hidden');
      }
    }
  }

  /**
   * Indica si la pestaña de rampas de color está activa
   *
   * @private
   * @function
   * @returns {boolean}
   */
  isColorRampsTabActive() {
    const tab = this.html.querySelector('#m-rastermanagement-colorramps-tab');
    return tab.classList.contains('active');
  }

  /**
   * Devuelve el modo de rampa de color activo
   *
   * @private
   * @function
   * @returns {string|null}
   */
  getActiveColorRampMode() {
    for (let i = 0; i < COLOR_RAMP_MODES.length; i += 1) {
      const mode = COLOR_RAMP_MODES[i];
      const button = this.html.querySelector(`#m-rastermanagement-${mode}-mode`);
      if (button.classList.contains('active')) {
        return mode;
      }
    }
    return null;
  }

  /**
   * Gestiona los clics en la lista de bandas del modo media
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic
   */
  onMeanBandsClick(evt) {
    const removeBtn = evt.target.closest('.m-rastermanagement-band-remove');
    if (!removeBtn) {
      return;
    }
    this.removeMeanBand(removeBtn);
  }

  /**
   * Añade una banda al modo media
   *
   * @private
   * @function
   */
  addMeanBand() {
    const bandsContainer = this.html.querySelector('#m-rastermanagement-mean-bands');
    const bandInputs = bandsContainer.querySelectorAll('.m-rastermanagement-mean-band');
    let bandValue = 1;
    if (bandInputs.length > 0) {
      const lastValue = parseInt(bandInputs[bandInputs.length - 1].value, 10);
      if (!Number.isNaN(lastValue) && lastValue >= 1) {
        bandValue = lastValue + 1;
      }
    }
    bandsContainer.appendChild(this.createMeanBandItem(bandValue));
    this.updateMeanBandRemoveButtons();
    this.accessibilityTab(this.html);
  }

  /**
   * Elimina una banda del modo media
   *
   * @private
   * @function
   * @param {HTMLElement} removeBtn Botón de eliminar
   */
  removeMeanBand(removeBtn) {
    const bandsContainer = this.html.querySelector('#m-rastermanagement-mean-bands');
    const items = bandsContainer.querySelectorAll('.m-rastermanagement-band-item');
    if (items.length <= 2) {
      IDEE.toast.warning(getValue('exception.invalidMeanBands'), null, 6000);
      return;
    }
    const item = removeBtn.closest('.m-rastermanagement-band-item');
    if (item) {
      item.remove();
    }
    this.updateMeanBandRemoveButtons();
  }

  /**
   * Crea un elemento de banda para el modo media
   *
   * @private
   * @function
   * @param {number} bandValue Número de banda
   * @returns {HTMLElement}
   */
  createMeanBandItem(bandValue) {
    const item = document.createElement('div');
    item.className = 'm-rastermanagement-band-item';

    const bandInput = document.createElement('input');
    bandInput.type = 'number';
    bandInput.className = 'm-rastermanagement-mean-band';
    bandInput.name = 'mean-band';
    bandInput.min = '1';
    bandInput.step = '1';
    bandInput.value = bandValue;
    bandInput.setAttribute('tabindex', '0');
    bandInput.setAttribute('aria-label', getValue('band'));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'm-rastermanagement-band-remove';
    removeBtn.title = getValue('removeBand');
    removeBtn.setAttribute('aria-label', getValue('removeBand'));
    removeBtn.setAttribute('tabindex', '0');
    removeBtn.textContent = '−';

    item.appendChild(bandInput);
    item.appendChild(removeBtn);
    return item;
  }

  /**
   * Actualiza el estado de los botones de eliminar banda del modo media
   *
   * @private
   * @function
   */
  updateMeanBandRemoveButtons() {
    const bandsContainer = this.html.querySelector('#m-rastermanagement-mean-bands');
    const items = bandsContainer.querySelectorAll('.m-rastermanagement-band-item');
    const canRemove = items.length > 2;
    items.forEach((item) => {
      const removeBtn = item.querySelector('.m-rastermanagement-band-remove');
      removeBtn.disabled = !canRemove;
    });
  }

  /**
   * Reconstruye las bandas del modo media
   *
   * @private
   * @function
   * @param {Array<number>} bands Números de banda
   */
  renderMeanBands(bands) {
    const bandsContainer = this.html.querySelector('#m-rastermanagement-mean-bands');
    bandsContainer.innerHTML = '';
    bands.forEach((band) => {
      bandsContainer.appendChild(this.createMeanBandItem(band));
    });
    this.updateMeanBandRemoveButtons();
    this.accessibilityTab(this.html);
  }

  /**
   * Añade los eventos del selector de capas y de los botones de estilo
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addLayerSelectorEvents(html) {
    const selector = html.querySelector('#m-rastermanagement-selectionlayer');
    const applyBtn = html.querySelector('#m-rastermanagement-apply');
    const clearBtn = html.querySelector('#m-rastermanagement-clear');
    const copyBtn = html.querySelector('#m-rastermanagement-copy');
    selector.addEventListener('change', () => this.selectLayerEvent());
    applyBtn.addEventListener('click', () => this.applyStyle());
    clearBtn.addEventListener('click', () => this.clearStyle());
    copyBtn.addEventListener('click', () => this.copySerializedStyle());
    this.map.on(IDEE.evt.ADDED_LAYER, () => this.refreshLayers());
    this.map.on(IDEE.evt.REMOVED_LAYER, () => this.refreshLayers());
  }

  /**
   * Añade los eventos de actualización de valores de los filtros
   *
   * @private
   * @function
   * @param {HTMLElement} html Plantilla del control
   */
  addFilterEvents(html) {
    const filterIds = ['saturation', 'gamma', 'brightness', 'contrast', 'exposure'];
    filterIds.forEach((id) => {
      const input = html.querySelector(`#m-rastermanagement-${id}`);
      input.addEventListener('input', () => this.updateFilterValue(id));
    });

    const gammaInput = html.querySelector('#m-rastermanagement-gamma');
    gammaInput.addEventListener('input', () => this.clampGammaInput());
    gammaInput.addEventListener('change', () => this.validateGammaInput());
  }

  /**
   * Corrige valores negativos de gamma mientras se escribe
   *
   * @private
   * @function
   */
  clampGammaInput() {
    const gammaInput = this.html.querySelector('#m-rastermanagement-gamma');
    if (gammaInput.value === '') {
      return;
    }
    const value = parseFloat(gammaInput.value);
    if (!Number.isNaN(value) && value < 0) {
      gammaInput.value = 0;
    }
  }

  /**
   * Valida el input de gamma al confirmar el valor
   *
   * @private
   * @function
   */
  validateGammaInput() {
    const gammaInput = this.html.querySelector('#m-rastermanagement-gamma');
    const value = parseFloat(gammaInput.value);
    if (Number.isNaN(value) || gammaInput.value === '') {
      gammaInput.value = FILTER_DEFAULTS.gamma;
      return;
    }
    if (value < 0) {
      gammaInput.value = 0;
    }
  }

  /**
   * Actualiza el valor visible junto a la etiqueta del filtro
   *
   * @private
   * @function
   * @param {string} id Identificador del filtro
   */
  updateFilterValue(id) {
    const input = this.html.querySelector(`#m-rastermanagement-${id}`);
    const valueLabel = this.html.querySelector(`#m-rastermanagement-${id}-value`);
    if (!valueLabel) {
      return;
    }
    valueLabel.textContent = input.value;
  }

  /**
   * Actualiza todos los valores visibles de los filtros
   *
   * @private
   * @function
   */
  updateAllFilterValues() {
    const filterIds = ['saturation', 'gamma', 'brightness', 'contrast', 'exposure'];
    filterIds.forEach((id) => this.updateFilterValue(id));
  }

  /**
   * Obtiene las capas GeoTIFF del mapa
   *
   * @private
   * @function
   * @returns {Array<IDEE.layer.GeoTIFF>}
   */
  getGeoTIFFLayers() {
    return this.map.getGeoTIFF();
  }

  /**
   * Actualiza el listado de capas GeoTIFF del selector
   *
   * @public
   * @function
   * @api stable
   */
  refreshLayers() {
    const geotiffLayers = this.getGeoTIFFLayers();
    this.layers_ = geotiffLayers.map((layer) => {
      let text = layer.idLayer;
      if (layer.legend) {
        text = layer.legend;
      }
      return {
        value: layer.idLayer,
        text,
      };
    });

    const selector = this.html.querySelector('#m-rastermanagement-selectionlayer');
    const selectedLayerId = selector.value;
    let layerExists = false;
    for (let i = 0; i < this.layers_.length; i += 1) {
      if (this.layers_[i].value === selectedLayerId) {
        layerExists = true;
        break;
      }
    }

    const length = selector.children.length;
    for (let i = 0; i < length; i += 1) {
      selector.children[0].remove();
    }

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.selected = !layerExists;
    defaultOption.disabled = true;
    defaultOption.innerText = `${getValue('selectLayerDefault')}...`;
    selector.appendChild(defaultOption);

    this.layers_.forEach((layer) => {
      const option = document.createElement('option');
      option.value = layer.value;
      option.innerText = layer.text;
      option.selected = layer.value === selectedLayerId;
      selector.appendChild(option);
    });

    if (!layerExists) {
      this.selectedLayer = null;
    }
  }

  /**
   * Gestiona la selección de una capa GeoTIFF en el selector
   *
   * @public
   * @function
   * @api stable
   */
  selectLayerEvent() {
    const selector = this.html.querySelector('#m-rastermanagement-selectionlayer');
    const selectedLayerId = selector.value;
    const geotiffLayers = this.getGeoTIFFLayers();
    this.selectedLayer = null;
    for (let i = 0; i < geotiffLayers.length; i += 1) {
      if (geotiffLayers[i].idLayer === selectedLayerId) {
        this.selectedLayer = geotiffLayers[i];
        break;
      }
    }
  }

  /**
   * Obtiene los valores actuales de los filtros desde la UI
   *
   * @private
   * @function
   * @returns {object}
   */
  getFilterValues() {
    let gamma = parseFloat(this.html.querySelector('#m-rastermanagement-gamma').value);
    if (Number.isNaN(gamma) || gamma < 0) {
      gamma = FILTER_DEFAULTS.gamma;
    }

    return {
      saturation: parseFloat(this.html.querySelector('#m-rastermanagement-saturation').value),
      gamma,
      brightness: parseFloat(this.html.querySelector('#m-rastermanagement-brightness').value),
      contrast: parseFloat(this.html.querySelector('#m-rastermanagement-contrast').value),
      exposure: parseFloat(this.html.querySelector('#m-rastermanagement-exposure').value),
    };
  }

  /**
   * Obtiene las opciones de un índice espectral desde el formulario
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   * @returns {object|null}
   */
  getIndexOptions(index) {
    const defaults = this.getIndexDefaults(index);
    const bandIds = INDEX_BAND_IDS[index];
    const band1 = parseInt(this.html.querySelector(`#m-rastermanagement-${index}-${bandIds[0]}`).value, 10);
    const band2 = parseInt(this.html.querySelector(`#m-rastermanagement-${index}-${bandIds[1]}`).value, 10);

    if (Number.isNaN(band1) || Number.isNaN(band2) || band1 < 1 || band2 < 1) {
      IDEE.toast.warning(getValue('exception.invalidIndexBands'), null, 6000);
      return null;
    }

    let min = parseFloat(this.html.querySelector(`#m-rastermanagement-${index}-min`).value);
    let max = parseFloat(this.html.querySelector(`#m-rastermanagement-${index}-max`).value);
    if (Number.isNaN(min)) {
      min = defaults.min;
    }
    if (Number.isNaN(max)) {
      max = defaults.max;
    }

    const interpolation = this.html.querySelector(`#m-rastermanagement-${index}-interpolation`).value;
    const rampInputs = this.html.querySelectorAll(`#m-rastermanagement-${index}-ramp .m-rastermanagement-ramp-color`);
    const ramp = [];
    rampInputs.forEach((input) => {
      ramp.push(input.value);
    });

    if (ramp.length < 2) {
      IDEE.toast.warning(getValue('exception.invalidRamp'), null, 6000);
      return null;
    }

    const options = {
      formula: this.getIndexFormula(index),
      bands: [band1, band2],
      min,
      max,
      ramp,
      interpolation,
    };

    if (interpolation === 'exponential') {
      let interpolationBase = parseFloat(this.html.querySelector(`#m-rastermanagement-${index}-interpolation-base`).value);
      if (Number.isNaN(interpolationBase)) {
        interpolationBase = IDEE.style.Raster.DEFAULT_OPTIONS.interpolationBase;
      }
      options.interpolationBase = interpolationBase;
    }

    const nodataInput = this.html.querySelector(`#m-rastermanagement-${index}-nodata`).value;
    if (nodataInput !== '') {
      const nodata = parseFloat(nodataInput);
      if (!Number.isNaN(nodata)) {
        options.nodata = nodata;
      }
    }

    return options;
  }

  /**
   * Obtiene las opciones de rampa de color desde el formulario activo
   *
   * @private
   * @function
   * @param {string} mode Modo de rampa (monoband | mean)
   * @returns {object|null}
   */
  getColorRampOptions(mode) {
    const defaults = IDEE.style.Raster.DEFAULT_OPTIONS;
    let bands = null;

    if (mode === 'monoband') {
      const band = parseInt(this.html.querySelector('#m-rastermanagement-monoband-band').value, 10);
      if (Number.isNaN(band) || band < 1) {
        IDEE.toast.warning(getValue('exception.invalidRampBands'), null, 6000);
        return null;
      }
      bands = band;
    } else {
      const bandInputs = this.html.querySelectorAll('#m-rastermanagement-mean-bands .m-rastermanagement-mean-band');
      const meanBands = [];
      let hasInvalidBand = false;
      bandInputs.forEach((input) => {
        const band = parseInt(input.value, 10);
        if (Number.isNaN(band) || band < 1) {
          hasInvalidBand = true;
          return;
        }
        meanBands.push(band);
      });
      if (hasInvalidBand || meanBands.length < 2) {
        IDEE.toast.warning(getValue('exception.invalidMeanBands'), null, 6000);
        return null;
      }
      bands = meanBands;
    }

    let min = parseFloat(this.html.querySelector(`#m-rastermanagement-${mode}-min`).value);
    let max = parseFloat(this.html.querySelector(`#m-rastermanagement-${mode}-max`).value);
    if (Number.isNaN(min)) {
      min = defaults.min;
    }
    if (Number.isNaN(max)) {
      max = defaults.max;
    }

    const interpolation = this.html.querySelector(`#m-rastermanagement-${mode}-interpolation`).value;
    const rampInputs = this.html.querySelectorAll(`#m-rastermanagement-${mode}-ramp .m-rastermanagement-ramp-color`);
    const ramp = [];
    rampInputs.forEach((input) => {
      ramp.push(input.value);
    });

    if (ramp.length < 2) {
      IDEE.toast.warning(getValue('exception.invalidRamp'), null, 6000);
      return null;
    }

    const options = {
      bands,
      min,
      max,
      ramp,
      interpolation,
    };

    if (interpolation === 'exponential') {
      let interpolationBase = parseFloat(this.html.querySelector(`#m-rastermanagement-${mode}-interpolation-base`).value);
      if (Number.isNaN(interpolationBase)) {
        interpolationBase = defaults.interpolationBase;
      }
      options.interpolationBase = interpolationBase;
    }

    const nodataInput = this.html.querySelector(`#m-rastermanagement-${mode}-nodata`).value;
    if (nodataInput !== '') {
      const nodata = parseFloat(nodataInput);
      if (!Number.isNaN(nodata)) {
        options.nodata = nodata;
      }
    }

    return options;
  }

  /**
   * Restaura el formulario de un índice a los valores por defecto
   *
   * @private
   * @function
   * @param {string} index Identificador del índice
   */
  resetIndexForm(index) {
    const defaults = this.getIndexDefaults(index);
    const bandIds = INDEX_BAND_IDS[index];
    this.html.querySelector(`#m-rastermanagement-${index}-${bandIds[0]}`).value = defaults.bands[0];
    this.html.querySelector(`#m-rastermanagement-${index}-${bandIds[1]}`).value = defaults.bands[1];
    this.html.querySelector(`#m-rastermanagement-${index}-min`).value = defaults.min;
    this.html.querySelector(`#m-rastermanagement-${index}-max`).value = defaults.max;
    this.html.querySelector(`#m-rastermanagement-${index}-interpolation`).value = 'linear';
    this.html.querySelector(`#m-rastermanagement-${index}-interpolation-base`).value = IDEE.style.Raster.DEFAULT_OPTIONS.interpolationBase;
    this.html.querySelector(`#m-rastermanagement-${index}-nodata`).value = '';
    this.toggleIndexInterpolationBase(index);
    this.renderIndexRamp(index, defaults.ramp);
  }

  /**
   * Restaura todos los formularios de índices espectrales
   *
   * @private
   * @function
   */
  resetAllIndexForms() {
    SPECTRAL_INDICES.forEach((index) => this.resetIndexForm(index));
  }

  /**
   * Restaura el formulario de un modo de rampa a los valores por defecto
   *
   * @private
   * @function
   * @param {string} mode Modo de rampa
   */
  resetColorRampForm(mode) {
    const defaults = IDEE.style.Raster.DEFAULT_OPTIONS;
    if (mode === 'monoband') {
      this.html.querySelector('#m-rastermanagement-monoband-band').value = defaults.bands;
    } else {
      this.renderMeanBands(MEAN_DEFAULT_BANDS);
    }
    this.html.querySelector(`#m-rastermanagement-${mode}-min`).value = defaults.min;
    this.html.querySelector(`#m-rastermanagement-${mode}-max`).value = defaults.max;
    this.html.querySelector(`#m-rastermanagement-${mode}-interpolation`).value = 'linear';
    this.html.querySelector(`#m-rastermanagement-${mode}-interpolation-base`).value = defaults.interpolationBase;
    this.html.querySelector(`#m-rastermanagement-${mode}-nodata`).value = '';
    this.toggleIndexInterpolationBase(mode);
    this.renderIndexRamp(mode, defaults.ramp);
  }

  /**
   * Restaura todos los formularios de rampas de color
   *
   * @private
   * @function
   */
  resetAllColorRampForms() {
    COLOR_RAMP_MODES.forEach((mode) => this.resetColorRampForm(mode));
  }

  /**
   * Aplica el estilo Raster a la capa seleccionada
   *
   * @public
   * @function
   * @api stable
   */
  applyStyle() {
    if (!this.selectedLayer) {
      IDEE.toast.warning(getValue('exception.selectLayer'), null, 6000);
      return;
    }

    const filters = this.getFilterValues();
    const activeIndex = this.getActiveSpectralIndex();
    const activeRampMode = this.getActiveColorRampMode();

    if (this.isSpectralIndicesTabActive() && activeIndex) {
      const indexOptions = this.getIndexOptions(activeIndex);
      if (!indexOptions) {
        return;
      }
      this.selectedLayer.setStyle(new IDEE.style.Raster({
        ...indexOptions,
        ...filters,
      }));
      return;
    }

    if (this.isColorRampsTabActive() && activeRampMode) {
      const rampOptions = this.getColorRampOptions(activeRampMode);
      if (!rampOptions) {
        return;
      }
      this.selectedLayer.setStyle(new IDEE.style.Raster({
        ...rampOptions,
        ...filters,
      }));
      return;
    }

    const currentStyle = this.selectedLayer.getStyle();
    let options = { ...filters };

    if (currentStyle instanceof IDEE.style.Raster) {
      options = {
        ...currentStyle.getOptions(),
        ...filters,
      };
    }

    this.selectedLayer.setStyle(new IDEE.style.Raster(options));
  }

  /**
   * Elimina el estilo de la capa seleccionada
   *
   * @public
   * @function
   * @api stable
   */
  clearStyle() {
    if (!this.selectedLayer) {
      IDEE.toast.warning(getValue('exception.selectLayer'), null, 6000);
      return;
    }

    this.selectedLayer.clearStyle();
    this.html.querySelector('#m-rastermanagement-saturation').value = FILTER_DEFAULTS.saturation;
    this.html.querySelector('#m-rastermanagement-gamma').value = FILTER_DEFAULTS.gamma;
    this.html.querySelector('#m-rastermanagement-brightness').value = FILTER_DEFAULTS.brightness;
    this.html.querySelector('#m-rastermanagement-contrast').value = FILTER_DEFAULTS.contrast;
    this.html.querySelector('#m-rastermanagement-exposure').value = FILTER_DEFAULTS.exposure;
    this.updateAllFilterValues();
    this.resetAllIndexForms();
    this.resetAllColorRampForms();
  }

  /**
   * Copia el estilo serializado de la capa seleccionada al portapapeles
   *
   * @public
   * @function
   * @api stable
   */
  copySerializedStyle() {
    if (!this.selectedLayer) {
      IDEE.toast.warning(getValue('exception.selectLayer'), null, 6000);
      return;
    }

    const style = this.selectedLayer.getStyle();
    if (!(style instanceof IDEE.style.Raster)) {
      IDEE.toast.warning(getValue('exception.noStyle'), null, 6000);
      return;
    }

    const text = style.serialize();
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    IDEE.dialog.info(getValue('clipboard'), getValue('serializedStyle'));
  }

  /**
   * Cambia la pestaña activa
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en una pestaña
   */
  toggleTabs(evt) {
    evt.stopPropagation();
    const tab = evt.target;
    if (!tab.classList.contains('m-rastermanagement-tab')) {
      return;
    }

    const tabs = tab.parentNode.children;
    for (let i = 0; i < tabs.length; i += 1) {
      const child = tabs.item(i);
      child.classList.remove('active');
      child.setAttribute('aria-selected', 'false');
    }
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const tabsContent = this.html.querySelector('#m-rastermanagement-tabs-contents').children;
    for (let i = 0; i < tabsContent.length; i += 1) {
      const child = tabsContent.item(i);
      if (child.id !== `${tab.id}-content`) {
        child.classList.add('hidden');
      } else if (child.classList.contains('hidden')) {
        child.classList.remove('hidden');
      }
    }
  }

  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {IDEE.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof RasterManagementControl;
  }

  accessibilityTab(html) {
    html.querySelectorAll('[tabindex="0"]').forEach((el) => el.setAttribute('tabindex', this.order));
  }
}
