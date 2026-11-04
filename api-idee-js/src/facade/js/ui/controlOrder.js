/**
 * @module IDEE/ui/controlOrder
 */

/**
 * Orden visual por defecto (propiedad CSS flex `order`) de los controles nativos
 * dentro de cada zona del mapa. Valores más bajos aparecen antes en columnas
 * con `justify-content: flex-start` (arriba) y más arriba en el bloque inferior
 * cuando la zona usa `justify-content: flex-end`. En la zona `down` (fila con
 * `justify-content: flex-end`) valores más bajos quedan a la izquierda del grupo
 * derecho y más altos a la derecha.
 *
 * @private
 * @type {Readonly<Record<string, number>>}
 */
const DEFAULT_ORDER_BY_CONTROL = Object.freeze({
  panzoom: 0,
  panzoombar: 1,
  rotate: 2,
  measurebar: 3,
  backgroundlayers: 0,
  getfeatureinfo: 1,
  implementationswitcher: 2,
  timeline: 3,
  location: 4,
  attributions: 5,
  overviewmap: 6,
  scaleline: 0,
  wmcselector: 1,
  scale: 2,
});

/**
 * Devuelve el orden por defecto de un control nativo del visor.
 *
 * @public
 * @function
 * @param {string} controlName Nombre del control (`IDEE.control.*.NAME`).
 * @returns {number|undefined} Orden sugerido o `undefined` si no hay valor definido.
 * @api
 */
export const getDefaultOrder = (controlName) => {
  if (typeof controlName !== 'string') {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(DEFAULT_ORDER_BY_CONTROL, controlName)) {
    return DEFAULT_ORDER_BY_CONTROL[controlName];
  }
  return undefined;
};

export default getDefaultOrder;
