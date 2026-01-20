/**
 * @module IDEE/impl/format/DescribeFeatureTypeXML
 */
import OLFormatGML from 'ol/format/GML';
import { isString } from 'IDEE/util/Utils';
import { parse as olXMLParse } from 'ol/xml';
import Exception from 'IDEE/exception/exception';
import { getValue } from 'IDEE/i18n/language';
import * as Dialog from 'IDEE/dialog';

/**
  * @classdesc
  * Implementación del formateador GML.
  *
  * @api
  * @extends {ol.format.GML}
  */
class GML extends OLFormatGML {
  /**
    * Constructor principal de la clase. Formato de los objetos geográficos para
    * leer y escribir datos en formato GML.
    *
    * @constructor
    * @param {olx.format.GMLOptions} optOptions Opciones del formato GML.
    * - featureNS: Espacio de nombres de los objetos geográficos. Si no se define, se derivará
    * de GML.
    * - featureType: Tipo del objeto geográfico a analizar. Si es necesario configurar varios
    * tipos que provienen de diferentes espacios de nombres, "featureNS" será un objeto
    * con las claves como prefijos utilizados en las entradas del array 'featureType'.
    * - srsName: Usado al escribir geometrías.
    * - surface: Escribe gml:Surface en lugar de elementos "gml:Polygon". Esto también
    * afecta a los elementos en geometrías de varias partes. Por defecto es falso.
    * - curve: Escribe "gml:Curve" en lugar de elementos "gml:LineString". Esto también
    * afecta a los elementos en geometrías de varias partes. Por defecto es falso.
    * - multiCurve: Escribe "gml:MultiCurve" en lugar de "gml:MultiLineString".
    * Por defecto es verdadero.
    * - multiSurface: Escribe "gml:multiSurface" en lugar de "gml:MultiPolygon".
    * Por defecto es verdadero.
    * - schemaLocation: 'SchemaLocation' opcional para usar al escribir el GML,
    * esto anulará el predeterminado proporcionado.
    * - hasZ: Indica si las coordenadas tienen un valor Z. Por defecto es falso.
    * @api
    */
  constructor(optOptions = {}) {
    super(optOptions);

    /**
     * FeatureType index
     * @private
     * @type {number}
     */
    this.featureTypeIdx_ = 0;

    /**
     * flag to indicate if a FeatureType is being read
     * @private
     * @type {boolean}
     */
    this.readingFeatureType = false;

    /**
     * flag to indicate if service responded with
     * an exception
     * @private
     * @type {boolean}
     */
    this.serviceException_ = false;

    /**
     * Prefix on the root node that maps to the context namespace URI
     * @private
     * @type {string}
     */
    this.rootPrefix = null;

    /**
     * Mapping of namespace aliases to namespace URIs
     * @private
     * @type {Object}
     */
    this.namespaces = {
      ol: 'http://openlayers.org/context',
      wmc: 'http://www.opengis.net/context',
      sld: 'http://www.opengis.net/sld',
      xlink: 'http://www.w3.org/1999/xlink',
      xsi: 'http://www.w3.org/2001/XMLSchema-instance',
      xsd: 'http://www.w3.org/2001/XMLSchema',
      ogc: 'http://www.opengis.net/ogc',
      wmcext: 'http://wmcext.org/context',
    };

    /**
     * Custom options for this formater
     * @private
     * @type {Mx.parameters.LayerOptions}
     */
    this.options = optOptions;
  }

  /**
   * @public
   * @function
   * @param {Document} data Document.
   * @return {Object} parsed object.
   * @api stable
   */
  read(data) {
    let dataVariable = data;
    if (isString(data)) {
      dataVariable = olXMLParse(data);
    }

    if (dataVariable.nodeType !== 9) {
      Exception(getValue('exception').must_be_document);
    }

    const context = {};
    this.readRoot(context, dataVariable);
    return context;
  }

  /**
   * @private
   * @function
   * @param {Document} data Document.
   * @return {Object} parsed object.
   * @api stable
   */
  readRoot(context, node) {
    const root = node.documentElement;

    if (/ServiceExceptionReport/i.test(root.localName)) {
      this.serviceException_ = true;
    } else {
      this.rootPrefix = root.prefix;
      const contextVar = context;
      contextVar.elementFormDefault = root.getAttribute('elementFormDefault');
      contextVar.targetNamespace = root.getAttribute('targetNamespace');
      contextVar.targetPrefix = root.getAttribute('targetPrefix');
      contextVar.featureTypes = [];
    }
    this.runChildNodes(context, root);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  runChildNodes(obj, node) {
    const children = node.childNodes;
    let childNode;
    let processor;
    let prefix;
    let local;
    for (let i = 0, len = children.length; i < len; i += 1) {
      childNode = children[i];
      if (childNode.nodeType === 1) {
        prefix = this.getNamespacePrefix(childNode.namespaceURI);
        local = childNode.nodeName.split(':').pop();
        processor = this[`read${prefix}${local}`];
        if (processor) {
          processor.apply(this, [obj, childNode]);
        }
      }
    }
  }

  /**
   * Get the namespace prefix for a given uri from the <namespaces> object.
   *
   * @private
   * @function
   * @param {String} uri
   * @return {String} A namespace prefix or null if none found
   * @api stable
   */
  getNamespacePrefix(uri) {
    let prefix = null;
    if (uri === null) {
      prefix = this.namespaces[this.defaultPrefix];
    } else {
      const keys = Object.keys(this.namespaces);
      for (let i = 0; i < keys.length; i += 1) {
        prefix = keys[i];
        if (this.namespaces[prefix] === uri) {
          break;
        }
      }
    }
    return prefix;
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readogcServiceException(context, node) {
    Dialog.error(`Error en el DescribeFeatureType: ${node.textContent.trim()} `);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdschema(context, node) {
    this.runChildNodes(context, node);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdimport(context, node) {
    // none
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdcomplexType(context, node) {
    this.readingFeatureType = true;
    context.featureTypes.push({
      properties: [],
    });
    this.runChildNodes(context, node);
    this.readingFeatureType = false;
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdcomplexContent(context, node) {
    this.runChildNodes(context, node);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdextension(context, node) {
    this.runChildNodes(context, node);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdsequence(context, node) {
    this.runChildNodes(context, node);
  }

  /**
   * @private
   * @function
   * @param {Object} obj
   * @param {Document} node
   * @api stable
   */
  readxsdelement(context, node) {
    if (this.readingFeatureType === true) {
      context.featureTypes[this.featureTypeIdx_].properties.push({
        name: node.getAttribute('name'),
        maxOccurs: node.getAttribute('maxOccurs'),
        minOccurs: node.getAttribute('minOccurs'),
        nillable: node.getAttribute('nillable'),
        type: node.getAttribute('type'),
        localType: node.getAttribute('type').replace(/^\w+:/g, ''),
      });
    } else {
      const contextVar = context;
      contextVar.featureTypes[this.featureTypeIdx_].typeName = node.getAttribute('name');
      this.featureTypeIdx_ += 1;
    }
  }
}

export default GML;
