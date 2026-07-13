/**
 * @module IDEE/style/Raster
 */
import RasterImpl from 'impl/style/Raster';
import Style from './Style';
import {
  isArray, isNullOrEmpty, isObject, isUndefined, inverseColor,
  generateIntervals, defineFunctionFromString,
} from '../util/Utils';
import Exception from '../exception/exception';
import { getValue } from '../i18n/language';

/**
 * @classdesc
 * Crea un estilo ráster con rampa de colores
 * con parámetros especificados por el usuario.
 * @api
 * @extends {IDEE.style}
 */
class Raster extends Style {
  /**
   * Constructor principal de la clase.
   *
   * @constructor
   * @param {Mx.RasterStyleOptions} optionsParam Opciones del estilo.
   * - bands: Banda o bandas a utilizar. Número para una banda, array para media.
   * - min: Valor mínimo de la rampa (por defecto 0).
   * - max: Valor máximo de la rampa (por defecto 1).
   * - ramp: Rampa de colores.
   * - gamma: Gamma de la capa (por defecto 1, rango OpenLayers: 0 a infinito).
   * - nodata: Valor nodata para transparencia.
   * - interpolation: Tipo de interpolación ('linear' o 'exponential').
   * - interpolationBase: Base para interpolación exponencial (por defecto 2).
   * @param {object} vendorOptionsParam Opciones de la librería base.
   * @api
   */
  constructor(optionsParam = {}, vendorOptionsParam = {}) {
    const options = { ...optionsParam };
    const vendorOptions = vendorOptionsParam;

    if (!isNullOrEmpty(options.ramp) && !isArray(options.ramp)) {
      options.ramp = [options.ramp];
    }

    options.ramp = options.ramp || Raster.DEFAULT_OPTIONS.ramp;

    if (options.ramp.length < 2) {
      const inverseColorParam = inverseColor(options.ramp[0]);
      options.ramp.push(inverseColorParam);
    }

    options.bands = Raster.normalizeBands(options);
    options.min = isNullOrEmpty(options.min)
      ? Raster.DEFAULT_OPTIONS.min
      : parseFloat(options.min);
    options.max = isNullOrEmpty(options.max)
      ? Raster.DEFAULT_OPTIONS.max
      : parseFloat(options.max);
    options.gamma = Raster.normalizeGamma(options.gamma);
    options.interpolation = options.interpolation || Raster.DEFAULT_OPTIONS.interpolation;
    options.interpolationBase = Number.isNaN(parseFloat(options.interpolationBase))
      ? Raster.DEFAULT_OPTIONS.interpolationBase
      : parseFloat(options.interpolationBase);

    if (isUndefined(RasterImpl) || (isObject(RasterImpl)
      && isNullOrEmpty(Object.keys(RasterImpl)))) {
      Exception(getValue('exception').raster_method);
    }

    const impl = new RasterImpl(options, vendorOptions);
    super(options, impl);

    /**
     * @private
     * @type {Mx.RasterStyleOptions}
     */
    this.options_ = options;

    /**
     * @private
     * @type {object}
     */
    this.vendorOptions_ = vendorOptions;
  }

  /**
   * Este método elimina los estilos.
   *
   * @function
   * @public
   * @param {IDEE.layer} layer Capa.
   * @api
   */
  unapply(layer) {
    this.layer_ = null;
    this.getImpl().unapply(layer);
  }

  /**
   * Este método devuelve la banda o bandas utilizadas.
   *
   * @function
   * @public
   * @return {number|Array<number>} Banda o bandas.
   * @api
   */
  getBands() {
    return this.options_.bands;
  }

  /**
   * Este método establece la banda o bandas del estilo ráster.
   *
   * @function
   * @public
   * @param {number|Array<number>} bands Banda o bandas.
   * @api
   */
  setBands(bands) {
    this.options_.bands = Raster.normalizeBands({ bands });
    this.update_();
  }

  /**
   * Normaliza el parámetro bands (número o array).
   *
   * @function
   * @private
   * @param {Object} options Opciones con bands.
   * @return {number|Array<number>} Banda o bandas normalizadas.
   */
  static normalizeBands(options) {
    const { bands } = options;

    if (isNullOrEmpty(bands)) {
      return Raster.DEFAULT_OPTIONS.bands;
    }

    if (isArray(bands)) {
      if (bands.length === 0) {
        Exception(getValue('exception').no_empty);
      }
      const normalized = bands.map((bandIndex) => parseInt(bandIndex, 10));
      if (normalized.length === 1) {
        return normalized[0];
      }
      return normalized;
    }

    return parseInt(bands, 10);
  }

  /**
   * Normaliza el parámetro gamma según el rango (0 a infinito).
   *
   * @function
   * @private
   * @param {number|string} gamma Valor gamma.
   * @return {number} Gamma normalizado.
   */
  static normalizeGamma(gamma) {
    const value = parseFloat(gamma);
    if (Number.isNaN(value)) {
      return Raster.DEFAULT_OPTIONS.gamma;
    }
    if (value < 0) {
      Exception(getValue('exception').invalid_raster_gamma);
    }
    return value;
  }

  /**
   * Este método devuelve el valor mínimo de la rampa.
   *
   * @function
   * @public
   * @return {number} Valor mínimo.
   * @api
   */
  getMin() {
    return this.options_.min;
  }

  /**
   * Este método establece el valor mínimo de la rampa.
   *
   * @function
   * @public
   * @param {number} min Valor mínimo.
   * @api
   */
  setMin(min) {
    this.options_.min = parseFloat(min);
    this.update_();
  }

  /**
   * Este método devuelve el valor máximo de la rampa.
   *
   * @function
   * @public
   * @return {number} Valor máximo.
   * @api
   */
  getMax() {
    return this.options_.max;
  }

  /**
   * Este método establece el valor máximo de la rampa.
   *
   * @function
   * @public
   * @param {number} max Valor máximo.
   * @api
   */
  setMax(max) {
    this.options_.max = parseFloat(max);
    this.update_();
  }

  /**
   * Este método devuelve la rampa de colores.
   *
   * @function
   * @public
   * @return {Array<string>} Rampa de colores.
   * @api
   */
  getRamp() {
    return this.options_.ramp;
  }

  /**
   * Este método establece la rampa de colores.
   *
   * @function
   * @public
   * @param {Array<string>} rampParam Rampa de colores.
   * @api
   */
  setRamp(rampParam) {
    let ramp = rampParam;
    if (!isArray(ramp)) {
      ramp = [ramp];
    }
    if (ramp.length < 2) {
      const inverseColorParam = inverseColor(ramp[0]);
      ramp.push(inverseColorParam);
    }
    this.options_.ramp = ramp;
    this.update_();
  }

  /**
   * Este método devuelve el valor gamma del estilo ráster.
   *
   * @function
   * @public
   * @return {number} Gamma.
   * @api
   */
  getGamma() {
    return this.options_.gamma;
  }

  /**
   * Este método establece el valor gamma del estilo ráster.
   *
   * @function
   * @public
   * @param {number} gamma Gamma.
   * @api
   */
  setGamma(gamma) {
    this.options_.gamma = Raster.normalizeGamma(gamma);
    this.update_();
  }

  /**
   * Este método devuelve el valor nodata del estilo ráster.
   *
   * @function
   * @public
   * @return {number} Valor nodata.
   * @api
   */
  getNodata() {
    return this.options_.nodata;
  }

  /**
   * Este método establece el valor nodata del estilo ráster.
   *
   * @function
   * @public
   * @param {number} nodata Valor nodata.
   * @api
   */
  setNodata(nodata) {
    this.options_.nodata = nodata;
    this.update_();
  }

  /**
   * Este método devuelve el tipo de interpolación del estilo ráster.
   *
   * @function
   * @public
   * @return {string} Tipo de interpolación.
   * @api
   */
  getInterpolation() {
    return this.options_.interpolation;
  }

  /**
   * Este método establece el tipo de interpolación del estilo ráster.
   *
   * @function
   * @public
   * @param {string} interpolation Tipo de interpolación ('linear' o 'exponential').
   * @param {number} interpolationBase Base para interpolación exponencial.
   * @api
   */
  setInterpolation(interpolation, interpolationBase) {
    this.options_.interpolation = interpolation || Raster.DEFAULT_OPTIONS.interpolation;
    if (!isNullOrEmpty(interpolationBase)) {
      this.options_.interpolationBase = parseFloat(interpolationBase);
    }
    this.update_();
  }

  /**
   * Este método devuelve la base de interpolación exponencial.
   *
   * @function
   * @public
   * @return {number} Base de interpolación exponencial.
   * @api
   */
  getInterpolationBase() {
    return this.options_.interpolationBase;
  }

  /**
   * Este método establece la base de interpolación exponencial.
   *
   * @function
   * @public
   * @param {number} interpolationBase Base de interpolación exponencial.
   * @api
   */
  setInterpolationBase(interpolationBase) {
    this.options_.interpolationBase = parseFloat(interpolationBase);
    this.update_();
  }

  /**
   * Este método actualiza el estilo ráster.
   * - ⚠️ Advertencia: Este método no debe ser llamado por el usuario.
   *
   * @public
   * @function
   * @api
   */
  update_() {
    const styleImpl = this.getImpl();
    styleImpl.setOptions(this.options_, this.vendorOptions_);
    if (!isNullOrEmpty(this.layer_)) {
      styleImpl.applyToLayer(this.layer_);
    }
    this.updateCanvas();
  }

  /**
   * Este método dibuja el estilo en el canvas.
   *
   * @function
   * @public
   * @api
   */
  drawGeometryToCanvas() {
    const ctx = this.canvas_.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 20, 200, 20);
    const intervals = generateIntervals([0, 1], this.options_.ramp.length);
    this.options_.ramp.forEach((color, index) => {
      gradient.addColorStop(intervals[index], color);
    });
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 20, 200, 30);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.fillText(this.options_.min, 0, 65);
    ctx.fillText(this.options_.max, 180, 65);
  }

  /**
   * Este método actualiza el canvas.
   *
   * @function
   * @public
   * @api
   */
  updateCanvas() {
    this.drawGeometryToCanvas();
  }

  /**
   * Esta función implementa el mecanismo para
   * generar el JSON de esta instancia.
   *
   * @public
   * @return {object} Devuelve el JSON.
   * @function
   * @api
   */
  toJSON() {
    const options = this.getOptions();
    const serializedBands = isArray(options.bands)
      ? [...options.bands]
      : options.bands;
    const serializedOptions = {
      bands: serializedBands,
      min: options.min,
      max: options.max,
      ramp: [...options.ramp],
      gamma: options.gamma,
      nodata: options.nodata,
      interpolation: options.interpolation,
      interpolationBase: options.interpolationBase,
    };
    const vendorOptions = this.vendorOptions_;
    const parameters = [serializedOptions, vendorOptions];
    const deserializedMethod = 'IDEE.style.Raster.deserialize';
    return { parameters, deserializedMethod };
  }

  /**
   * Este método de la clase deserializa el estilo.
   *
   * @function
   * @public
   * @param {Array} parametrers Parámetros.
   * @return {IDEE.style.Raster} Devuelve el estilo deserializado.
   */
  static deserialize([serializedOptions, serializedVendorOptions]) {
    const options = defineFunctionFromString(serializedOptions);
    const vendorOptions = defineFunctionFromString(serializedVendorOptions);

    /* eslint-disable */
    const styleFn = new Function(['options', 'vendorOptions'], 'return new IDEE.style.Raster(options, vendorOptions)');
    /* eslint-enable */
    return styleFn(options, vendorOptions);
  }
}

/**
 * Opciones por defecto del estilo ráster.
 * @constant
 * @public
 * @api
 */
Raster.DEFAULT_OPTIONS = {
  bands: 1,
  min: 0,
  max: 1,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
  gamma: 1,
  interpolation: 'linear',
  interpolationBase: 2,
};

export default Raster;
