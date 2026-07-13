/**
 * @module IDEE/impl/style/Raster
 */
import chroma from 'chroma-js';
import {
  isNullOrEmpty, extendsObj, generateIntervals, isArray,
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
   * Este método devuelve la expresión de valor para la rampa.
   *
   * @function
   * @private
   * @returns {Array} Expresión WebGL.
   */
  getValueExpression_() {
    const { bands } = this.options_;
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
   * Este método construye el estilo WebGL de OpenLayers.
   *
   * @function
   * @private
   * @returns {Object} Estilo WebGL.
   */
  buildOLStyle_() {
    const {
      min, max, ramp, gamma, saturation, exposure, contrast, brightness, nodata, interpolation,
    } = this.options_;

    let rangeMin = min;
    let rangeMax = max;
    if (this.layerNormalize_) {
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

    let color = colorExpression;
    if (!isNullOrEmpty(nodata)) {
      const { bands } = this.options_;
      let nodataBand = bands;
      if (isArray(bands)) {
        nodataBand = bands[0];
      }
      color = [
        'case',
        ['==', ['band', nodataBand], nodata],
        [0, 0, 0, 0],
        colorExpression,
      ];
    }

    const olStyle = {
      color,
    };

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
   * @param {IDEE.layer.GeoTIFF|IDEE.layer.GenericRaster} layer Capa.
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

  /**
   * Este método devuelve las opciones del estilo.
   *
   * @public
   * @function
   * @returns {Object} Opciones del estilo.
   * @api stable
   */
  getOptions() {
    return this.options_;
  }
}

export default Raster;
