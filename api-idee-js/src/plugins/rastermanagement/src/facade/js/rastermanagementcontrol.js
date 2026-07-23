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
    return new Promise((success, fail) => {
      const html = IDEE.template.compileSync(template, {
        vars: {
          title: getValue('title'),
          colorRamps: getValue('colorRamps'),
          spectralIndices: getValue('spectralIndices'),
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
          defaults: FILTER_DEFAULTS,
        },
      });
      this.accessibilityTab(html);
      this.html = html;
      this.addTabEvents(html);
      this.addLayerSelectorEvents(html);
      this.addFilterEvents(html);
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
   * Aplica el estilo Raster con los filtros a la capa seleccionada
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
