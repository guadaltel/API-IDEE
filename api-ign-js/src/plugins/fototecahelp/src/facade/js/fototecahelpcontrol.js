/**
 * @module M/control/FototecaHelpControl
 */

import FototecaHelpImplControl from 'impl/fototecahelpcontrol';
import template from 'templates/fototecahelp';

export default class FototecaHelpControl extends M.Control {
  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor(helpLink, contactEmail) {
    if (M.utils.isUndefined(FototecaHelpImplControl)) {
      M.exception('La implementación usada no puede crear controles FototecaHelpControl');
    }
    const impl = new FototecaHelpImplControl();
    super(impl, 'FototecaHelp');

    /**
     * Help documentation link.
     * @private
     * @type {String}
     */
    this.helpLink_ = helpLink;

    /**
     * Contact email
     * @private
     * @type {String}
     */
    this.contactEmail_ = contactEmail;
  }

  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
  createView(map) {
    return new Promise((success, fail) => {
      const html = M.template.compileSync(template, {
        vars: {
          helpLink: this.helpLink_,
          contactEmail: this.contactEmail_,
        },
      });
      success(html);
    });
  }

  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {M.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof FototecaHelpControl;
  }
}