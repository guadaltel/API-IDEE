/**
 * @module M/control/GeorefimageControl
 */

import JsZip from 'jszip';
import { saveAs } from 'file-saver';
import GeorefimageControlImpl from '../../impl/ol/js/georefimagecontrol';
import georefimageHTML from '../../templates/georefimage';

export default class GeorefimageControl extends M.Control {
  /**
   * @classdesc
   * Main constructor of the class.
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor() {
    const impl = new GeorefimageControlImpl();

    super(impl, GeorefimageControl.NAME);

    if (M.utils.isUndefined(GeorefimageControlImpl)) {
      M.exception('La implementación usada no puede crear controles Georefimage');
    }

    if (M.utils.isUndefined(GeorefimageControlImpl.prototype.encodeLayer)) {
      M.exception('La implementación usada no posee el método encodeLayer');
    }

    /**
     * Mapfish server url
     * @private
     * @type {String}
     */
    this.serverUrl_ = 'https://geoprint.desarrollo.guadaltel.es';

    /**
     * Mapfish template url
     * @private
     * @type {String}
     */
    this.printTemplateUrl_ = 'https://geoprint.desarrollo.guadaltel.es/print/mapexport';


    /**
     * Url for getting priting status
     * @private
     * @type {String}
     */
    this.printStatusUrl_ = 'https://geoprint.desarrollo.guadaltel.es/print/status';

    /**
     * Map title
     * @private
     * @type {HTMLElement}
     */
    this.inputTitle_ = null;

    /**
     * Map description
     * @private
     * @type {HTMLElement}
     */
    this.areaDescription_ = null;

    /**
     * Layout
     * @private
     * @type {HTMLElement}
     */
    this.layout_ = null;

    /**
     * Map format to print
     * @private
     * @type {HTMLElement}
     */
    this.format_ = null;

    /**
     * Map dpi to print
     * @private
     * @type {HTMLElement}
     */
    this.dpi_ = null;

    /**
     * Force scale boolean
     * @private
     * @type {HTMLElement}
     */
    this.forceScale_ = null;

    /**
     * Mapfish params
     * @private
     * @type {String}
     */
    this.params_ = {
      layout: {
        outputFilename: 'mapa_${yyyy-MM-dd_hhmmss}',
      },
      pages: {
        clientLogo: '', // logo url
        creditos: 'Impresión generada a través de Mapea',
      },
      parameters: {},
    };

    /**
     * Container of maps available for download
     * @private
     * @type {HTMLElement}
     */
    this.queueContainer_ = null;

    /**
     * Facade of the map
     * @private
     * @type {Promise}
     */
    this.capabilitiesPromise_ = null;

    /**
     * Mapfish options params
     * @private
     * @type {String}
     */
    this.options_ = {
      dpi: 150,
      forceScale: false,
      format: 'jpg',
      legend: 'false',
      layout: 'A4 horizontal jpg',
    };

    this.layoutOptions_ = [];
    this.dpisOptions_ = [];
    this.outputFormats_ = ['pdf', 'png', 'jpg'];

    this.documentRead_ = document.createElement('img');
    this.canvas_ = document.createElement('canvas');
  }

  /**
   * This function checks when map printing is finished.
   * @param {String} url - Mapfish GET request url
   * @param {Function} callback - function that removes loading icon class.
   */
  getStatus(url, callback) {
    M.proxy(false);
    M.remote.get(url).then((response) => {
      const statusJson = JSON.parse(response.text);
      const { status } = statusJson;
      if (status === 'finished') {
        callback();
      } else if (status === 'error' || status === 'cancelled') {
        callback();
        if (statusJson.error.toLowerCase().indexOf('network is unreachable') > -1 || statusJson.error.toLowerCase().indexOf('illegalargument') > -1) {
          M.dialog.error('La petición de alguna tesela ha provocado un error en la impresión. <br/>Por favor, inténtelo de nuevo.');
        } else {
          M.dialog.error('Se ha producido un error en la impresión.');
        }

        this.queueContainer_.lastChild.remove();
      } else {
        setTimeout(() => this.getStatus(url, callback), 1000);
      }
    });
  }

  /**
   * This function creates the view to the specified map.
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stabletrue
   */
  createView(map) {
    const promise = new Promise((success, fail) => {
      this.getCapabilities().then((capabilitiesParam) => {
        const capabilities = capabilitiesParam;
        let i = 0;
        let ilen;
        this.dpi_ = capabilitiesParam.layouts[0].attributes[0].clientInfo.maxDPI;
        // default layout
        for (i = 0, ilen = capabilities.layouts.length; i < ilen; i += 1) {
          const layout = capabilities.layouts[i];
          if (layout.name === this.options_.layout) {
            layout.default = true;
            break;
          }
        }

        this.layoutOptions_ = [].concat(capabilities.layouts.map((item) => {
          return item.name;
        }));

        capabilities.dpis = [];
        let attribute;
        // default dpi
        // recommended DPI list attribute search
        for (i = 0, ilen = capabilities.layouts[0].attributes.length; i < ilen; i += 1) {
          if (capabilities.layouts[0].attributes[i].clientInfo !== null) {
            attribute = capabilities.layouts[0].attributes[i];
          }
        }

        for (i = 0, ilen = attribute.clientInfo.dpiSuggestions.length; i < ilen; i += 1) {
          const dpi = attribute.clientInfo.dpiSuggestions[i];

          if (parseInt(dpi, 10) === this.options_.dpi) {
            dpi.default = true;
            break;
          }
          const object = { value: dpi };
          capabilities.dpis.push(object);
        }

        this.dpisOptions_ = [].concat(capabilities.dpis.map((item) => {
          return item.value;
        }));

        if (Array.isArray(capabilities.formats)) {
          this.outputFormats_ = capabilities.formats;
        }

        capabilities.format = this.outputFormats_.map((format) => {
          return {
            name: format,
            default: format === 'pdf',
          };
        });

        // forceScale
        capabilities.forceScale = this.options_.forceScale;
        const html = M.template.compileSync(georefimageHTML, { jsonp: true, vars: capabilities });
        this.addEvents(html);
        success(html);
      });
    });
    return promise;
  }

  /**
   * This function adds event listeners.
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  addEvents(html) {
    this.element_ = html;

    this.inputTitle_ = this.element_.querySelector('.form div.title > input');

    const printBtn = this.element_.querySelector('.button > button.print');
    printBtn.addEventListener('click', this.printClick_.bind(this));

    const cleanBtn = this.element_.querySelector('.button > button.remove');
    cleanBtn.addEventListener('click', (event) => {
      event.preventDefault();

      // reset values
      this.inputTitle_.value = '';

      // Create events and init
      const changeEvent = document.createEvent('HTMLEvents');
      changeEvent.initEvent('change');
      const clickEvent = document.createEvent('HTMLEvents');
      // Fire listeners
      clickEvent.initEvent('click');
      // clean queue

      Array.prototype.forEach.apply(this.queueContainer_.children, [(child) => {
        child.removeEventListener('click', this.downloadPrint.bind(this));
      }, this]);

      this.queueContainer_.innerHTML = '';
    });

    this.queueContainer_ = this.element_.querySelector('.queue > ul.queue-container');
    M.utils.enableTouchScroll(this.queueContainer_);
  }

  /**
   * Sets layout
   *
   * @private
   * @function
   */
  setLayout(layout) {
    this.layout_ = layout;
  }

  /**
   * Sets format
   *
   * @private
   * @function
   */
  setFormat(format) {
    this.format_ = format;
  }


  /**
   * Sets force scale option
   *
   * @private
   * @function
   */
  setForceScale(forceScale) {
    this.forceScale_ = forceScale;
  }

  /**
   * This function prints on click
   *
   * @private
   * @function
   */
  printClick_(evt) {
    evt.preventDefault();
    this.getPrintData().then((printData) => {
      let printUrl = M.utils.concatUrlPaths([this.printTemplateUrl_, `report.${printData.outputFormat}`]);

      const queueEl = this.createQueueElement();
      this.queueContainer_.appendChild(queueEl);
      queueEl.classList.add(GeorefimageControl.LOADING_CLASS);
      printUrl = M.utils.addParameters(printUrl, 'mapeaop=geoprint');
      // FIXME: delete proxy deactivation and uncomment if/else when proxy is fixed on Mapea
      M.proxy(false);
      M.remote.post(printUrl, printData).then((responseParam) => {
        let response = responseParam;
        const responseStatusURL = JSON.parse(response.text);
        const ref = responseStatusURL.ref;
        const statusURL = M.utils.concatUrlPaths([this.printStatusUrl_, `${ref}.json`]);
        this.getStatus(statusURL, () => queueEl.classList.remove(GeorefimageControl.LOADING_CLASS));

        // if (response.error !== true) { // withoud proxy, response.error === true
        let downloadUrl;
        try {
          response = JSON.parse(response.text);
          downloadUrl = M.utils.concatUrlPaths([this.serverUrl_, response.downloadURL]);
          this.documentRead_.src = downloadUrl;
        } catch (err) {
          M.exception(err);
        }
        queueEl.setAttribute(GeorefimageControl.DOWNLOAD_ATTR_NAME, downloadUrl);
        queueEl.addEventListener('click', this.downloadPrint.bind(this));
        // } else {
        //   M.dialog.error('Se ha producido un error en la impresión.');
        // }
      });
      M.proxy(true);
    });
  }

  getSourceAsDOM(url) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
    const parser = new DOMParser();
    const parser2 = parser.parseFromString(xmlhttp.responseText, 'text/html');

    return parser2;
  }

  /**
   * Gets capabilities
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  getCapabilities() {
    M.proxy(false);
    if (M.utils.isNullOrEmpty(this.capabilitiesPromise_)) {
      this.capabilitiesPromise_ = new Promise((success, fail) => {
        const capabilitiesUrl = M.utils.concatUrlPaths([this.printTemplateUrl_, 'capabilities.json']);
        M.remote.get(capabilitiesUrl).then((response) => {
          let capabilities = {};
          try {
            capabilities = JSON.parse(response.text);
          } catch (err) {
            M.exception(err);
          }
          success(capabilities);
        });
      });
    }
    return this.capabilitiesPromise_;
  }

  /**
   * Converts decimal degrees coordinates to degrees, minutes, seconds
   * @public
   * @function
   * @param {String} coordinate - single coordinate (one of a pair)
   * @api
   */
  converterDecimalToDMS(coordinate) {
    let dms;
    let aux;
    const coord = coordinate.toString();
    const splittedCoord = coord.split('.');
    // Degrees
    dms = `${splittedCoord[0]}º `;
    // Minutes
    aux = `0.${splittedCoord[1]}`;
    aux *= 60;
    aux = aux.toString();
    aux = aux.split('.');
    dms = `${dms}${aux[0]}' `;
    // Seconds
    aux = `0.${aux[1]}`;
    aux *= 60;
    aux = aux.toString();
    aux = aux.split('.');
    dms = `${dms}${aux[0]}'' `;
    return dms;
  }

  /**
   * Converts original bbox coordinates to DMS coordinates.
   * @public
   * @function
   * @api
   * @param {Array<Object>} bbox - { x: {min, max}, y: {min, max} }
   */
  convertBboxToDMS(bbox) {
    const proj = this.map_.getProjection();
    let dmsBbox = bbox;

    if (proj.units === 'm') {
      const min = [bbox.x.min, bbox.y.min];
      const max = [bbox.x.max, bbox.y.max];
      const newMin = this.getImpl().reproject(proj.code, min);
      const newMax = this.getImpl().reproject(proj.code, max);
      dmsBbox = {
        x: { min: newMin[0], max: newMax[0] },
        y: { min: newMin[1], max: newMax[1] },
      };
    }

    dmsBbox = this.convertDecimalBoxToDMS(dmsBbox);
    return dmsBbox;
  }

  /**
   * Converts decimal coordinates Bbox to DMS coordinates Bbox.
   * @public
   * @function
   * @api
   * @param { Array < Object > } bbox - { x: { min, max }, y: { min, max } }
   */
  convertDecimalBoxToDMS(bbox) {
    return {
      x: {
        min: this.converterDecimalToDMS(bbox.x.min),
        max: this.converterDecimalToDMS(bbox.x.max),
      },
      y: {
        min: this.converterDecimalToDMS(bbox.y.min),
        max: this.converterDecimalToDMS(bbox.y.max),
      },
    };
  }

  /**
   * This function returns request JSON.
   *
   * @private
   * @function
   */
  getPrintData() {
    const projection = this.map_.getProjection().code;
    const bbox = this.map_.getBbox();
    const width = this.map_.getMapImpl().getSize()[0];
    const height = this.map_.getMapImpl().getSize()[1];
    const layout = 'plain';
    const dpi = this.dpi_;
    const outputFormat = 'jpg';
    const center = this.map_.getCenter();
    const parameters = this.params_.parameters;

    const printData = M.utils.extend({
      layout,
      outputFormat,
      attributes: {
        map: {
          dpi,
          projection,
          useAdjustBounds: true,
        },
      },
    }, this.params_.layout);

    return this.encodeLayers().then((encodedLayers) => {
      printData.attributes.map.layers = encodedLayers;
      printData.attributes = Object.assign(printData.attributes, parameters);

      if (projection.code !== 'EPSG:3857' && this.map_.getLayers().some(layer => (layer.type === M.layer.type.OSM || layer.type === M.layer.type.Mapbox))) {
        printData.attributes.map.projection = 'EPSG:3857';
      }


      if (!this.forceScale_) {
        printData.attributes.map.dpi = dpi;
        printData.attributes.map.width = width;
        printData.attributes.map.height = height;
        printData.attributes.map.bbox = [bbox.x.min, bbox.y.min, bbox.x.max, bbox.y.max];


        if (projection.code !== 'EPSG:3857' && this.map_.getLayers().some(layer => (layer.type === M.layer.type.OSM || layer.type === M.layer.type.Mapbox))) {
          printData.attributes.map.bbox = this.getImpl().transformExt(printData.attributes.map.bbox, projection.code, 'EPSG:3857');
        }
      } else if (this.forceScale_) {
        printData.attributes.map.center = [center.x, center.y];
        printData.attributes.map.scale = this.map_.getScale();
      }

      return printData;
    });
  }

  /**
   * This function encodes layers.
   *
   * @private
   * @function
   */
  encodeLayers() {
    // Filters visible layers whose resolution is inside map resolutions range
    // and that doesn't have Cluster style.
    let layers = this.map_.getLayers().filter((layer) => {
      return (layer.isVisible() && layer.inRange() && layer.name !== 'cluster_cover');
    });

    let numLayersToProc = layers.length;

    const otherLayers = this.getImpl().getParametrizedLayers('IMAGEID', layers);
    if (otherLayers.length > 0) {
      layers = layers.concat(otherLayers);
      numLayersToProc = layers.length;
    }

    return (new Promise((success, fail) => {
      let encodedLayers = [];
      const vectorLayers = [];
      const wmsLayers = [];
      const otherBaseLayers = [];
      layers.forEach((layer) => {
        this.getImpl().encodeLayer(layer).then((encodedLayer) => {
          // Vector layers must be added after non vector layers.
          if (!M.utils.isNullOrEmpty(encodedLayer)) {
            if (encodedLayer.type === 'Vector' || encodedLayer.type === 'KML') {
              vectorLayers.push(encodedLayer);
            } else if (encodedLayer.type === 'WMS') {
              wmsLayers.push(encodedLayer);
            } else {
              otherBaseLayers.push(encodedLayer);
            }
          }

          numLayersToProc -= 1;
          if (numLayersToProc === 0) {
            encodedLayers = encodedLayers.concat(otherBaseLayers)
              .concat(wmsLayers).concat(vectorLayers);
            // Mapfish requires reverse order
            success(encodedLayers.reverse());
          }
        });
      });
    }));
  }

  /**
   * This function creates list element.
   *
   * @public
   * @function
   * @api stable
   */
  createQueueElement() {
    const queueElem = document.createElement('li');
    let title = this.inputTitle_.value;
    if (M.utils.isNullOrEmpty(title)) {
      title = GeorefimageControl.NO_TITLE;
    }
    queueElem.innerHTML = title;
    return queueElem;
  }

  /**
   * This function downloads printed map.
   *
   * @public
   * @function
   * @api stable
   */
  downloadPrint(event) {
    // event.preventDefault();

    // const downloadUrl = this.getAttribute(GeorefimageControl.DOWNLOAD_ATTR_NAME);
    // if (!M.utils.isNullOrEmpty(downloadUrl)) {
    //   window.open(downloadUrl, '_blank');
    //


    const base64image = this.getBase64Image(this.documentRead_.src);
    base64image.then((resolve) => {
      const xminprima = (this.map_.getBbox().x.max - this.map_.getBbox().x.min);
      const ymaxprima = (this.map_.getBbox().y.max - this.map_.getBbox().y.min);

      const Px = ((xminprima / this.map_.getMapImpl().getSize()[0]) *
        (72 / this.dpi_)).toString();
      const GiroA = (0).toString();
      const GiroB = (0).toString();
      const Py = -((ymaxprima / this.map_.getMapImpl().getSize()[1]) *
        (72 / this.dpi_)).toString();
      const Cx = (this.map_.getBbox().x.min).toString();
      const Cy = (this.map_.getBbox().y.max).toString();

      let titulo = this.inputTitle_.value;

      if (titulo === '') {
        const f = new Date();
        titulo = 'mapa_'.concat(f.getFullYear(), '-', f.getMonth() + 1, '-', f.getDay() + 1, '_', f.getHours(), f.getMinutes(), f.getSeconds());
      }

      const zip = new JsZip();
      zip.file(titulo.concat('.jgw'), Px.concat('\n', GiroA, '\n', GiroB, '\n', Py, '\n', Cx, '\n', Cy));
      zip.file(titulo.concat('.jpg'), resolve, { base64: true });
      zip.generateAsync({ type: 'blob' })
        .then((content) => {
          // see FileSaver.js
          saveAs(content, titulo.concat('.zip'));
        });
    });
  }

  getBase64Image(imgUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.setAttribute('crossorigin', 'anonymous');
      img.src = imgUrl;
      img.onload = function can() {
        this.canvas_ = document.createElement('canvas');
        this.canvas_.width = img.width;
        this.canvas_.height = img.height;
        const ctx = this.canvas_.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = this.canvas_.toDataURL('image/jpeg', 1.0);
        resolve(dataURL.replace(/^data:image\/(png|jpeg);base64,/, ''));
      };

      img.onerror = function rej() {
        Promise.reject(new Error('The image could not be loaded.'));
      };
    });
  }

  /**
   *  Converts epsg code to projection name.
   * @public
   * @function
   * @param {String} projection - EPSG:xxxx
   * @api
   */
  turnProjIntoLegend(projection) {
    let projectionLegend;
    switch (projection) {
      case 'EPSG:4258':
        projectionLegend = 'ETRS89 (4258)';
        break;
      case 'EPSG:4326':
        projectionLegend = 'WGS84 (4326)';
        break;
      case 'EPSG:3857':
        projectionLegend = 'WGS84 (3857)';
        break;
      case 'EPSG:25831':
        projectionLegend = 'UTM zone 31N (25831)';
        break;
      case 'EPSG:25830':
        projectionLegend = 'UTM zone 30N (25830)';
        break;
      case 'EPSG:25829':
        projectionLegend = 'UTM zone 29N (25829)';
        break;
      case 'EPSG:25828':
        projectionLegend = 'UTM zone 28N (25828)';
        break;
      default:
        projectionLegend = '';
    }
    return projectionLegend;
  }

  /**
   * This function checks if an object is equal to this control.
   *
   * @function
   * @api stable
   */
  equals(obj) {
    let equals = false;
    if (obj instanceof GeorefimageControl) {
      equals = (this.name === obj.name);
    }
    return equals;
  }
}

/**
 * Name for this controls
 * @const
 * @type {string}
 * @public
 * @api stable
 */
GeorefimageControl.NAME = 'georefimagecontrol';

/**
 * M.template for this controls
 * @const
 * @type {string}
 * @public
 * @api stable
 */
GeorefimageControl.TEMPLATE = 'georefimage.html';

/**
 * M.template for this controls
 * @const
 * @type {string}
 * @public
 * @api stable
 */
GeorefimageControl.LOADING_CLASS = 'printing';

/**
 * M.template for this controls
 * @const
 * @type {string}
 * @public
 * @api stable
 */
GeorefimageControl.DOWNLOAD_ATTR_NAME = 'data-donwload-url-print';

/**
 * M.template for this controls
 * @const
 * @type {string}
 * @public
 * @api stable
 */
GeorefimageControl.NO_TITLE = '(Sin título)';