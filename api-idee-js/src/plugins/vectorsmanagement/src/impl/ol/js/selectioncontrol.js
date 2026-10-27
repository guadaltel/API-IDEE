/**
 * @module IDEE/impl/control/Selectioncontrol
 */

export default class Selectioncontrol extends IDEE.impl.Control {
  /**
  * @classdesc
  * Main constructor of the measure conrol.
  *
  * @constructor
  * @extends {ol.control.Control}
  * @api stable
  */
  constructor(map) {
    super();
    /**
      * Facade of the map
      * @private
      * @type {IDEE.Map}
      */
    this.facadeMap_ = map;
  }

  /**
   * This function adds the control to the specified map
   *
   * @public
   * @function
   * @param {IDEE.Map} map to add the plugin
   * @param {HTMLElement} html of the plugin
   * @api stable
   */
  addTo(map, html) {
    super.addTo(map, html);

    /**
     * Facade map
     * @private
     * @type {IDEE.map}
     */
    this.facadeMap_ = map;

    /**
     * OL vector source for draw interactions.
     * @private
     * @type {*} - OpenLayers vector source
     */
    this.vectorSource_ = undefined;
  }

  /**
   * Activates selection mode.
   * @public
   * @function
   * @api
   */
  activateSelection() {
    const olMap = this.facadeMap_.getMapImpl();
    const drawingLayer = this.facadeControl.getLayer().getImpl().getLayer();

    // this.facadeControl.hideTextPoint();

    if (document.querySelector('.m-geometrydraw>#downloadFormat') !== null) {
      document.querySelector('.m-geometrydraw').removeChild(this.facadeControl.downloadingTemplate);
    }

    if (drawingLayer) {
      this.removeSelectInteraction();
      this.select = new ol.interaction.Select({
        wrapX: false,
        layers: [drawingLayer],
        style: null,
        toggleCondition: ol.events.condition.platformModifierKeyOnly,
      });

      this.select.on('select', (e) => {
        if (e.target.getFeatures().getArray().length > 0) {
          this.facadeControl.onSelect(e);
        }
      });

      // keeps previous selection so it can be extended with platform modifier key
      this.select.getFeatures().extend(this.facadeControl.getSelectedOLFeatures());

      olMap.addInteraction(this.select);
    }
  }

  /**
   * Removes select interaction
   * @public
   * @function
   * @api
   */
  removeSelectInteraction() {
    this.facadeMap_.getMapImpl().removeInteraction(this.select);
  }

  /**
   * Activa el modo de selección por área (dibujo de polígono).
   * @public
   * @function
   * @api
   */
  activateAreaSelection() {
    this.removeAreaSelectInteraction();
    this.drawSelect = new ol.interaction.Draw({
      type: 'Polygon',
      stopClick: true,
    });

    this.drawSelect.on('drawend', (e) => {
      this.facadeControl.onAreaSelect(IDEE.impl.Feature.feature2Facade(e.feature));
    });

    this.facadeMap_.getMapImpl().addInteraction(this.drawSelect);
  }

  /**
   * Elimina la interacción de selección por área
   * @public
   * @function
   * @api
   */
  removeAreaSelectInteraction() {
    if (this.drawSelect) {
      this.facadeMap_.getMapImpl().removeInteraction(this.drawSelect);
      this.drawSelect = null;
    }
  }

  /**
   * Crea una copia de los objetos geográficos de api-idee.
   * @public
   * @function
   * @api
   * @param {Array<IDEE.Feature>} features
   * @returns {Array<IDEE.Feature>}
   */
  cloneFeatures(features) {
    return features.map((f) => IDEE.impl.Feature.feature2Facade(f.getImpl().getFeature().clone()));
  }

  /**
   * Creates current feature clone.
   * @public
   * @function
   * @api
   */
  getApiIdeeFeatureClone() {
    // eslint-disable-next-line no-underscore-dangle
    const implFeatureClone = this.facadeControl.feature.getImpl().olFeature_.clone();
    const emphasis = IDEE.impl.Feature.feature2Facade(implFeatureClone);
    return emphasis;
  }

  /**
   * Gets extent of feature
   * @public
   * @function
   * @api
   * @param {IDEE.Featuer} apiIdeeFeature
   */
  getFeatureExtent() {
    return this.facadeControl.feature.getImpl().getFeature().getGeometry().getExtent();
  }

  /**
   * Creates polygon feature from extent.
   * @public
   * @function
   * @api
   * @param {Array} extent - geometry extent
   */
  newPolygonFeature(extent) {
    return new ol.Feature({ geometry: ol.geom.Polygon.fromExtent(extent) });
  }
}
