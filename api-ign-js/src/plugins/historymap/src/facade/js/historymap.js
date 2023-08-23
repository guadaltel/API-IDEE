/**
 * @module M/plugin/HistoryMap
 */
import '../assets/css/historymap';
import '../assets/css/fonts';
import api from '../../api';
import HistoryMapControl from './historymapcontrol';
import { getValue } from './i18n/language';

import es from './i18n/es';
import en from './i18n/en';

export default class HistoryMap extends M.Plugin {
  /**
   * @constructor
   * @extends {M.Plugin}
   * @param {Object} impl implementation object
   * @api
   */
  constructor(options = {}) {
    super();
    /**
     * Facade of the map
     * @private
     * @type {M.Map}
     */
    this.map_ = null;

    /**
     * Array of controls
     * @private
     * @type {Array<M.Control>}
     */
    this.controls_ = [];

    /**
     * Position of the plugin
     * @private
     * @type {string}
     */
    this.position_ = options.position || 'TR';

    /**
     * This parameter set if the plugin is collapsed
     * @private
     * @type {boolean}
     */
    this.collapsed_ = options.collapsed === true;

    /**
     * Metadata from api.json
     * @private
     * @type {Object}
     */
    this.metadata_ = api.metadata;

    /**
     * Plugin tooltip
     *
     * @private
     * @type {string}
     */
    this.tooltip_ = options.tooltip || getValue('tooltip');

    /**
    * JSON HTML
    *
    * @private
    * @type {string}
    */
    this.content_ = options.content || {};

    /**
       * Delay auto move scroll
       *
       * @private
       * @type {string}
       */
    this.delay = options.delay || 2000;

    /**
      * collapsible panel
      *
      * @private
      * @type {string}
      */
    this.collapsible = options.collapsible || false;

    /**
     * Content of index
     * @private
     * @type {Object}
     */
    this.indexInContent = options.indexInContent || false;
  }

  /**
   * Return plugin language
   *
   * @public
   * @function
   * @param {string} lang type language
   * @api stable
   */
  static getJSONTranslations(lang) {
    if (lang === 'en' || lang === 'es') {
      return (lang === 'en') ? en : es;
    }
    return M.language.getTranslation(lang).historymap;
  }

  /**
   * This function adds this plugin into the map
   *
   * @public
   * @function
   * @param {M.Map} map the map to add the plugin
   * @api stable
   */
  addTo(map) {
    // TO DO Parametrizar indice y poner que sea un max de x minimo
    this.control = new HistoryMapControl(
      this.content_[M.language.getLang()],
      this.delay, this.indexInContent,
    );
    this.map_ = map;
    window.map = map;
    window.mapjs = map;

    this.panel_ = new M.ui.Panel('panelHistoryMap', {
      collapsible: this.collapsible,
      position: M.ui.position[this.position_],
      collapsedButtonClass: 'icon-capas2',
      className: 'm-plugin-historymap',
      tooltip: this.tooltip_,
      collapsed: this.collapsed_,
    });
    this.panel_.addControls([this.control]);
    map.addPanels(this.panel_);

    // No funciona en el cervantes
    // map.on(M.evt.ADDED_LAYER, () => {
    //   this.control.render();
    // });

    // map.on(M.evt.COMPLETED, () => {
    //   this.control.render();
    // });
  }

  /**
   * This function returns the position
   *
   * @public
   * @return {string}
   * @api
   */
  get position() {
    return this.position_;
  }

  /**
   * Name of the plugin
   *
   * @getter
   * @function
   */
  get name() {
    return 'historymap';
  }

  /**
   * Collapsed parameter
   *
   * @getter
   * @function
   */
  get collapsed() {
    return this.panel_.isCollapsed();
  }

  /**
   * Get the API REST Parameters of the plugin
   *
   * @function
   * @public
   * @api
   */
  getAPIRest() {
    return `${this.name}=${this.position}*${this.collapsed}`;
  }

  /**
   * This function compares plugins
   *
   * @public
   * @function
   * @param {M.Plugin} plugin to compare
   * @api
   */
  equals(plugin) {
    return plugin instanceof HistoryMap;
  }

  /**
   * This function gets metadata plugin
   *
   * @public
   * @function
   * @api stable
   */
  getMetadata() {
    return this.metadata_;
  }

  /**
   * This function destroys this plugin
   *
   * @public
   * @function
   * @api
   */
  destroy() {
    this.map_.removeControls(this.control);
    [this.map_, this.control, this.panel_] = [null, null, null];
  }
}
