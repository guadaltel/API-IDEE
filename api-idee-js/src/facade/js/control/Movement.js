/**
 * @module IDEE/control/Movement
 */
import MovementImpl from 'impl/control/Movement';
import movementTemplate from 'templates/movement';
import myhelp from 'templates/movementhelp';
import 'assets/css/controls/movement';
import { getValue } from '../i18n/language';
import ControlBase from './Control';
import { isUndefined, isNullOrEmpty, isObject } from '../util/Utils';
import Exception from '../exception/exception';
import { compileSync as compileTemplate } from '../util/Template';

/**
 * @classdesc
 * Control de movimiento 3D.
 *
 * @api
 * @extends {IDEE.Control}
 */
class Movement extends ControlBase {
  /**
   * Constructor principal de la clase. Crea un control de movimiento 3D.
   *
   * @constructor
   * @api
   */
  constructor(options = {}) {
    if (isUndefined(MovementImpl) || (isObject(MovementImpl)
      && isNullOrEmpty(Object.keys(MovementImpl)))) {
      Exception(getValue('exception').movement_method);
    }

    // implementation of this control
    const impl = new MovementImpl(options);

    // calls the super constructor
    super(impl, Movement.NAME);
  }

  /**
   * Esta función crea la vista del mapa especificado.
   *
   * @public
   * @function
   * @param {IDEE.Map} map Mapa
   * @returns {Promise} Plantilla HTML.
   * @api
   */
  createView(map) {
    return compileTemplate(movementTemplate, {
      vars: {
        title: getValue('movement').title,
        title_help: getValue('movement').title_help,
      },
    });
  }

  /**
   * Obtiene la ayuda del control
   *
   * @function
   * @public
   * @api
  */
  getHelp() {
    const textHelp = getValue('movement').textHelp;
    return {
      title: Movement.NAME,
      content: new Promise((success) => {
        const html = compileTemplate(myhelp, {
          vars: {
            urlImages: 'https://componentes.idee.es/estaticos/imagenes/controles',
            translations: {
              help1: textHelp.text1,
              help2: textHelp.text2,
              help3: textHelp.text3,
              help4: textHelp.text4,
              help5: textHelp.text5,
              help6: textHelp.text6,
            },
          },
        });
        success(html);
      }),
    };
  }

  /**
   * Esta función comprueba si un objeto es igual
   * a este control.
   *
   * @public
   * @function
   * @param {Object} obj Objeto a comparar.
   * @returns {boolean} Iguales devuelve verdadero, falso si no son iguales.
   * @api
   */
  equals(obj) {
    const equals = (obj instanceof Movement);
    return equals;
  }
}

/**
 * Nombre para identificar este control.
 * @const
 * @type {string}
 * @public
 * @api
 */
Movement.NAME = 'movement';

export default Movement;
