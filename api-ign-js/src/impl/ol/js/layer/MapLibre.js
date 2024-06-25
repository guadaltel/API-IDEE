/* eslint-disable no-underscore-dangle */
/**
 * @module M/impl/layer/MapLibre
 */
import {
  isNull,
  getResolutionFromScale,
  isNullOrEmpty,
  includes,
} from 'M/util/Utils';
import geojsonPopupTemplate from 'templates/geojson_popup';
import { compileSync as compileTemplate } from 'M/util/Template';
import Popup from 'M/Popup';
import * as EventType from 'M/event/eventtype';
import { MapLibreLayer } from '@geoblocks/ol-maplibre-layer';
import LayerBase from './Layer';

/**
 * @classdesc
 * Las capas de tipo Vector Tile ofrecen ciertas ventajas en algunos escenarios,
 * debido a su bajo peso y carga rápida,
 * ya que se sirven en forma de teselas que contienen la información vectorial
 * del área que delimitan.
 *
 * @api
 * @extends {M.impl.layer.Vector}
 */

class MapLibre extends LayerBase {
  /**
   * Constructor principal de la clase. Crea una capa MapLibre
   * con parámetros especificados por el usuario.
   *
   * @constructor
   * @implements {M.impl.layer.Vector}
   * @param {M.layer.MapLibre.parameters} parameters Opciones de la fachada, la fachada se refiere a
   * un patrón estructural como una capa de abstracción con un patrón de diseño.
   * @param {Mx.parameters.LayerOptions} options Parámetros opcionales para la capa.
   * - style: Define el estilo de la capa.
   * - minZoom. Zoom mínimo aplicable a la capa.
   * - maxZoom. Zoom máximo aplicable a la capa.
   * - visibility. Define si la capa es visible o no. Verdadero por defecto.
   * - displayInLayerSwitcher. Indica si la capa se muestra en el selector de capas.
   * - opacity. Opacidad de capa, por defecto 1.
   * - maxExtent: La medida en que restringe la visualización a una región específica.
   * @param {Object} vendorOptions Opciones para la biblioteca base.
   * @api
   */
  constructor(parameters, options, vendorOptions) {
    super(options, vendorOptions);
    /**
     * MapLibre formater_. Formato del objeto "MapLibre".
     */
    this.formater_ = null;

    /**
     * MapLibre popup_. Muestra el "popup".
     */
    this.popup_ = null;

    /**
     * MapLibre lastZoom_. Zoom anterior.
     */
    this.lastZoom_ = -1;

    /**
     * MapLibre projection_. Proyección de la capa.
     */
    this.projection_ = parameters.projection || 'EPSG:3857';

    /**
     * MapLibre features_. Objetos geográficos de la fuente de openlayers.
     */
    this.features_ = [];

    /**
     * MapLibre mode_. Modos de renderizado posible ("render" o "feature").
     */
    this.mode_ = parameters.mode;

    /**
     * MapLibre loaded_. Muestra si esta cargada la capa o no.
     */
    this.loaded_ = false;

    /**
     * MapLibre opacity_. Opacidad entre 0 y 1. Por defecto 1.
     */
    this.opacity_ = parameters.opacity || 1;

    /**
     * MapLibre visibility_. Indica si la capa es visible.
     */
    this.visibility_ = parameters.visibility !== false;

    /**
     * MapLibre layers_. Otras capas.
     */
    this.layers_ = parameters.layers;

    /**
     * MapLibre extract_.
     * Activa la consulta cuando se hace clic en un objeto geográfico,
     * por defecto falso.
     */
    this.extract = parameters.extract;

    this.style = parameters.style;

    this.options = options;

    this.vendorOptions = vendorOptions;

    this.disableBackgroundColor = parameters.disableBackgroundColor;
  }

  /**
   * Este metodo añade la capa al mapa.
   *
   * @public
   * @function
   * @param {M.impl.Map} map Mapa de la implementación.
   * @api
   */
  addTo(map) {
    this.map = map;
    this.fire(EventType.ADDED_TO_MAP);

    const params = Object.keys(this.vendorOptions).length !== 0
      ? this.vendorOptions
      : {
        mapLibreOptions: {
          style: this.style,
        },
      };

    this.ol3Layer = new MapLibreLayer(params);

    this.setZooms_();
    this.setResolutions_();
    this.setVisible(this.visibility_);
    this.map.getMapImpl().addLayer(this.ol3Layer);
    this.setDisableBackgroundColor_();
  }

  setDisableBackgroundColor_() {
    const mapLibreMap = this.ol3Layer.mapLibreMap;
    if (this.disableBackgroundColor === true) {
      mapLibreMap.on('load', () => {
        const layers = mapLibreMap.getStyle().layers;
        const idBackground = layers.filter(({ type }) => type === 'background')[0].id;

        if (this.disableBackgroundColor === true) {
          mapLibreMap.setPaintProperty(idBackground, 'background-color', 'transparent');
        }
      });
    }
  }

  setStyleMap(style) {
    const mapLibreMap = this.ol3Layer.mapLibreMap;
    mapLibreMap.setStyle(style);
  }

  setResolutions_() {
    if (!isNull(this.options)
      && !isNull(this.options.minScale) && !isNull(this.options.maxScale)) {
      const units = this.map.getProjection().units;
      this.options.minResolution = getResolutionFromScale(this.options.minScale, units);
      this.options.maxResolution = getResolutionFromScale(this.options.maxScale, units);

      this.ol3Layer.setMinResolution(this.options.minResolution);
      this.ol3Layer.setMaxResolution(this.options.maxResolution);
    }

    if (!isNull(this.options)
      && !isNull(this.options.minResolution) && !isNull(this.options.maxResolution)) {
      this.ol3Layer.setMinResolution(this.options.minResolution);
      this.ol3Layer.setMaxResolution(this.options.maxResolution);
    }
  }

  setZooms_() {
    this.ol3Layer.setMaxZoom(this.maxZoom);
    this.ol3Layer.setMinZoom(this.minZoom);
  }

  setPaintProperty(layer, property, value) {
    this.ol3Layer.mapLibreMap.on('style.load', () => {
      this.ol3Layer.mapLibreMap.setPaintProperty(layer, property, value);
    });
  }

  setLayoutProperty(layer, property, value) {
    this.ol3Layer.mapLibreMap.on('style.load', () => {
      this.ol3Layer.mapLibreMap.setLayoutProperty(layer, property, value);
    });
  }

  // ! TODO
  getFeaturesExtentPromise() {}

  /**
   * Pasa los objetos geográficos a la plantilla.
   * - ⚠️ Advertencia: Este método no debe ser llamado por el usuario.
   *
   * @public
   * @function
   * @param {ol.Feature} feature Objetos geográficos de Openlayers.
   * @returns {Object} "FeaturesTemplate.features".
   * @api stable
   */
  parseFeaturesForTemplate_(features) {
    const featuresTemplate = {
      features: [],
    };

    features.forEach((feature) => {
      const featureTemplate = {
        id: feature.getId(),
        attributes: this.recursiveExtract_(feature.getAttributes()),
      };
      featuresTemplate.features.push(featureTemplate);
    });
    return featuresTemplate;
  }

  recursiveExtract_(properties, parentKey = '') {
    const attributes = [];

    const propertyKeys = Object.keys(properties);

    propertyKeys.forEach((key) => {
      let addAttribute = true;
      // adds the attribute just if it is not in
      // hiddenAttributes_ or it is in showAttributes_
      if (!isNullOrEmpty(this.showAttributes_)) {
        addAttribute = includes(this.showAttributes_, key);
      } else if (!isNullOrEmpty(this.hiddenAttributes_)) {
        addAttribute = !includes(this.hiddenAttributes_, key);
      }

      if ((typeof properties[key] === 'object' && properties[key]) && !Array.isArray(properties[key])) {
        const values = this.recursiveExtract_(properties[key], (parentKey) ? `${parentKey} | ${key}` : key);
        attributes.push(...values);
      } else if (addAttribute) { // No se añade si es null o undefined
        const fullKey = parentKey ? `${parentKey} | ${key}` : key;
        const filter = fullKey.split(' | ');
        attributes.push({
          key: (parentKey) ? `${filter[filter.length - 2]} | ${filter[filter.length - 1]}` : key,
          value: properties[key],
        });
      }
    });

    return attributes;
  }

  /**
   * Este método se ejecuta cuando se selecciona un objeto geográfico.
   * @public
   * @function
   * @param {ol.Feature} feature Objetos geográficos de Openlayers.
   * @param {Array} coord Coordenadas.
   * @param {Object} evt Eventos.
   * @api stable
   */
  selectFeatures(features, coord, evt) {
    const feature = features[0];
    if (this.extract === true) {
      this.unselectFeatures();
      if (!isNullOrEmpty(feature)) {
        const htmlAsText = compileTemplate(geojsonPopupTemplate, {
          vars: this.parseFeaturesForTemplate_(features),
          parseToHtml: false,
        });

        const featureTabOpts = {
          icon: 'g-cartografia-pin',
          title: this.name,
          content: htmlAsText,
        };

        let popup = this.map.getPopup();
        if (isNullOrEmpty(popup)) {
          popup = new Popup();
          popup.addTab(featureTabOpts);
          this.map.addPopup(popup, coord);
        } else {
          popup.addTab(featureTabOpts);
        }
      }
    }
  }

  /**
   * Evento que se activa cuando se termina de hacer clic sobre
   * un objeto geográfico.
   *
   * @public
   * @function
   * @api stable
   */
  unselectFeatures() {
    if (!isNullOrEmpty(this.popup_)) {
      this.popup_.hide();
      this.popup_ = null;
    }
  }

  /**
   * Este método destruye el "popup" MapLibre.
   *
   * @public
   * @function
   * @api stable
   */
  removePopup() {
    if (!isNullOrEmpty(this.popup_)) {
      if (this.popup_.getTabs().length > 1) {
        this.popup_.removeTab(this.tabPopup_);
      } else {
        this.map.removePopup();
      }
    }
  }

  getFeatures(skipFilter, filter) {
    return [];
  }

  getStyle() {}

  /**
   * Este método devuelve un objeto geográfico por su id.
   *
   * @function
   * @public
   * @param {string|number} id Identificador del objeto geográfico..
   * @return {null|M.feature} Objeto Geográfico - Devuelve el objeto geográfico con
   * ese id si se encuentra, en caso de que no se encuentre o no indique el id devuelve nulo.
   * @api stable
   */
  getFeatureById(id) {
    return this.features_.filter((feature) => feature.getId() === id)[0];
  }

  /**
   * Devuelve la proyeccion de la capa.
   *
   * @public
   * @function
   * @returns {String} SRS de la capa.
   * @api stable
   */
  getProjection() {
    return this.projection_;
  }

  /**
   * Devuelve verdadero si la capa esta cargada.
   *
   * @function
   * @returns {Boolean} Verdadero.
   * @api stable
   */
  isLoaded() {
    return true;
  }

  /**
   * Este método comprueba si un objeto es igual
   * a esta capa.
   *
   * @public
   * @function
   * @param {Object} obj Objeto a comparar.
   * @returns {Boolean} Verdadero es igual, falso si no.
   * @api
   */
  equals(obj) {
    return false;
  }
}

export default MapLibre;