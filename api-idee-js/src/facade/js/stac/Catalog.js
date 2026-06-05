/**
 * @module IDEE/stac
 */
import { get as remoteGet, post as remotePost } from 'IDEE/util/Remote';
import { addParameters, isObject } from 'IDEE/util/Utils';
import { useproxy } from 'IDEE/api-idee';
import Response from 'IDEE/util/Response';
import Base from '../Base';

/**
 * Realiza una petición POST JSON con la cabecera Content-Type adecuada.
 *
 * @function
 * @param {string} url URL del servicio.
 * @param {Object} data Cuerpo de la petición.
 * @returns {Promise<Response>} Promesa con la respuesta.
 * @private
 */
const postJson = (url, data) => {
  let requestUrl = url;
  const body = isObject(data) ? JSON.stringify(data) : data;

  if (useproxy) {
    requestUrl = addParameters(IDEE.config.PROXY_POST_URL, { url });
  }

  return new Promise((success, fail) => {
    let xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
      xhr = new ActiveXObject('Microsoft.XMLHTTP');
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        const response = new Response();
        response.parseXmlHttp(xhr);
        success(response);
      }
    };
    xhr.onerror = () => {
      fail(new Error('Request failed'));
    };
    xhr.open('POST', requestUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(body);
  });
};

const STAC_FILTER_LANG = {
  STAC_QUERY: 'stac-query', // campo "query"
  CQL_JSON: 'cql-json', // filter-lang
  CQL2_JSON: 'cql2-json', // filter-lang
};

/**
 * @classdesc
 * Clase para gestionar catálogos stac.
 *
 * @extends {IDEE.Base}
 * @property {string} url URL del catálogo.
 * @api
 */
class Catalog extends Base {
  constructor(userParameters) {
    super(null);
    this.url = userParameters.url;
  }

  getUrl() {
    return this.url;
  }

  setUrl(newUrl) {
    this.url = newUrl;
  }

  getToken(user, password) {
    return remotePost(`${this.url}/token`, {
      user,
      password,
    });
  }

  getCollections(limit = 10) {
    return new Promise((success, fail) => {
      remoteGet(`${this.url}/collections?limit=${limit}`).then((response) => {
        const data = JSON.parse(response.text);
        success(data.collections || data.results || []);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getQueryableFields(collectionId) {
    return new Promise((success, fail) => {
      remoteGet(`${this.url}/collections/${collectionId}/queryables`).then((response) => {
        const data = JSON.parse(response.text);
        success(data.properties || []);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getItems(collectionId, limit = 10) {
    return new Promise((success, fail) => {
      remoteGet(`${this.url}/collections/${collectionId}/items?limit=${limit}`).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getItem(collectionId, itemId) {
    return new Promise((success, fail) => {
      remoteGet(`${this.url}/collections/${collectionId}/items/${itemId}`).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getFilteredItems(collectionId, filters) {
    return new Promise((success, fail) => {
      remoteGet(`${this.url}/collections/${collectionId}/items`, filters).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getFilteredItemsAdvanced(collectionId, filter) {
    const data = this.getFilterData(collectionId, filter);
    return new Promise((success, fail) => {
      postJson(`${this.url}/search`, data).then((response) => {
        const responseData = JSON.parse(response.text);
        success(responseData);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getFilterData(collectionId, filter) {
    const data = {
      collections: collectionId ? [collectionId] : undefined,
      limit: filter.limit || 10,
    };
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
