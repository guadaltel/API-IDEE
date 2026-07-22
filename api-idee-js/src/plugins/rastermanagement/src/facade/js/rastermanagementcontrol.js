/**
 * @module IDEE/control/RasterManagementControl
 */

import RasterManagementImplControl from 'impl/rastermanagementcontrol';
import template from 'templates/rastermanagement';
import { getValue } from './i18n/language';

export default class RasterManagementControl extends IDEE.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {IDEE.Control}
   * @api stable
   */
  constructor(values) {
    // 1. checks if the implementation can create PluginControl
    if (IDEE.utils.isUndefined(RasterManagementImplControl)
      || (IDEE.utils.isObject(RasterManagementImplControl)
      && IDEE.utils.isNullOrEmpty(Object.keys(RasterManagementImplControl)))) {
      IDEE.exception(getValue('exception.impl'));
    }
    // 2. implementation of this control
    const impl = new RasterManagementImplControl();
    super(impl, 'RasterManagement');

    /**
     * Template
     * @public
     * @type { HTMLElement }
     */
    this.template = null;

    /**
     *@private
     *@type { Number }
     */
    this.order = values.order >= -1 ? values.order : null;
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
    this.map = map;
    return new Promise((success, fail) => {
      const html = IDEE.template.compileSync(template, {
        vars: {
          title: getValue('title'),
        },
      });
      this.accessibilityTab(html);
      this.html = html;

      success(html);
    });
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
    return control instanceof RasterManagementControl;
  }

  accessibilityTab(html) {
    html.querySelectorAll('[tabindex="0"]').forEach((el) => el.setAttribute('tabindex', this.order));
  }
}
