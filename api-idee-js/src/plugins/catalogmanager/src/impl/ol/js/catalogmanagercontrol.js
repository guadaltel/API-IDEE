/**
 * @module IDEE/impl/control/CatalogmanagerControl
 */
export default class CatalogmanagerControl extends IDEE.impl.Control {
  /**
   * Esta función añade el control al mapa
   *
   * @public
   * @function
   * @param {IDEE.Map} map mapa donde se añadirá el plugin
   * @param {HTMLElement} html html del plugin
   * @api stable
   */
  addTo(map, html) {
    super.addTo(map, html);
  }

  createAllInteractions(map, facadeControl) {
    this.facadeControl_ = facadeControl;
    this.facadeMap_ = map;
    this.createDrawExtentInteraction();
    this.createSelectGeometryInteraction();
  }

  createDrawExtentInteraction() {
    this.dragBox = new ol.interaction.DragZoom({
      condition: () => true,
    });
    this.dragBox.on('boxend', (evt) => this.onBoxEnd(evt));
    this.dragBox.setActive(false);
    this.facadeMap_.getMapImpl().addInteraction(this.dragBox);
  }

  createSelectGeometryInteraction() {
    this.selectGeometry = new ol.interaction.Select({
      style: null,
    });
    this.selectGeometry.on('select', (evt) => this.onSelectGeometry(evt));
    this.selectGeometry.setActive(false);
    this.facadeMap_.getMapImpl().addInteraction(this.selectGeometry);
  }

  createSelectItemInteraction(olLayers) {
    this.olLayers_ = olLayers;
    this.selectItem = new ol.interaction.Select({
      style: null,
      layers: olLayers,
    });
    this.selectItem.on('select', (evt) => this.onSelectItem(evt));
    this.facadeMap_.getMapImpl().addInteraction(this.selectItem);
  }

  addLayerToSelectItem(olLayer) {
    if (!this.selectItem) {
      this.createSelectItemInteraction([olLayer]);
    } else {
      this.olLayers_.push(olLayer);
    }
  }

  activateDrawExtent() {
    this.dragBox.setActive(true);
  }

  deactivateDrawExtent() {
    this.dragBox.setActive(false);
  }

  activateSelectGeometry() {
    this.selectGeometry.setActive(true);
  }

  deactivateSelectGeometry() {
    this.selectGeometry.setActive(false);
  }

  deactivateAllInteractions() {
    this.deactivateDrawExtent();
    this.deactivateSelectGeometry();
  }

  onBoxEnd(evt) {
    const geom = this.dragBox.getGeometry();
    const extent = geom.getExtent();
    this.facadeControl_.setSpatialFilterByExtent(this.transformExtent(extent, this.facadeMap_.getProjection().code, 'EPSG:4326'));
  }

  onSelectItem(evt) {
    const features = this.selectItem.getFeatures();
    const featuresArray = features.getArray();
    if (featuresArray.length === 0) {
      return;
    }
    const itemId = featuresArray[0].getId();
    features.clear();
    this.facadeControl_.onItemSelect(itemId);
  }

  onSelectGeometry(evt) {
    const features = this.selectGeometry.getFeatures().getArray();
    if (features.length === 0) {
      return;
    }
    const popup = this.facadeMap_.getPopup();
    if (popup) {
      this.facadeMap_.removePopup(popup);
    }
    const geom = features[0].getGeometry();
    this.facadeControl_.setSpatialFilterByExtent(this.transformExtent(geom.getExtent(), this.facadeMap_.getProjection().code, 'EPSG:4326'));
  }

  transformExtent(extent, orig, dest) {
    return ol.proj.transformExtent(extent, orig, dest);
  }
}
