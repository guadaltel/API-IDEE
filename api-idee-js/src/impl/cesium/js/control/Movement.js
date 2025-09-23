/**
 * @module IDEE/impl/control/Movement
 */
import {
  Cartesian3,
  Rectangle,
  Math as CesiumMath,
  Cartesian2,
  SceneMode,
  Transforms,
  defined,
  Matrix4,
  getTimestamp,
} from 'cesium';
import { isUndefined } from 'IDEE/util/Utils';
import Control from './Control';
import ImplUtils from '../util/Utils';

/**
 *  @classdesc
 *  Control de movimiento 3D.
 *  @api
 */
class Movement extends Control {
  /**
   * Constructor principal de la clase.
   *
   * @constructor
   * @param {Object} options Opciones del control.
   * - viewInitial: Vista inicial.
   * @api stable
   */
  constructor(options = {}) {
    super();

    this.viewInitial = options.viewInitial;

    this.handleExteriorMouseDown = (e) => this.handleMouseDown('exterior', e);
    this.handleGiroscopioMouseDown = (e) => this.handleMouseDown('giroscopio', e);
    this.handleResetView = this.resetView.bind(this);
    this.handleClickHelp = this.handleClickHelp.bind(this);

    this.isOrbiting = false;
    this.orbitMouseMoveFunction = undefined;
    this.orbitMouseUpFunction = undefined;
    this.orbitTickFunction = undefined;
    this.orbitLastTimestamp = 0;
    this.orbitFrame = undefined;
    this.orbitIsLook = false;
    this.orbitCursorAngle = 0;
    this.orbitCursorOpacity = 0.0;

    this.rotateMouseMoveFunction = undefined;
    this.rotateMouseUpFunction = undefined;
    this.isRotating = false;
    this.rotateInitialCursorAngle = undefined;
    this.rotateFrame = undefined;
    this.rotateIsLook = false;

    this.vectorScratch = new Cartesian2();
    this.newTransformScratch = new Matrix4();
    this.oldTransformScratch = new Matrix4();
  }

  /**
   * Este método añade el control al mapa.
   *
   * @public
   * @function
   * @param {IDEE.Map} map Map.
   * @param {function} template Plantilla del control.
   * @api stable
   */
  addTo(map, element) {
    super.addTo(map, element);

    // panel
    this.panel = element;

    const scene = this.facadeMap_.getMapImpl().scene;

    const saveInitialPosition = () => {
      if (isUndefined(this.viewInitial)) {
        this.position = Cartesian3.clone(scene.camera.position);
      } else {
        this.position = Rectangle.fromDegrees(
          this.viewInitial[0],
          this.viewInitial[1],
          this.viewInitial[2],
          this.viewInitial[3],
        );
      }
      scene.postRender.removeEventListener(saveInitialPosition);
    };
    scene.postRender.addEventListener(saveInitialPosition);

    // Registro eventos
    this.svgExterior = this.panel.querySelector('.m-movement-exterior-svg');
    this.svgGiroscopio = this.panel.querySelector('.m-movement-giroscopio-svg');

    this.svgExterior.addEventListener('mousedown', this.handleExteriorMouseDown);
    this.svgGiroscopio.addEventListener('mousedown', this.handleGiroscopioMouseDown);

    this.panel.querySelector('#m-movement-giroscopio').addEventListener('dblclick', this.handleResetView);
    this.panel.querySelector('#m-movement-help').addEventListener('click', this.handleClickHelp);
  }

  /**
   * Manejador del evento "mousedown".
   *
   * @function
   * @public
   * @param {string} name Nombre del elemento pulsado.
   * @param {MouseEvent} e Evento.
   * @api
   */
  handleMouseDown(name, e) {
    const compassElement = e.currentTarget;
    const compassRectangle = e.currentTarget.getBoundingClientRect();
    const center = new Cartesian2(
      (compassRectangle.right - compassRectangle.left) / 2.0,
      (compassRectangle.bottom - compassRectangle.top) / 2.0,
    );
    const clickLocation = new Cartesian2(
      e.clientX - compassRectangle.left,
      e.clientY - compassRectangle.top,
    );
    const vector = Cartesian2.subtract(clickLocation, center, new Cartesian2());

    if (name === 'giroscopio') {
      this.orbit(compassElement, vector);
    } else if (name === 'exterior') {
      this.rotate(compassElement, vector);
    } else {
      return true;
    }
  }

  /**
   * Función auxiliar que añade los eventos necesarios para inclinar
   * la vista al seleccionar el usuario el círculo interior y arrastrar
   * a cualquier lado.
   *
   * @function
   * @public
   * @param {HTMLElement} compassElement Elemento que disparó el evento.
   * @param {Cartesian2} cursorVector Vector desde el centro del elemento
   * hasta el punto de clic.
   * @api
   */
  orbit(compassElement, cursorVector) {
    const scene = this.facadeMap_.getMapImpl().scene;
    const sscc = scene.screenSpaceCameraController;

    if (!sscc.enableInputs) {
      return;
    }

    if (scene.mode === SceneMode.SCENE3D && (!sscc.enableTilt || !sscc.enableRotate)) {
      return;
    }

    document.removeEventListener('mousemove', this.orbitMouseMoveFunction, false);
    document.removeEventListener('mouseup', this.orbitMouseUpFunction, false);

    if (defined(this.orbitTickFunction)) {
      this.facadeMap_.getMapImpl().clock.onTick.removeEventListener(this.orbitTickFunction);
    }

    this.orbitMouseMoveFunction = undefined;
    this.orbitMouseUpFunction = undefined;
    this.orbitTickFunction = undefined;

    this.isOrbiting = true;
    this.orbitLastTimestamp = getTimestamp();

    const camera = scene.camera;

    const centerCamera = ImplUtils.getCameraFocus(this.facadeMap_.getMapImpl(), true);

    if (!defined(centerCamera)) {
      this.orbitFrame = Transforms.eastNorthUpToFixedFrame(
        camera.positionWC,
        scene.globe.ellipsoid,
        this.newTransformScratch,
      );
      this.orbitIsLook = true;
    } else {
      this.orbitFrame = Transforms.eastNorthUpToFixedFrame(
        centerCamera,
        scene.globe.ellipsoid,
        this.newTransformScratch,
      );
      this.orbitIsLook = false;
    }

    this.orbitTickFunction = (e) => {
      const timestamp = getTimestamp();
      const deltaT = timestamp - this.orbitLastTimestamp;
      const rate = ((this.orbitCursorOpacity - 0.5) * 2.5) / 1000;
      const distance = deltaT * rate;

      const angle = this.orbitCursorAngle + CesiumMath.PI_OVER_TWO;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      let oldTransform;

      if (defined(this.orbitFrame)) {
        oldTransform = Matrix4.clone(camera.transform, this.oldTransformScratch);

        camera.lookAtTransform(this.orbitFrame);
      }

      if (this.orbitIsLook) {
        camera.look(Cartesian3.UNIT_Z, -x);
        camera.look(camera.right, -y);
      } else {
        camera.rotateLeft(x);
        camera.rotateUp(y);
      }

      if (defined(this.orbitFrame)) {
        camera.lookAtTransform(oldTransform);
      }

      this.orbitLastTimestamp = timestamp;
    };

    const updateAngleAndOpacity = (vector, compassWidth) => {
      const angle = Math.atan2(-vector.y, vector.x);
      this.orbitCursorAngle = CesiumMath.zeroToTwoPi(angle - CesiumMath.PI_OVER_TWO);

      const distance = Cartesian2.magnitude(vector);
      const maxDistance = compassWidth / 2.0;
      const distanceFraction = Math.min(distance / maxDistance, 1.0);
      const easedOpacity = 0.5 * distanceFraction * distanceFraction + 0.5;
      this.orbitCursorOpacity = easedOpacity;
    };

    this.orbitMouseMoveFunction = (e) => {
      const compassRectangle = compassElement.getBoundingClientRect();
      const center = new Cartesian2(
        (compassRectangle.right - compassRectangle.left) / 2.0,
        (compassRectangle.bottom - compassRectangle.top) / 2.0,
      );
      const clickLocation = new Cartesian2(
        e.clientX - compassRectangle.left,
        e.clientY - compassRectangle.top,
      );
      const vector = Cartesian2.subtract(clickLocation, center, this.vectorScratch);
      updateAngleAndOpacity(vector, compassRectangle.width);
    };

    this.orbitMouseUpFunction = (e) => {
      this.isOrbiting = false;
      document.removeEventListener('mousemove', this.orbitMouseMoveFunction, false);
      document.removeEventListener('mouseup', this.orbitMouseUpFunction, false);

      if (defined(this.orbitTickFunction)) {
        this.facadeMap_.getMapImpl().clock.onTick.removeEventListener(this.orbitTickFunction);
      }

      this.orbitMouseMoveFunction = undefined;
      this.orbitMouseUpFunction = undefined;
      this.orbitTickFunction = undefined;
    };

    document.addEventListener('mousemove', this.orbitMouseMoveFunction, false);
    document.addEventListener('mouseup', this.orbitMouseUpFunction, false);
    this.facadeMap_.getMapImpl().clock.onTick.addEventListener(this.orbitTickFunction);

    updateAngleAndOpacity(cursorVector, compassElement.getBoundingClientRect().width);
  }

  /**
   * Función auxiliar que añade los eventos necesarios para girar
   * la vista al rotar el usuario el anillo exterior.
   *
   * @function
   * @public
   * @param {HTMLElement} compassElement Elemento que disparó el evento.
   * @param {Cartesian2} cursorVector Vector desde el centro del elemento
   * hasta el punto de clic.
   * @api
   */
  rotate(compassElement, cursorVector) {
    const scene = this.facadeMap_.getMapImpl().scene;
    const camera = scene.camera;

    const sscc = scene.screenSpaceCameraController;
    if (!sscc.enableInputs) {
      return;
    }

    if (!sscc.enableLook && (scene.mode === SceneMode.SCENE3D && !sscc.enableRotate)) {
      return;
    }

    document.removeEventListener('mousemove', this.rotateMouseMoveFunction, false);
    document.removeEventListener('mouseup', this.rotateMouseUpFunction, false);

    this.rotateMouseMoveFunction = undefined;
    this.rotateMouseUpFunction = undefined;

    this.isRotating = true;
    this.rotateInitialCursorAngle = Math.atan2(-cursorVector.y, cursorVector.x);

    const viewCenter = ImplUtils.getCameraFocus(this.facadeMap_.getMapImpl(), true);

    if (!defined(viewCenter)) {
      this.rotateFrame = Transforms.eastNorthUpToFixedFrame(
        camera.positionWC,
        scene.globe.ellipsoid,
        this.newTransformScratch,
      );
      this.rotateIsLook = true;
    } else {
      this.rotateFrame = Transforms.eastNorthUpToFixedFrame(
        viewCenter,
        scene.globe.ellipsoid,
        this.newTransformScratch,
      );
      this.rotateIsLook = false;
    }

    let oldTransform;
    if (defined(this.rotateFrame)) {
      oldTransform = Matrix4.clone(camera.transform, this.oldTransformScratch);
      camera.lookAtTransform(this.rotateFrame);
    }

    this.rotateInitialCameraAngle = -camera.heading;

    if (defined(this.rotateFrame)) {
      camera.lookAtTransform(oldTransform);
    }

    this.rotateMouseMoveFunction = (e) => {
      const compassRectangle = compassElement.getBoundingClientRect();
      const center = new Cartesian2(
        (compassRectangle.right - compassRectangle.left) / 2.0,
        (compassRectangle.bottom - compassRectangle.top) / 2.0,
      );
      const clickLocation = new Cartesian2(
        e.clientX - compassRectangle.left,
        e.clientY - compassRectangle.top,
      );
      const vector = Cartesian2.subtract(clickLocation, center, this.vectorScratch);
      const angle = Math.atan2(-vector.y, vector.x);

      const angleDifference = angle - this.rotateInitialCursorAngle;
      const newCameraAngle = CesiumMath.zeroToTwoPi(
        this.rotateInitialCameraAngle - angleDifference,
      );

      if (defined(this.rotateFrame)) {
        oldTransform = Matrix4.clone(camera.transform, this.oldTransformScratch);
        camera.lookAtTransform(this.rotateFrame);
      }

      const currentCameraAngle = -camera.heading;
      camera.rotateRight(newCameraAngle - currentCameraAngle);
      const headingDeg = CesiumMath.toDegrees(
        this.facadeMap_.getMapImpl().scene.camera.heading,
      );
      const exteriorElement = compassElement;
      exteriorElement.style.transform = `rotate(${-headingDeg}deg)`;

      if (defined(this.rotateFrame)) {
        camera.lookAtTransform(oldTransform);
      }
    };

    this.rotateMouseUpFunction = () => {
      this.isRotating = false;
      document.removeEventListener('mousemove', this.rotateMouseMoveFunction, false);
      document.removeEventListener('mouseup', this.rotateMouseUpFunction, false);

      this.rotateMouseMoveFunction = undefined;
      this.rotateMouseUpFunction = undefined;
    };

    document.addEventListener('mousemove', this.rotateMouseMoveFunction, false);
    document.addEventListener('mouseup', this.rotateMouseUpFunction, false);
  }

  /**
   * Vuelve el mapa a la vista inicial.
   *
   * @public
   * @function
   * @api
   */
  resetView() {
    const cesiumMap = this.facadeMap_.getMapImpl();
    const scene = cesiumMap.scene;
    const camera = scene.camera;

    camera.flyTo({
      destination: this.position,
      duration: 0.5,
    });
  }

  /**
   * Activa la ayuda del control.
   *
   * @function
   * @public
   * @param {MouseEvent} e Evento.
   * @api
   */
  handleClickHelp(e) {
    //
  }

  /**
   * Devuelve los elementos de la plantilla.
   *
   * @public
   * @function
   * @returns {HTMLElement} Elementos del control.
   * @api stable
   * @export
   */
  getElement() {
    return this.element;
  }

  /**
   * Esta función destruye este control y limpia el HTML.
   *
   * @public
   * @function
   * @api stable
   */
  destroy() {
    this.svgExterior.removeEventListener('mousedown', this.handleExteriorMouseDown);
    this.svgGiroscopio.removeEventListener('mousedown', this.handleGiroscopioMouseDown);
    this.panel.querySelector('#m-movement-giroscopio')
      .removeEventListener('dblclick', this.handleResetView);
    this.panel.querySelector('#m-movement-help').removeEventListener('click', this.handleClickHelp);
    super.destroy();
  }
}

export default Movement;
