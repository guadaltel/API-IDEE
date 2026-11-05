/**
 * @module IDEE/control/MapheaderControl
 */
import MapheaderImplControl from 'impl/mapheadercontrol';
import template from 'templates/mapheader';
import { getValue } from './i18n/language';

class MapheaderControl extends IDEE.Control {
  /**
   * @classdesc
   * Control de la cabecera HTML del mapa.
   *
   * @constructor
   * @extends {IDEE.Control}
   * @param {Object} options control options
   * @api
   */
  constructor(options = {}) {
    if (IDEE.utils.isUndefined(MapheaderImplControl)
      || (IDEE.utils.isObject(MapheaderImplControl)
      && IDEE.utils.isNullOrEmpty(Object.keys(MapheaderImplControl)))) {
      IDEE.exception(getValue('exception.impl'));
    }
    const impl = new MapheaderImplControl();
    super(MapheaderControl.NAME, impl, {
      tooltip: options.tooltip,
    });

    this.htmlCode = options.htmlCode || '';
    this.opened = options.open === true;
    this.cssList = IDEE.utils.isArray(options.cssList) ? options.cssList : [];
    this.injectedLinks = [];
    this.panelHeight = 0;
    this.panel_ = null;
    this.templateVars = { vars: { htmlCode: this.htmlCode } };

    this.injectCSS(this.cssList);
  }

  createView(map) {
    this.map_ = map;
    this.map = map;
    return new Promise((success) => {
      const html = IDEE.template.compileSync(template, this.templateVars);
      this.html_ = html;
      success(html);
    });
  }

  /**
   * Enlaza eventos SHOW/HIDE del CollapsiblePanel
   *
   * @public
   * @function
   * @param {IDEE.ui.panels.CollapsiblePanel} panel panel del plugin
   * @api
   */
  bindPanelEvents(panel) {
    this.panel_ = panel;
    this.updateButtonTitle();
    this.clearButtonInlineOffset();
    this.bindTestFormOffset();
    this.scheduleHeaderLayout();

    panel.on(IDEE.evt.SHOW, () => {
      this.opened = true;
      this.updateButtonTitle();
      this.clearButtonInlineOffset();
      this.scheduleHeaderLayout();
    });

    panel.on(IDEE.evt.HIDE, () => {
      this.opened = false;
      this.updateButtonTitle();
      this.clearButtonInlineOffset();
      this.scheduleHeaderLayout();
    });
  }

  /**
   * Si hay formulario de test encima del mapa, desplaza la cabecera
   * para no taparlo (mantiene fixed + 100vw).
   *
   * @private
   * @function
   */
  bindTestFormOffset() {
    this.onViewportResize_ = () => {
      this.scheduleHeaderLayout();
    };
    window.addEventListener('resize', this.onViewportResize_);
  }

  /**
   * Offset superior = altura del form de parámetros de test, si existe.
   *
   * @private
   * @function
   * @returns {number}
   */
  getTestFormOffset() {
    const form = document.querySelector('body > .m-api-idee-test-form-frame');
    if (!form) {
      return 0;
    }
    return Math.ceil(form.getBoundingClientRect().height);
  }

  /**
   * Aplica top al panel fixed para dejar el form de test encima.
   *
   * @private
   * @function
   */
  applyPanelTopOffset() {
    const panel = this.getPanelElement();
    if (!panel) {
      return;
    }
    const offset = this.getTestFormOffset();
    if (offset > 0) {
      panel.style.setProperty('top', `${offset}px`, 'important');
    } else {
      panel.style.removeProperty('top');
    }
  }

  scheduleHeaderLayout() {
    window.requestAnimationFrame(() => {
      this.checkHeaderheight();
    });
  }

  clearButtonInlineOffset() {
    const button = this.getPanelButton();
    if (button) {
      button.style.removeProperty('top');
      button.style.removeProperty('bottom');
    }
  }

  updateButtonTitle() {
    const btn = this.getPanelButton();
    if (btn) {
      const label = (this.opened ? getValue('hide') : getValue('show') || '').trim();
      btn.replaceChildren();
      const inner = document.createElement('span');
      inner.className = 'm-mapheader-btn-inner';
      const text = document.createElement('span');
      text.className = 'm-mapheader-btn-text';
      text.textContent = label;
      const icon = document.createElement('span');
      icon.className = 'm-mapheader-btn-icon g-cartografia-btn-mapheader-chevron';
      icon.setAttribute('aria-hidden', 'true');
      inner.append(text, icon);
      btn.append(inner);
      btn.title = this.opened ? getValue('hideheader') : getValue('showheader');
      btn.setAttribute('aria-label', btn.title);
    }
  }

  getPanelButton() {
    const panelEl = this.getPanelElement();
    return panelEl ? panelEl.querySelector('button.m-control-panel-btn') : null;
  }

  getPanelElement() {
    if (this.panel_ && this.panel_.element) {
      return this.panel_.element;
    }
    return document.querySelector('div.m-control-panel.m-plugin-mapheader');
  }

  getActivationButton() {
    return null;
  }

  equals(control) {
    return control instanceof MapheaderControl;
  }

  injectCSS(cssList) {
    cssList.forEach((cssFile) => {
      const link = document.createElement('link');
      link.href = cssFile;
      link.rel = 'stylesheet';
      link.media = 'screen';
      link.addEventListener('load', () => {
        this.checkHeaderheight();
      });
      document.getElementsByTagName('head')[0].appendChild(link);
      this.injectedLinks.push(link);
    });
  }

  checkHeaderheight() {
    this.applyPanelTopOffset();
    const panel = this.getPanelElement();
    if (panel) {
      this.panelHeight = panel.clientHeight;
    }
    this.setTopMargin(this.opened);
  }

  setTopMargin(opened) {
    const ph = this.panelHeight || 0;
    this.clearButtonInlineOffset();
    this.applyTopContainersMargin(opened, ph);
  }

  /**
   * Desplaza los contenedores superiores bajo la cabecera abierta.
   * Se aplica padding-top al contenedor (no margin a cada hijo): los
   * contenedores son flex column + wrap y un margen por hijo separaba
   * los botones y los repartía en varias columnas.
   *
   * @private
   * @function
   */
  applyTopContainersMargin(opened, ph) {
    // La pestaña Mostrar/Ocultar está a la izquierda: los contenedores de ese
    // lado reservan además su altura para que no tape el primer control.
    const tabHeight = this.getTabHeight();
    const containers = [
      { selector: '.m-api-idee-center-panel-top-left', tab: true },
      { selector: '.m-api-idee-left-buttons', tab: true },
      { selector: '.m-api-idee-center-panel-top-right', tab: false },
      { selector: '.m-api-idee-right-buttons', tab: false },
    ];

    containers.forEach(({ selector, tab }) => {
      const container = document.querySelector(selector);
      if (!container) {
        return;
      }
      let offset = opened ? ph : 0;
      if (tab && tabHeight > 0) {
        offset += tabHeight;
      }
      if (offset > 0) {
        container.style.setProperty('box-sizing', 'border-box', 'important');
        container.style.setProperty('padding-top', `${offset + 10}px`, 'important');
      } else {
        container.style.removeProperty('box-sizing');
        container.style.removeProperty('padding-top');
      }
    });
  }

  clearTopContainersPadding() {
    [
      '.m-api-idee-center-panel-top-left',
      '.m-api-idee-left-buttons',
      '.m-api-idee-center-panel-top-right',
      '.m-api-idee-right-buttons',
    ].forEach((selector) => {
      const container = document.querySelector(selector);
      if (container) {
        container.style.removeProperty('box-sizing');
        container.style.removeProperty('padding-top');
      }
    });
  }

  /**
   * Altura visible de la pestaña Mostrar/Ocultar (0 si no-collapsible).
   *
   * @private
   * @function
   * @returns {number}
   */
  getTabHeight() {
    const button = this.getPanelButton();
    if (!button) {
      return 0;
    }
    return Math.ceil(button.getBoundingClientRect().height);
  }

  destroy() {
    if (this.onViewportResize_) {
      window.removeEventListener('resize', this.onViewportResize_);
      this.onViewportResize_ = null;
    }
    const panel = this.getPanelElement();
    if (panel) {
      panel.style.removeProperty('top');
    }
    this.clearTopContainersPadding();
    this.injectedLinks.forEach((link) => {
      if (link && link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
    this.injectedLinks = [];
    this.panel_ = null;
    this.html_ = null;
    this.map = null;
  }
}

MapheaderControl.NAME = 'Mapheader';
export default MapheaderControl;
