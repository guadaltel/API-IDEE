/* eslint-disable no-console */
/**
 * @module M/control/MapheaderControl
 */

import MapheaderImplControl from 'impl/mapheadercontrol';
import template from 'templates/mapheader';

export default class MapheaderControl extends IDEE.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {IDEE.Control}
   * @api stable
   */
  constructor(config) {
    // 1. checks if the implementation can create PluginControl
    if (IDEE.utils.isUndefined(MapheaderImplControl)) {
      IDEE.exception('La implementación usada no puede crear controles MapheaderControl');
    }
    // 2. implementation of this control
    const impl = new MapheaderImplControl();
    super(impl, 'Mapheader');

    this.config = config;
    this.htmlCode = this.config.htmlCode;
    this.cssList = (IDEE.utils.isArray(this.config.cssList) ? this.config.cssList : this.config.cssList.split(',')).map((s) => s.trim());
    this.injectCSS(this.cssList);
    this.templateVars = { vars: { htmlCode: this.htmlCode } };
  }

  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {IDEE.Map} map to add the control
   * @api stable
   */
  createView(map) {
    return new Promise((success, fail) => {
      const html = IDEE.template.compileSync(template, this.templateVars);
      this.addEvents();
      success(html);
    });
  }

  /**
   * This function is called on the control activation
   *
   * @public
   * @function
   * @api stable
   */
  activate() {
    // calls super to manage de/activation
    super.activate();
  }

  /**
   * This function is called on the control deactivation
   *
   * @public
   * @function
   * @api stable
   */
  deactivate() {
    // calls super to manage de/activation
    super.deactivate();
  }

  /**
   * This function gets activation button
   *
   * @public
   * @function
   * @param {HTML} html of control
   * @api stable
   */
  getActivationButton(html) {
    return html.querySelector('.m-mapheader button');
  }

  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {IDEE.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof MapheaderControl;
  }

  // Add your own functions
  injectCSS(cssList) {
    for (let index = 0; index < cssList.length; index += 1) {
      const cssFile = cssList[index];
      const link = document.createElement('link');
      link.href = cssFile;
      link.rel = 'stylesheet';
      link.addEventListener('load', () => {
        this.checkHeaderheight();
      });
      link.media = 'screen';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }

  addEvents() {
    // Esperamos a que el DOM esté listo con los elementos del panel
    setTimeout(() => {
      this.panelHeight = this.checkHeaderheight();
      // Selectores de Elementos
      const btnMapHeaderClosed = document.querySelectorAll('button.m-panel-btn.g-cartografia-flecha-abajo')[0];
      const btnMapHeaderOpened = document.querySelectorAll('button.m-panel-btn.g-cartografia-flecha-derecha')[0];

      if (btnMapHeaderOpened) {
        btnMapHeaderOpened.title = 'Ocultar cabecera de página';
      }
      if (btnMapHeaderClosed) {
        btnMapHeaderClosed.title = 'Ocultar cabecera de página';
        // EventListener
        btnMapHeaderClosed.addEventListener('click', (e) => {
          const btnMapHeaderOpened2 = document.querySelectorAll('button.m-panel-btn.g-cartografia-flecha-derecha')[0];
          if (e.target.parentElement.classList.contains('opened')) {
            if (btnMapHeaderOpened2) {
              btnMapHeaderOpened2.title = 'Ocultar cabecera de página';
            }
            btnMapHeaderClosed.title = 'Ocultar cabecera de página';
            this.opened = true;
            this.checkHeaderheight();
            this.setTopMargin(this.opened);
          } else {
            if (btnMapHeaderOpened2) {
              btnMapHeaderOpened2.title = 'Mostrar cabecera de página';
            }
            btnMapHeaderClosed.title = 'Mostrar cabecera de página';
            this.opened = false;
            this.checkHeaderheight();
            this.setTopMargin(this.opened);
          }
        });
      }
    }, 0);
  }

  checkHeaderheight() {
    let bottomElements = document.querySelectorAll('div.m-top');
    if (document.querySelectorAll('div.m-panel.m-mapheader').length > 0) {
      this.panelHeight = document.querySelectorAll('div.m-panel.m-mapheader')[0].clientHeight;
      const button = document.querySelectorAll('div.m-panel.m-mapheader>button')[0];
      if (button) {
        button.style.setProperty('top', `${this.panelHeight}px`, 'important');
      }
    }
    for (let index = 0; index < bottomElements.length; index += 1) {
      const element = bottomElements[index];
      if (element.classList.contains('m-left')) {
        element.style.marginTop = `${this.panelHeight + 30}px`;
      }
    }
    bottomElements = document.querySelectorAll('div.m-top.m-right')[0].childNodes;

    for (let index = 0; index < bottomElements.length; index += 1) {
      const element = bottomElements[index];
      if (!element.classList.contains('m-mapheader')) {
        element.style.setProperty('margin-top', `${this.panelHeight + 10}px`, 'important');
      }
    }
  }

  setTopMargin(opened) {
    let bottomElements = document.querySelectorAll('div.m-top');
    for (let index = 0; index < bottomElements.length; index += 1) {
      const element = bottomElements[index];
      if (element.classList.contains('m-left')) {
        if (opened) {
          element.style.marginTop = `${this.panelHeight + 30}px`;
        } else {
          element.style.marginTop = '30px';
        }
      }
    }
    bottomElements = document.querySelectorAll('div.m-top.m-right')[0].childNodes;
    for (let index = 0; index < bottomElements.length; index += 1) {
      const element = bottomElements[index];
      if (!element.classList.contains('m-mapheader')) {
        if (opened) {
          element.style.setProperty('margin-top', `${this.panelHeight + 10}px`, 'important');
          document.getElementById('div-contenedor').style.display = 'block';
        } else {
          element.style.setProperty('margin-top', '10px', 'important');
          document.getElementById('div-contenedor').style.display = 'none';
        }
      }
    }
  }
}
