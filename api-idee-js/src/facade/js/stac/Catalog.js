/**
 * @module IDEE/stac
 */
import { addParameters, isObject } from 'IDEE/util/Utils';
import { useproxy } from 'IDEE/api-idee';
import Response from 'IDEE/util/Response';
import Base from '../Base';

/**
 * Realiza una petición POST.
 *
 * @function
 * @param {string} url URL del servicio.
 * @param {Object} data Cuerpo de la petición.
 * @returns {Promise<Response>} Promesa con la respuesta.
 * @private
 */
const post = (url, data, headers = {}) => {
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
    Object.keys(headers).forEach((header) => {
      xhr.setRequestHeader(header, headers[header]);
    });
    xhr.send(body);
  });
};

const STAC_FILTER_LANG = {
  STAC_QUERY: 'stac-query', // campo "query"
  CQL_JSON: 'cql-json', // filter-lang
  CQL2_JSON: 'cql2-json', // filter-lang
};

const get = (url, data, headers = {}) => {
  let requestUrl = url;

  if (useproxy) {
    requestUrl = addParameters(IDEE.config.PROXY_POST_URL, { url });
  }
  if (data) {
    requestUrl = addParameters(requestUrl, data);
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
    xhr.open('GET', requestUrl, true);
    Object.keys(headers).forEach((header) => {
      xhr.setRequestHeader(header, headers[header]);
    });
    xhr.send();
  });
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
    this.public = userParameters.public === true;
    this.authUrl = userParameters.authUrl;
    this.token = null;
  }

  getUrl() {
    return this.url;
  }

  setUrl(newUrl) {
    this.url = newUrl;
  }

  authenticate(username, password) {
    const this2 = this;
    return new Promise((success, fail) => {
      post(`${this.authUrl}/token`, {
        username,
        password,
      }, { 'Content-Type': 'application/json' }).then((response) => {
        const data = JSON.parse(response.text);
        if (data.access_token) {
          this2.token = data.access_token;
          success(true);
        } else {
          fail(new Error('No se ha obtenido el token'));
        }
      }).catch((error) => {
        fail(new Error(`Error al obtener el token: ${error.message}`));
      });
    });
  }

  getCollections() {
    if (this.public) {
      return new Promise((success, fail) => {
        get(`${this.url}/collections`).then((response) => {
          const data = JSON.parse(response.text);
          success(data.collections);
        }).catch((error) => {
          fail(error);
        });
      });
    }
    return new Promise((success, fail) => {
      post(`${this.authUrl}/roles`, { accessToken: this.token }, { 'Content-Type': 'application/json' }).then((response) => {
        const data = JSON.parse(response.text);
        success(data.collections);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getQueryableFields(collectionId) {
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/queryables`, null, headers).then((response) => {
        const data = JSON.parse(response.text);
        success(data.properties || []);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getItems(collectionId, limit = 10) {
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items?limit=${limit}`, null, headers).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getItem(collectionId, itemId) {
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items/${itemId}`, null, headers).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getFilteredItems(collectionId, filters) {
    const headers = this.public || !this.token ? {} : { 'Authorization': `Bearer ${this.token}` };
    return new Promise((success, fail) => {
      get(`${this.url}/collections/${collectionId}/items`, filters, headers).then((response) => {
        const data = JSON.parse(response.text);
        success(data);
      }).catch((error) => {
        fail(error);
      });
    });
  }

  getFilteredItemsAdvanced(collectionId, filter) {
    const data = this.getFilterData(collectionId, filter);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (!this.public && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return new Promise((success, fail) => {
      post(`${this.url}/search`, data, headers).then((response) => {
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
