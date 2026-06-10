/**
 * @module IDEE/stac/Catalog
 */
import { post, get } from '../util/Remote';
import Base from '../Base';
import { getValue } from '../i18n/language';
import { error as showError } from '../dialog';

const STAC_FILTER_LANG = {
  STAC_QUERY: 'stac-query', // campo "query"
  CQL_JSON: 'cql-json', // filter-lang
  CQL2_JSON: 'cql2-json', // filter-lang
};

/**
 * @classdesc
 * Clase para gestionar catálogos STAC.
 *
 * Permite consultar colecciones, ítems y campos consultables de un catálogo STAC,
 * tanto en modo público como autenticado mediante token Bearer.
 *
 * @extends {IDEE.Base}
 * @property {string} url URL del catálogo STAC.
 * @property {boolean} public Indica si el catálogo es público (sin autenticación).
 * @property {string} authUrl URL del servicio de autenticación y autorización.
 * @property {string|null} token Token de acceso obtenido tras autenticarse.
 * @api
 */
class Catalog extends Base {
  /**
   * Constructor principal de la clase. Crea una instancia de catálogo STAC
   * con los parámetros especificados por el usuario.
   *
   * @constructor
   * @param {Object} userParameters Parámetros proporcionados por el usuario.
   * - url: URL del catálogo STAC.
   * - authUrl: URL del servicio de autenticación (requerida si el catálogo es privado).
   * - public: Verdadero si el catálogo es público y no requiere autenticación.
   * @api
   */
  constructor(userParameters) {
    super(null);

    const url = userParameters.url;
    const publicValue = userParameters.public === true;
    if (!url) {
      const noCatalogMsg = getValue('exception').no_catalog_url;
      showError(noCatalogMsg);
      throw new Error(noCatalogMsg);
    }
    if (!publicValue && !userParameters.authUrl) {
      const noAuthUrlMsg = getValue('exception').no_catalog_auth_url;
      showError(noAuthUrlMsg);
      throw new Error(noAuthUrlMsg);
    }
    this.url = url;
    this.public = publicValue === true;
    this.authUrl = userParameters.authUrl;
    this.token = null;
  }

  /**
   * Devuelve la URL del catálogo STAC.
   *
   * @function
   * @returns {string} URL del catálogo.
   * @api
   */
  getUrl() {
    return this.url;
  }

  /**
   * Establece la URL del catálogo STAC.
   *
   * @function
   * @param {string} newUrl Nueva URL del catálogo.
   * @api
   */
  setUrl(newUrl) {
    this.url = newUrl;
  }

  /**
   * Autentica al usuario contra el servicio de autenticación y almacena
   * el token de acceso para las peticiones posteriores.
   *
   * @function
   * @param {string} username Nombre de usuario.
   * @param {string} password Contraseña del usuario.
   * @returns {Promise<boolean>} Promesa que se resuelve con verdadero si la
   * autenticación fue correcta.
   * @api
   */
  authenticate(username, password) {
    if (!username || !password) {
      const noUsernamePasswordMsg = getValue('exception').no_catalog_username_password;
      showError(noUsernamePasswordMsg);
      return;
    }
    return new Promise((success, fail) => {
      post(`${this.authUrl}/token`, {
        username,
        password,
      }, { headers: { 'Content-Type': 'application/json' } }).then((response) => {
        if (response.code === 401) {
          showError(getValue('exception').invalid_user_password);
        } else if (response.code === 200) {
          const data = JSON.parse(response.text);
          if (data.access_token) {
            this.token = data.access_token;
            success(true);
          }
        } else {
          const data = JSON.parse(response.text || '{}');
          throw new Error(data.error);
        }
      }).catch((error) => {
        fail(new Error(`${getValue('exception').catalog_token_error}: ${error.message}`));
      });
    });
  }

  /**
   * Obtiene las colecciones disponibles en el catálogo STAC.
   *
   * Si el catálogo es público, consulta directamente el endpoint `/collections`.
   * En caso contrario, obtiene las colecciones autorizadas para el usuario
   * autenticado a través del servicio de roles.
   *
   * @function
   * @returns {Promise<Array<Object>>} Promesa con el listado de colecciones.
   * @api
   */
  getCollections() {
    if (this.public) {
      return new Promise((success, fail) => {
        get(`${this.url}/collections`).then((response) => {
          if (response.code !== 200) {
            fail(new Error(getValue('exception').catalog_collections_error));
            return;
          }
          const data = JSON.parse(response.text);
          success(data.collections);
        });
      });
    }
    return new Promise((success, fail) => {
      post(`${this.authUrl}/roles`, { accessToken: this.token }, { headers: { 'Content-Type': 'application/json' } }).then((response) => {
        if (response.code !== 200) {
          fail(new Error(getValue('exception').catalog_collections_error));
          return;
        }
        const data = JSON.parse(response.text);
        success(data.collections);
      });
    });
  }

  /**
   * Obtiene los campos consultables de una colección STAC.
   *
   * Consulta el endpoint `/collections/{collectionId}/queryables` y devuelve
   * las propiedades disponibles para filtrar ítems.
   *
   * @function
   * @param {string} collectionId Identificador de la colección.
   * @returns {Promise<Array<Object>>} Promesa con el listado de campos consultables.
   * @api
   */
  getQueryableFields(collectionId) {
    if (!collectionId) {
      showError(getValue('exception').no_collection_id);
      return;
    }
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return get(`${this.url}/collections/${collectionId}/queryables`, null, { headers }).then((response, fail) => {
      if (response.code !== 200) {
        fail(new Error(getValue('exception').catalog_queryable_fields_error));
        return;
      }
      const data = JSON.parse(response.text);
      return data.properties || [];
    });
  }

  /**
   * Obtiene los ítems de una colección STAC.
   *
   * Realiza una petición GET al endpoint `/collections/{collectionId}/items`
   * con el límite de resultados indicado.
   *
   * @function
   * @param {string} collectionId Identificador de la colección.
   * @param {number} [limit=10] Número máximo de ítems a devolver.
   * @returns {Promise<Object>} Promesa con la respuesta STAC (FeatureCollection).
   * @api
   */
  getItems(collectionId, limit = 10) {
    if (!collectionId) {
      showError(getValue('exception').no_collection_id);
      return;
    }
    if (limit < 1) {
      showError(getValue('exception').invalid_limit);
      return;
    }
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items?limit=${limit}`, null, { headers }).then((response) => {
        if (response.code !== 200) {
          fail(new Error(getValue('exception').catalog_items_error));
          return;
        }
        const data = JSON.parse(response.text);
        success(data);
      });
    });
  }

  /**
   * Obtiene un ítem concreto de una colección STAC.
   *
   * @function
   * @param {string} collectionId Identificador de la colección.
   * @param {string} itemId Identificador del ítem.
   * @returns {Promise<Object>} Promesa con el ítem STAC (Feature).
   * @api
   */
  getItem(collectionId, itemId) {
    if (!collectionId) {
      showError(getValue('exception').no_collection_id);
      return;
    }
    if (!itemId) {
      showError(getValue('exception').no_item_id);
      return;
    }
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items/${itemId}`, null, { headers }).then((response) => {
        if (response.code !== 200) {
          fail(new Error(getValue('exception').catalog_item_error));
          return;
        }
        const data = JSON.parse(response.text);
        success(data);
      });
    });
  }

  /**
   * Obtiene ítems de una colección aplicando filtros mediante parámetros GET.
   *
   * Los filtros se envían como parámetros de consulta al endpoint
   * `/collections/{collectionId}/items` (por ejemplo, `limit`, `bbox`, `datetime`).
   *
   * @function
   * @param {string} collectionId Identificador de la colección.
   * @param {Object} filters Parámetros de filtrado para la petición GET.
   *  -Filtros espaciales en EPSG:4326.
   * @returns {Promise<Object>} Promesa con la respuesta STAC filtrada (FeatureCollection).
   * @api
   */
  getFilteredItems(collectionId, filters) {
    if (!collectionId) {
      showError(getValue('exception').no_collection_id);
      return;
    }
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items`, filters, { headers }).then((response) => {
        if (response.code !== 200) {
          fail(new Error(getValue('exception').catalog_filtered_items_error));
          return;
        }
        const data = JSON.parse(response.text);
        success(data);
      });
    });
  }

  /**
   * Obtiene ítems aplicando un filtro avanzado mediante el endpoint `/search`.
   *
   * Soporta los formatos de filtrado `stac-query`, `cql-json` y `cql2-json`.
   *
   * @function
   * @param {string} collectionId Identificador de la colección.
   * @param {Object} filter Configuración del filtro avanzado.
   * - format: Formato del filtro (`stac-query`, `cql-json` o `cql2-json`).
   * - filter: Cuerpo del filtro según el formato indicado.
   * - limit: Número máximo de ítems a devolver (por defecto 10).
   * @returns {Promise<Object>} Promesa con la respuesta STAC filtrada (FeatureCollection).
   * @api
   */
  getFilteredItemsAdvanced(collectionId, filter, bbox = null) {
    if (!collectionId) {
      showError(getValue('exception').no_collection_id);
      return;
    }
    const data = this.getFilterData(collectionId, filter, bbox);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (!this.public && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return new Promise((success, fail) => {
      post(`${this.url}/search`, data, { headers }).then((response) => {
        if (response.code !== 200) {
          fail(new Error(getValue('exception').catalog_filtered_items_advanced_error));
          return;
        }
        const responseData = JSON.parse(response.text);
        success(responseData);
      });
    });
  }

  /**
   * Construye el cuerpo de la petición POST para el endpoint `/search`
   * a partir de la configuración de filtro indicada.
   *
   * @function
   * @param {string} collectionId Identificador de la colección. Si es nulo o vacío,
   * la búsqueda no se restringe a una colección concreta.
   * @param {Object} filter Configuración del filtro avanzado.
   * - format: Formato del filtro (`stac-query`, `cql-json` o `cql2-json`).
   * - filter: Cuerpo del filtro según el formato indicado.
   * - limit: Número máximo de ítems a devolver (por defecto 10).
   * @returns {Object|null} Objeto con el cuerpo de la petición o nulo si el
   * formato de filtro no es válido.
   * @api
   */
  getFilterData(collectionId, filter, bbox) {
    const data = {
      limit: filter.limit || 10,
    };
    if (collectionId) {
      data.collections = Array.isArray(collectionId) ? collectionId : [collectionId];
    }
    if (bbox) {
      data.bbox = bbox;
    }
    switch (filter.format) {
      case STAC_FILTER_LANG.STAC_QUERY:
        data.query = filter.filter;
        break;
      case STAC_FILTER_LANG.CQL_JSON:
        data.filter_lang = STAC_FILTER_LANG.CQL_JSON;
        data.filter = filter.filter;
        break;
      case STAC_FILTER_LANG.CQL2_JSON:
        data.filter_lang = STAC_FILTER_LANG.CQL2_JSON;
        data.filter = filter.filter;
        break;
      default:
        return null;
    }
    return data;
  }
}

export default Catalog;
