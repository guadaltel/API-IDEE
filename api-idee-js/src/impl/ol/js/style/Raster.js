/**
 * @module IDEE/impl/style/Raster
 */
import chroma from 'chroma-js';
import {
  isNullOrEmpty, extendsObj, generateIntervals, isArray, isString,
} from 'IDEE/util/Utils';
import Style from './Style';

/**
 * @classdesc
 * Implementación OpenLayers del estilo ráster con rampa de colores.
 * @api
 */
class Raster extends Style {
  /**
   * Constructor principal de la clase.
   *
   * @constructor
   * @param {Object} options Opciones del estilo.
   * @param {Object} vendorOptions Opciones de la librería base.
   * @api stable
   */
  constructor(options, vendorOptions) {
    super(options);
    this.options_ = extendsObj(options, vendorOptions);
    this.oldStyle_ = null;
    this.appliedOnce_ = false;
    this.layerNormalize_ = false;
  }

  /**
   * Indica si las opciones incluyen rampa de colores.
   *
   * @function
   * @private
   * @returns {boolean} Verdadero si hay rampa.
   */
  hasRamp_() {
    const { ramp } = this.options_;
    return !isNullOrEmpty(ramp) && isArray(ramp) && ramp.length >= 2;
  }

  /**
   * Devuelve la banda usada para comparar nodata.
   *
   * @function
   * @private
   * @returns {number} Índice de banda.
   */
  getNodataBand_() {
    const { bands } = this.options_;
    if (!isArray(bands)) {
      return bands;
    }
    return bands[0];
  }

  /**
   * Este método devuelve la expresión de valor para la rampa.
   *
   * @function
   * @private
   * @returns {Array} Expresión WebGL.
   */
  getValueExpression_() {
    const { bands, formula } = this.options_;
    if (formula === 'ndvi') {
      const nirBand = bands[0];
      const redBand = bands[1];
      const nir = ['band', nirBand];
      const red = ['band', redBand];
      const sum = ['+', nir, red];
      const diff = ['-', nir, red];
      return [
        'case',
        ['==', sum, 0],
        0,
        ['/', diff, sum],
      ];
    }
    if (formula === 'ndwi') {
      const greenBand = bands[0];
      const nirBand = bands[1];
      const green = ['band', greenBand];
      const nir = ['band', nirBand];
      const sum = ['+', green, nir];
      const diff = ['-', green, nir];
      return [
        'case',
        ['==', sum, 0],
        0,
        ['/', diff, sum],
      ];
    }
    if (formula === 'nbr') {
      const nirBand = bands[0];
      const swirBand = bands[1];
      const nir = ['band', nirBand];
      const swir = ['band', swirBand];
      const sum = ['+', nir, swir];
      const diff = ['-', nir, swir];
      return [
        'case',
        ['==', sum, 0],
        0,
        ['/', diff, sum],
      ];
    }
    if (!isArray(bands)) {
      return ['band', bands];
    }
    if (bands.length === 1) {
      return ['band', bands[0]];
    }
    const bandExpressions = bands.map((bandIndex) => ['band', bandIndex]);
    return ['/', ['+', ...bandExpressions], bandExpressions.length];
  }

  /**
   * Expresión de color sin rampa (passthrough de bandas).
   *
   * @function
   * @private
   * @returns {Array} Expresión WebGL.
   */
  getPassthroughColorExpression_() {
    const { bands } = this.options_;
    if (!isArray(bands)) {
      return ['color', ['band', bands], ['band', bands], ['band', bands]];
    }
    if (bands.length >= 3) {
      return ['color', ['band', bands[0]], ['band', bands[1]], ['band', bands[2]]];
    }
    if (bands.length === 2) {
      return ['color', ['band', bands[0]], ['band', bands[1]], ['band', bands[1]]];
    }
    return ['color', ['band', bands[0]], ['band', bands[0]], ['band', bands[0]]];
  }

  /**
   * Resuelve el color literal definido en las opciones.
   *
   * @function
   * @private
   * @returns {Array<number>|string|undefined} Color para OpenLayers.
   */
  getCustomColor_() {
    const { color } = this.options_;
    if (isNullOrEmpty(color)) {
      return undefined;
    }
    if (isString(color) || isArray(color)) {
      return color;
    }
    return undefined;
  }

  /**
   * Envuelve un color con transparencia para nodata.
   *
   * @function
   * @private
   * @param {Array|string|Array<number>} colorValue Color literal.
   * @returns {Array|string|Array<number>} Color con nodata o el original.
   */
  wrapNodataCase_(colorValue) {
    const { nodata } = this.options_;
    if (!isNullOrEmpty(nodata) || nodata === 0) {
      return [
        'case',
        ['==', ['band', this.getNodataBand_()], nodata],
        [0, 0, 0, 0],
        colorValue,
      ];
    }
    return colorValue;
  }

  /**
   * Construye la expresión color (rampa, color personalizado o passthrough con nodata).
   *
   * @function
   * @private
   * @returns {Array|string|undefined} Expresión WebGL de color o literal.
   */
  buildColorExpression_() {
    const {
      min, max, ramp, nodata, interpolation,
    } = this.options_;

    if (this.hasRamp_()) {
      let rangeMin = min;
      let rangeMax = max;
      const isIndexFormula = this.options_.formula === 'ndvi'
        || this.options_.formula === 'ndwi'
        || this.options_.formula === 'nbr';
      if (this.layerNormalize_ && !isIndexFormula) {
        rangeMin = 0;
        rangeMax = 1;
      }

      const stops = generateIntervals([rangeMin, rangeMax], ramp.length);
      let interpolateMode = ['linear'];
      if (interpolation === 'exponential') {
        let exponentialBase = this.options_.interpolationBase;
        if (isNullOrEmpty(exponentialBase) || exponentialBase <= 0) {
          exponentialBase = 2;
        }
        interpolateMode = ['exponential', exponentialBase];
      }
      const valueExpression = this.getValueExpression_();
      const colorExpression = ['interpolate', interpolateMode, valueExpression];

      ramp.forEach((color, index) => {
        colorExpression.push(stops[index]);
        colorExpression.push(chroma(color).rgb());
      });

      return this.wrapNodataCase_(colorExpression);
    }

    const customColor = this.getCustomColor_();
    if (!isNullOrEmpty(customColor)) {
      return this.wrapNodataCase_(customColor);
    }

    if (!isNullOrEmpty(nodata) || nodata === 0) {
      const passthroughColor = this.getPassthroughColorExpression_();
      return this.wrapNodataCase_(passthroughColor);
    }

    return undefined;
  }

  /**
   * Este método construye el estilo WebGL de OpenLayers.
   *
   * @function
   * @private
   * @returns {Object} Estilo WebGL.
   */
  buildOLStyle_() {
    const {
      gamma, saturation, exposure, contrast, brightness,
    } = this.options_;

    const olStyle = {};
    const color = this.buildColorExpression_();
    if (!isNullOrEmpty(color)) {
      olStyle.color = color;
    }

    if (!isNullOrEmpty(gamma) && gamma !== 1) {
      olStyle.gamma = gamma;
    }

    if (!isNullOrEmpty(saturation) && saturation !== 0) {
      olStyle.saturation = saturation;
    }

    if (!isNullOrEmpty(exposure) && exposure !== 0) {
      olStyle.exposure = exposure;
    }

    if (!isNullOrEmpty(contrast) && contrast !== 0) {
      olStyle.contrast = contrast;
    }

    if (!isNullOrEmpty(brightness) && brightness !== 0) {
      olStyle.brightness = brightness;
    }

    return olStyle;
  }

  /**
   * Este método aplica el estilo a la capa especificada.
   *
   * @function
   * @public
   * @param {IDEE.layer.GeoTIFF} layer Capa.
   * @api stable
   */
  applyToLayer(layer) {
    this.layer_ = layer;
    if (!isNullOrEmpty(layer)) {
      const layerImpl = layer.getImpl();
      this.layerNormalize_ = layerImpl.normalize !== false;
      const olLayer = layerImpl.getLayer();
      if (!isNullOrEmpty(olLayer) && !isNullOrEmpty(olLayer.setStyle)) {
        if (!this.appliedOnce_) {
          let previousStyle = layerImpl.style;
          if (typeof olLayer.getStyle === 'function') {
            const olStyle = olLayer.getStyle();
            if (!isNullOrEmpty(olStyle) && typeof olStyle === 'object') {
              previousStyle = olStyle;
            }
          }
          if (!isNullOrEmpty(previousStyle) && typeof previousStyle === 'object') {
            this.oldStyle_ = previousStyle;
          }
          this.appliedOnce_ = true;
        }
        const olStyle = this.buildOLStyle_();
        layerImpl.style = olStyle;
        olLayer.setStyle(olStyle);
      }
    }
  }

  /**
   * Este método elimina el estilo de la capa.
   *
   * @function
   * @public
   * @param {IDEE.layer} layer Capa.
   * @api stable
   */
  unapply(layer) {
    if (!isNullOrEmpty(layer)) {
      const layerImpl = layer.getImpl();
      const olLayer = layerImpl.getLayer();
      if (!isNullOrEmpty(olLayer) && !isNullOrEmpty(olLayer.setStyle)) {
        if (!isNullOrEmpty(this.oldStyle_) && typeof this.oldStyle_ === 'object') {
          layerImpl.style = this.oldStyle_;
          olLayer.setStyle(this.oldStyle_);
        } else {
          layerImpl.style = '';
          olLayer.setStyle({});
        }
      }
    }
    this.layer_ = null;
    this.oldStyle_ = null;
    this.appliedOnce_ = false;
  }

  /**
   * Este método modifica las opciones del estilo.
   *
   * @public
   * @param {object} options Opciones.
   * @param {object} vendorOptions Opciones de la librería base.
   * @function
   * @api stable
   */
  setOptions(options, vendorOptions) {
    this.options_ = extendsObj(options, vendorOptions);
  }
}

export default Raster;
