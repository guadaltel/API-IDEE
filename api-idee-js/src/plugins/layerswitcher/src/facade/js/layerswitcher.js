/**
 * @module IDEE/plugin/Layerswitcher
 */

import '../assets/css/layerswitcher';
import '../assets/css/fonts';
import '../assets/css/animations';
import LayerswitcherControl from './layerswitchercontrol';
import api from '../../api';
import { getValue } from './i18n/language';
import myhelp from '../../templates/myhelp';

import es from './i18n/es';
import en from './i18n/en';

export default class Layerswitcher extends IDEE.Plugin {
  constructor(options = {}) {
    super('layerswitcher', {
      position: options.position || 'right',
      tooltip: options.tooltip || getValue('tooltip'),
      order: options.order,
    });

    /**
     * Plugin parameters
     * @public
     * @type {object}
     */
    this.options = options;

    /**
     * Min panel width
     * @private
     * @type {number}
     */
    this.minPanelWidth = 360;

    /**
     * Option to allow the plugin to be collapsed or not
     * @public
     * @type {Boolean}
     */
    this.collapsed_ = !IDEE.utils.isUndefined(options.collapsed) ? options.collapsed : true;

    /**
     * Option to allow the plugin to drag and drop layers
     * @public
     * @type {Boolean}
     */
    this.isMoveLayers = options.isMoveLayers ?? false;

    /**
     * Option to allow the plugin to select layers with eyes or checkboxes
     * @public
     * @type {string}
     */
    this.modeSelectLayers = IDEE.utils.isUndefined(options.modeSelectLayers) ? 'eyes' : options.modeSelectLayers;

    /**
     * Tools to show in the plugin for each layer
     * @public
     * @type {Array}
     */
    this.tools = IDEE.utils.isUndefined(options.tools) ? ['transparency', 'legend', 'zoom', 'information', 'style', 'delete'] : options.tools;

    /**
     * Option to allow the ability add layers from the catalog of the plugin
     * @public
     * @type {Boolean}
     */
    this.addLayers = options.addLayers;

    /**
     * Option to allow the ability to show/hide all layers
     * @public
     * @type {Boolean}
     */
    this.statusLayers = options.statusLayers;

    /**
     * Catálogo de servicios precargados. Puede ser un objeto, una cadena JSON,
     * una cadena JSON codificada en base64 o una URL a un fichero JSON.
     * Si no se informa, se usa la URL definida en configuración (LIST_PRECHARGED_URL).
     * @public
     * @type {Object|String}
     */
    let { precharged } = options;
    if (typeof precharged === 'string' && !IDEE.utils.isUrl(precharged.trim())) {
      try {
        precharged = JSON.parse(precharged);
      } catch (e) {
        try {
          precharged = IDEE.utils.decodeBase64(precharged);
        } catch (err) {
          IDEE.dialog.error(getValue('exception.errorPrecharged'), 'Layerswitcher.precharged');
          precharged = undefined;
        }
      }
    } else if (typeof precharged === 'string') {
      precharged = precharged.trim();
    }
    const isEmpty = IDEE.utils.isNullOrEmpty(precharged)
      || (IDEE.utils.isObject(precharged) && Object.keys(precharged).length === 0);
    this.precharged = isEmpty ? IDEE.config.LIST_PRECHARGED_URL : precharged;

    /**
     * URL del JSON de capas precargadas (si precharged se ha indicado como URL)
     * @private
     * @type {String}
     */
    this.prechargedUrl_ = IDEE.utils.isUrl(this.precharged) ? this.precharged : undefined;
    this.loadPrecharged_();

    /**
     * Option to show or not the label of the layers in the plugin
     * @public
     * @type {Boolean}
     */
    this.displayLabel = !IDEE.utils.isUndefined(options.displayLabel)
      ? options.displayLabel : false;

    /**
     * Metadata from api.json
     * @private
     * @type {Object}
     */
    this.metadata_ = api.metadata;

    /**
     * Option to allow the load of http services
     * @public
     * @type {Boolean}
     */
    this.http = true;
    if (options.http !== undefined && (options.http === false || options.http === 'false')) {
      this.http = false;
    }

    /**
     * Option to allow the load of https services. If null all services are allowed
     * @public
     * @type {Boolean}
     */
    this.https = true;
    if (options.https !== undefined && (options.https === false || options.https === 'false')) {
      this.https = false;
    }

    /**
     * Option to allow the load of layers from the catalog of the plugin
     * @public
     * @type {Boolean}
     */
    this.showCatalog = options.showCatalog || false;

    /**
     * Option to allow the use of proxy in the plugin
     * @public
     * @type {Boolean}
     */
    this.useProxy = IDEE.utils.isUndefined(options.useProxy) ? IDEE.useproxy : options.useProxy;

    /**
     * Initial status of the proxy
     * @private
     * @type {Boolean}
     */
    this.statusProxy = IDEE.useproxy;

    /**
     * Option to allow the use of attributions in the plugin
     * @public
     * @type {Boolean}
     */
    this.useAttributions = options.useAttributions || false;
  }

  // Devuelve el idioma del plugin
  static getJSONTranslations(lang) {
    if (lang === 'en' || lang === 'es') {
      return (lang === 'en') ? en : es;
    }
    return IDEE.language.getTranslation(lang).layerswitcher;
  }

  // Esta función añade el plugin al mapa
  addTo(map) {
    this.map = map;

    this.button = new IDEE.ui.buttons.SidePanelButton(this.name, {
      position: this.position,
      tooltip: this.tooltip,
      svgPath: 'https://componentes.idee.es/estaticos/Simbologia/svg/icons_cota/icn_capas.svg',
      order: this.order,
    });
    map.addButtons(this.button);

    this.panel = new IDEE.ui.panels.PluginSidePanel(this.name, {
      tooltip: this.tooltip,
      position: this.position,
      minWidth: this.minPanelWidth,
      maxWidth: this.maxPanelWidth,
      className: 'm-plugin-layerswitcher',
      collapsed: this.collapsed_,
      collapsedButtonClass: 'm-layerswitcher-icons-layers',
      order: this.order,
    });

    this.controls.push(new LayerswitcherControl({
      modeSelectLayers: this.modeSelectLayers,
      tools: this.tools,
      addLayers: this.addLayers,
      statusLayers: this.statusLayers,
      collapsed: this.collapsed_,
      isMoveLayers: this.isMoveLayers,
      precharged: this.precharged,
      http: this.http,
      https: this.https,
      showCatalog: this.showCatalog,
      order: this.order,
      useProxy: this.useProxy,
      statusProxy: this.statusProxy,
      useAttributions: this.useAttributions,
      displayLabel: this.displayLabel,
    }));

    this.controls[0].on(IDEE.evt.ADDED_TO_MAP, () => {
      this.fire(IDEE.evt.ADDED_TO_MAP);
    });

    this.panel.addControls(this.controls);

    this.button.panel = this.panel;
    this.panel.button = this.button;

    map.addPanels(this.panel);
    this.controls[0].addEventPanel(this.panel);
  }

  /**
   * Carga el catálogo precargado desde una URL JSON.
   * @private
   */
  loadPrecharged_() {
    if (!IDEE.utils.isUrl(this.precharged)) {
      return;
    }
    window.fetch(this.precharged)
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.json();
      })
      .then((data) => {
        if (!data || !IDEE.utils.isObject(data)) {
          throw new Error('invalid json');
        }
        this.setPrecharged_(data);
      })
      .catch(() => {
        this.setPrecharged_({});
        IDEE.dialog.error(getValue('exception.errorPrechargedUrl'), 'Layerswitcher.precharged');
      });
  }

  /**
   * Actualiza el catálogo precargado en el plugin y en su control.
   * @private
   */
  setPrecharged_(precharged) {
    this.precharged = precharged;
    if (this.controls && this.controls[0]) {
      this.controls[0].precharged = precharged;
    }
  }

  // Devuelve la cadena API-REST del plugin
  getAPIRest() {
    const precharged = this.prechargedUrl_ || JSON.stringify(this.precharged);
    return `${this.name}=${this.position}*${this.collapsed_}*${this.order}*${this.tooltip}*${this.isMoveLayers}*${this.modeSelectLayers}*${this.tools}*${this.http}*${this.https}*${this.showCatalog}*${this.useProxy}*${this.addLayers}*${this.statusLayers}*${this.displayLabel}*${this.useAttributions}*${precharged}`;
  }

  // Devuelve la cadena API-REST del plugin en base64
  getAPIRestBase64() {
    return `${this.name}=base64=${IDEE.utils.encodeBase64(this.options)}`;
  }

  // Esta función devuelve los metadatos del plugin
  getMetadata() {
    return this.metadata_;
  }

  getPanel() {
    return this.panel;
  }

  // Esta función elimina el plugin del mapa
  destroy() {
    this.map.removeButton(this.button);
    this.map.removePanel(this.panel);
  }

  // Esta función devuelve si el plugin recibido por parámetro es instancia de Layerswitcher
  equals(plugin) {
    return plugin instanceof Layerswitcher;
  }

  /**
   * Obtiene la ayuda del plugin
   *
   * @function
   * @public
   * @api
   */
  getHelp() {
    return {
      title: this.name,
      content: new Promise((success) => {
        const html = IDEE.template.compileSync(myhelp, {
          vars: {
            urlImages: `${IDEE.config.API_IDEE_URL}plugins/layerswitcher/images/`,
            translations: {
              help1: getValue('textHelp.help1'),
              help2: getValue('textHelp.help2'),
              help3: getValue('textHelp.help3'),
              help4: getValue('textHelp.help4'),
              help5: getValue('textHelp.help5'),
              help6: getValue('textHelp.help6'),
              help7: getValue('textHelp.help7'),
              help8: getValue('textHelp.help8'),
              help9: getValue('textHelp.help9'),
              help10: getValue('textHelp.help10'),
              help11: getValue('textHelp.help11'),
              help12: getValue('textHelp.help12'),
              help13: getValue('textHelp.help13'),
              help14: getValue('textHelp.help14'),
              help15: getValue('textHelp.help15'),
              help16: getValue('textHelp.help16'),
              help17: getValue('textHelp.help17'),
              help18: getValue('textHelp.help18'),
              help19: getValue('textHelp.help19'),
              help20: getValue('textHelp.help20'),
            },
          },
        });
        success(html);
      }),
    };
  }
}
