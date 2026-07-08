/**
 * @module IDEE/control/CatalogmanagerControl
 */

import CatalogmanagerImplControl from 'impl/catalogmanagercontrol';
import template from 'templates/catalogmanager';
import addCatalogTemplate from 'templates/addcatalog';
import contentTemplate from 'templates/catalogmanagercontent';
import collectionsTemplate from 'templates/catalogmanagercollections';
import itemsTemplate from 'templates/catalogmanageritems';
import imagesTemplate from 'templates/catalogmanagerimages';
import histogramTemplate from 'templates/catalogmanagerhistogram';
import histogramStatsTemplate from 'templates/catalogmanagerhistogramstats';
import itemMetadataTemplate from 'templates/itemMetadata';
import collectionMetadataTemplate from 'templates/collectionMetadata';
import advancedFilterTemplate from 'templates/advancedFilter';
import fieldsTableTemplate from 'templates/fieldstable';
import typeTableTemplate from 'templates/typetable';
import Chart from 'chart.js/auto';
import { downloadZip } from 'client-zip';
import streamSaver from 'streamsaver';
import { getValue } from './i18n/language';

// - Modal
/** @private @type {string} Selector CSS del botón de cierre del modal informativo */
const BT_CLOSE_MODAL = 'div.m-dialog.info div.m-button > button';

/** @private @type {Object<string, {border: string, background: string}>} Colores por banda */
const HISTOGRAM_BAND_COLORS = {
  1: { border: 'rgb(220, 53, 69)', background: 'rgba(220, 53, 69, 0.6)' },
  2: { border: 'rgb(25, 135, 84)', background: 'rgba(25, 135, 84, 0.6)' },
  3: { border: 'rgb(13, 110, 253)', background: 'rgba(13, 110, 253, 0.6)' },
  4: { border: 'rgb(125, 125, 125)', background: 'rgba(125, 125, 125, 0.6)' },
};

/** @private @type {number} Pausa entre descargas nativas del navegador (ms) */
const BROWSER_DOWNLOAD_DELAY_MS = 400;

/** @private @type {string} Nombre base del ZIP de descarga masiva en Chrome/Edge */
const MASIVE_DOWNLOAD_ZIP_BASENAME = 'catalogmanager.zip';

export default class CatalogmanagerControl extends IDEE.Control {
  /**
   * @classdesc
   * Control de gestión de catálogos STAC. Permite añadir catálogos, explorar
   * colecciones e ítems, aplicar filtros temporales, espaciales y avanzados,
   * visualizar metadatos e imágenes en el mapa, consultar histogramas de assets
   * y realizar descargas masivas de imágenes TIFF.
   *
   * @constructor
   * @extends {IDEE.Control}
   * @param {Object} [options={}] Opciones de configuración del control
   * @param {boolean} [options.isDraggable=false] Indica si el panel puede arrastrarse
   * @param {number} [options.order] Orden de tabulación y prioridad en modales
   * @param {Array<Object>} [options.predefinedCatalogs=[]] Catálogos STAC precargados
   * @api stable
   */
  constructor(options = {}) {
    // 1. Comprueba si la implementación puede crear el control
    if (IDEE.utils.isUndefined(CatalogmanagerImplControl)
      || (IDEE.utils.isObject(CatalogmanagerImplControl)
      && IDEE.utils.isNullOrEmpty(Object.keys(CatalogmanagerImplControl)))) {
      IDEE.exception(getValue('exception.impl'));
    }
    // 2. Crea la implementación del control
    const impl = new CatalogmanagerImplControl();
    super(impl, 'Catalogmanager');

    /**
     * Indicador de si el plugin puede arrastrarse o no
     * @public
     * @type {boolean}
     */
    this.isDraggable_ = options.isDraggable || false;

    /**
     * Referencia al mapa asociado al control
     * @private
     * @type {IDEE.Map|undefined}
     */
    this.map_ = undefined;

    /**
     * Elemento DOM raíz de la plantilla del control
     * @private
     * @type {HTMLElement|undefined}
     */
    this.template_ = undefined;

    /**
     * Orden de tabulación y prioridad en modales
     * @public
     * @type {number|undefined}
     */
    this.order = options.order;

    /**
     * Catálogos STAC definidos en la configuración inicial
     * @private
     * @type {Array<Object>}
     */
    this.predefinedCatalogs_ = options.predefinedCatalogs || [];

    /**
     * Catálogos STAC cargados en el control
     * @private
     * @type {Array<Object>}
     */
    this.catalogs_ = [];

    /**
     * Operadores SQL disponibles en el filtro avanzado
     * @private
     * @type {Array<string>}
     */
    this.operators_ = ['=', '<', '>', '<=', '>=', '<>', 'and'];

    /**
     * Mapeo de operadores SQL a operadores de consulta STAC
     * @private
     * @type {Object<string, string>}
     */
    this.sqlToStacOperator_ = {
      '=': 'eq',
      '<>': 'neq',
      '<': 'lt',
      '<=': 'lte',
      '>': 'gt',
      '>=': 'gte',
    };

    /**
     * Filtros comunes activos (temporal y espacial)
     * @private
     * @type {Object}
     */
    this.commonFilters_ = {};

    /**
     * Estado interno del panel de filtro avanzado
     * @private
     * @type {Object|null}
     */
    this.advancedFilterState_ = null;

    this.focusStyle_ = new IDEE.style.Generic({
      polygon: {
        stroke: {
          width: 1,
          color: 'red',
        },
        fill: {
          color: 'red',
          opacity: 0.2,
        },
      },
    });
  }

  /**
   * Esta función crea la vista
   *
   * @public
   * @function
   * @param {IDEE.Map} map Mapa al que se añade el control
   * @returns {Promise<HTMLElement>} Promesa que resuelve con el HTML del control
   * @api stable
   */
  createView(map) {
    this.map_ = map;
    this.getImpl().createAllInteractions(map, this);
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    return new Promise((success, fail) => {
      const html = IDEE.template.compileSync(template, {
        vars: {
          translations: {
            title: getValue('title'),
            addCatalog: getValue('addCatalog'),
            update: getValue('update'),
            filters: getValue('filters'),
            configuration: getValue('configuration'),
            filtersTypes: getValue('filtersTypes'),
            masiveDownload: getValue('masiveDownload.title'),
            clearSelection: getValue('clearSelection'),
          },
          startDate: yesterday,
          startTime: '00:00:00',
          endDate: yesterday,
          endTime: '23:59:59',
        },
      });

      if (this.isDraggable_) {
        IDEE.utils.draggabillyPlugin(this.getPanel(), '#m-catalogmanager-title');
      }

      this.template_ = html;
      this.addEvents();
      this.addPredefinedCatalogs();
      success(html);
    });
  }

  /**
   * Carga los catálogos predefinidos y los renderiza en la interfaz
   *
   * @private
   * @function
   */
  addPredefinedCatalogs() {
    this.predefinedCatalogs_.forEach((predCatalog) => {
      const catalog = new IDEE.stac.Catalog(predCatalog);
      if (!predCatalog.public) {
        catalog.authenticate(predCatalog.user, predCatalog.password);
      }
      this.catalogs_.push(this.getJsonCatalog(catalog));
    });
    this.renderCatalogs();
  }

  /**
   * Esta función añade los eventos al control
   *
   * @public
   * @function
   * @api stable
   */
  addEvents() {
    this.template_.querySelector('#m-catalogmanager-addcatalog').addEventListener('click', this.openAddCatalog.bind(this));
    this.template_.querySelector('#m-catalogmanager-filters').addEventListener('click', (evt) => this.toggleCommonFilters(evt));
    this.template_.querySelector('.m-catalogmanager-filters-temporal-predefined').addEventListener('click', (evt) => this.setTemporalFilter(evt));
    this.template_.querySelector('.m-catalogmanager-filters-spatial-predefined').addEventListener('click', (evt) => this.toggleSpatialFilter(evt));
    this.template_.querySelector('#m-catalogmanager-updatecatalog').addEventListener('click', this.updateItems.bind(this));
    this.template_.querySelector('#m-catalogmanager-extra-actions-content #m-catalogmanager-download').addEventListener('click', this.masiveDownload.bind(this));
    this.template_.querySelector('#m-catalogmanager-extra-actions-content #m-catalogmanager-delete').addEventListener('click', this.clearSelection.bind(this));
  }

  /**
   * Abre el modal para añadir un nuevo catálogo STAC
   *
   * @private
   * @function
   */
  openAddCatalog() {
    const acTemplate = IDEE.template.compileSync(addCatalogTemplate, {
      jsonp: true,
      parseToHtml: false,
      vars: {
        translations: {
          cat_title: getValue('cat_title'),
          cat_url: getValue('cat_url'),
          cat_public: getValue('cat_public'),
          cat_auth_url: getValue('cat_auth_url'),
          cat_user: getValue('cat_user'),
          cat_password: getValue('cat_password'),
          add: getValue('add'),
        },
      },
    });
    IDEE.dialog.info(acTemplate, getValue('addCatalog'), this.order);
    this.changeCloseButtonModal();
    document.querySelector('#add-catalog').addEventListener('click', this.addCatalog.bind(this));
    document.querySelector('.m-catalogmanager-add-panel #cat-public').addEventListener('change', this.togglePublic.bind(this));
  }

  /**
   * Alterna la visibilidad del panel de filtros comunes
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el botón de filtros
   */
  toggleCommonFilters(evt) {
    const btn = evt.target.tagName === 'SPAN' ? evt.target.parentElement : evt.target;
    const filtersContent = this.template_.querySelector('#m-catalogmanager-filters-content');
    const catalogContainer = this.template_.querySelector('ul.m-catalogmanager-ulcatalogs');
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      filtersContent.classList.add('hidden');
      catalogContainer.classList.add('fullsize');
      this.getImpl().deactivateAllInteractions();
    } else {
      btn.classList.add('active');
      filtersContent.classList.remove('hidden');
      catalogContainer.classList.remove('fullsize');
    }
  }

  /**
   * Activa o desactiva un filtro temporal predefinido
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el botón de filtro temporal
   */
  setTemporalFilter(evt) {
    const btn = evt.target;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      delete this.commonFilters_.datetime;
    } else {
      const activeBtn = btn.parentElement.querySelector('.active');
      if (activeBtn) {
        activeBtn.classList.remove('active');
      }
      btn.classList.add('active');
      const filterType = btn.id;
      this.setTemporalFilterByType(filterType);
    }
  }

  /**
   * Establece el filtro temporal según el tipo seleccionado
   *
   * @private
   * @function
   * @param {string} filterType Tipo de filtro ('last30days', 'last3months', 'lastyear', 'range')
   */
  setTemporalFilterByType(filterType) {
    switch (filterType) {
      case 'last30days':
        this.commonFilters_.datetime = `${new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()}/${new Date().toISOString()}`;
        break;
      case 'last3months':
        this.commonFilters_.datetime = `${new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString()}/${new Date().toISOString()}`;
        break;
      case 'lastyear':
        this.commonFilters_.datetime = `${new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()}/${new Date().toISOString()}`;
        break;
      case 'range':
        const startDate = this.template_.querySelector('#m-catalogmanager-filters-temporal-start').value;
        const startTime = this.template_.querySelector('#m-catalogmanager-filters-temporal-start-time').value;
        const endDate = this.template_.querySelector('#m-catalogmanager-filters-temporal-end').value;
        const endTime = this.template_.querySelector('#m-catalogmanager-filters-temporal-end-time').value;
        this.commonFilters_.datetime = `${startDate}T${startTime}Z/${endDate}T${endTime}Z`;
        break;
      default:
        delete this.commonFilters_.datetime;
        break;
    }
  }

  /**
   * Activa o desactiva un filtro espacial predefinido
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el botón de filtro espacial
   */
  toggleSpatialFilter(evt) {
    const btn = evt.target.tagName === 'SPAN' ? evt.target.parentElement : evt.target;

    this.getImpl().deactivateAllInteractions();
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      delete this.commonFilters_.bbox;
    } else {
      const activeBtn = btn.parentElement.querySelector('.active');
      if (activeBtn) {
        activeBtn.classList.remove('active');
      }
      btn.classList.add('active');
      const filterType = btn.id;
      this.setSpatialFilterByType(filterType);
    }
  }

  /**
   * Establece el filtro espacial según el tipo seleccionado
   *
   * @private
   * @function
   * @param {string} filterType Tipo de filtro (`view`, `extent` o `referenced`).
   */
  setSpatialFilterByType(filterType) {
    switch (filterType) {
      case 'view':
        const bbox = this.map_.getBbox();
        const extent = [bbox.x.min, bbox.y.min, bbox.x.max, bbox.y.max];
        this.setSpatialFilterByExtent(this.getImpl().transformExtent(extent, this.map_.getProjection().code, 'EPSG:4326'));
        break;
      case 'extent':
        this.getImpl().activateDrawExtent();
        break;
      case 'referenced':
        this.getImpl().activateSelectGeometry();
        break;
      default:
        delete this.commonFilters_.bbox;
        break;
    }
    this.toggleSpatialFilterHelp(filterType);
  }

  /**
   * Establece el filtro espacial a partir de una extensión en EPSG:4326
   *
   * @private
   * @function
   * @param {Array<number>} extent Extensión [minX, minY, maxX, maxY] en EPSG:4326
   */
  setSpatialFilterByExtent(extent) {
    this.commonFilters_.bbox = extent;
    IDEE.toast.success(getValue('filtersTypes.spatial.success'), null, 2500);
  }

  /**
   * Muestra u oculta el texto de ayuda del filtro espacial activo
   *
   * @private
   * @function
   * @param {string} filterType Tipo de filtro espacial (`view`, `extent` o `referenced`)
   */
  toggleSpatialFilterHelp(filterType) {
    const helpContainer = this.template_.querySelector('.m-catalogmanager-filters-spatial-help');
    const helps = helpContainer.querySelectorAll('.spatial-help');
    helps.forEach((help) => {
      if (!help.classList.contains('hidden')) {
        help.classList.add('hidden');
      }
      if (help.id === `${filterType}-help`) {
        help.classList.remove('hidden');
      }
    });
  }

  /**
   * Abre el panel de filtros avanzados para una colección
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo en la lista interna
   * @param {number} collectionIndex Índice de la colección dentro del catálogo
   * @returns {Promise<void>}
   */
  async openAdvancedFilters(catalogIndex, collectionIndex) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    let queryableFields = {};
    try {
      queryableFields = await catalog.obj.getQueryableFields(collection.id) || {};
    } catch (err) {
      console.error(err);
      IDEE.dialog.error(getValue('advancedFilter.loadError'));
      return;
    }
    if (Object.keys(queryableFields).length === 0) {
      IDEE.dialog.info(getValue('advancedFilter.noQueryableFields'));
      return;
    }
    const advancedFiltersHtml = IDEE.template.compileSync(advancedFilterTemplate, {
      vars: {
        catalogIndex,
        collectionIndex,
        operators: this.operators_,
        translations: getValue('advancedFilter'),
      },
    });
    const container = this.template_.querySelector('#m-catalogmanager-advanced-filters-content');
    container.innerHTML = advancedFiltersHtml.outerHTML;
    this.initAdvancedFilterState(catalogIndex, collectionIndex, queryableFields);
    this.renderQueryableFields();
    this.addAdvancedFilterEvents(container);
    if (collection.advancedFilter?.sqlExpression) {
      this.getAdvancedFilterAssistantTextarea().value = collection.advancedFilter.sqlExpression;
    }
    if (collection.advancedFilter?.queryExpression) {
      this.getAdvancedFilterQueryTextarea().value = collection.advancedFilter.queryExpression;
    }
    this.toggleAdvancedFilters();
  }

  /**
   * Inicializa el estado interno del filtro avanzado
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @param {Object} queryableFields Campos consultables devueltos por la API STAC
   */
  initAdvancedFilterState(catalogIndex, collectionIndex, queryableFields) {
    const fields = Object.keys(queryableFields || {});
    this.advancedFilterState_ = {
      catalogIndex,
      collectionIndex,
      queryableFields: queryableFields || {},
      fields,
      fieldsPages: this.spliteList(fields),
      currentFieldsPage: 0,
      selectedField: null,
      fieldsTemplate: null,
    };
  }

  /**
   * Obtiene el contenedor DOM del panel de filtro avanzado
   *
   * @private
   * @function
   * @returns {HTMLElement|null} Contenedor del filtro avanzado
   */
  getAdvancedFilterContainer() {
    return this.template_.querySelector('#m-catalogmanager-advanced-filters-content #m-catalogmanager-advanced-filters-content');
  }

  /**
   * Obtiene el textarea de expresión SQL del filtro avanzado
   *
   * @private
   * @function
   * @returns {HTMLTextAreaElement|null} Textarea de la expresión de filtro
   */
  getAdvancedFilterAssistantTextarea() {
    return this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-assistant-body');
  }

  /**
   * Obtiene el textarea de expresión de consulta JSON del filtro avanzado
   *
   * @private
   * @function
   * @returns {HTMLTextAreaElement|null} Textarea de la expresión de consulta JSON
   */
  getAdvancedFilterQueryTextarea() {
    return this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-query-body');
  }

  /**
   * Registra los eventos del panel de filtro avanzado
   *
   * @private
   * @function
   * @param {HTMLElement} container Contenedor raíz del filtro avanzado
   */
  addAdvancedFilterEvents(container) {
    const root = container.querySelector('#m-catalogmanager-advanced-filters-content');
    root.querySelectorAll('#m-catalogmanager-operators-container>button').forEach((btn) => {
      btn.addEventListener('click', (evt) => this.advancedFilterOperatorClick(evt));
    });
    root.querySelector('#m-catalogmanager-advanced-filters-tabs').addEventListener('click', (evt) => this.changeAdvancedFilterTab(evt));
    root.querySelector('#volver-btn').addEventListener('click', () => this.toggleAdvancedFilters());
    root.querySelector('#aplicar-btn').addEventListener('click', () => this.applyAdvancedFilter());
    root.querySelector('#limpiar-filtro-btn').addEventListener('click', () => this.clearAdvancedFilter());
  }

  /**
   * Cambia la pestaña activa del filtro avanzado (asistente o consulta)
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en una pestaña del filtro avanzado
   */
  changeAdvancedFilterTab(evt) {
    const btn = evt.target;
    if (btn.id === 'advanced-filter-tab-assistant') {
      this.showAdvancedFilter('assistant');
    } else if (btn.id === 'advanced-filter-tab-query') {
      this.showAdvancedFilter('query');
    }
  }

  /**
   * Muestra el panel del filtro avanzado correspondiente a la pestaña indicada
   *
   * @private
   * @function
   * @param {string} tabName Nombre de la pestaña (`assistant` o `query`)
   */
  showAdvancedFilter(tabName) {
    const tabs = this.getAdvancedFilterContainer().querySelectorAll('#m-catalogmanager-advanced-filters-tabs>div');
    const tabId = `advanced-filter-tab-${tabName}`;
    tabs.forEach((tab) => {
      if (tab.id === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    const containerId = `advanced-filter-${tabName}-container`;
    const containers = this.getAdvancedFilterContainer().querySelectorAll('.advanced-filter-container');
    containers.forEach((container) => {
      if (container.id === containerId) {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    });
  }

  /**
   * Renderiza la tabla paginada de campos consultables
   *
   * @private
   * @function
   */
  renderQueryableFields() {
    const state = this.advancedFilterState_;
    const fields = state.fieldsPages[state.currentFieldsPage] || [];
    state.fieldsTemplate = IDEE.template.compileSync(fieldsTableTemplate, {
      jsonp: true,
      vars: { fields },
    });
    const totalPages = state.fieldsPages.length || 1;
    state.fieldsTemplate.querySelector('#pageNumBtn').innerHTML = `${state.currentFieldsPage + 1} ${getValue('advancedFilter.of')} ${totalPages}`;
    const fieldsContainer = this.getAdvancedFilterContainer().querySelector('.m-catalogmanager-fields');
    fieldsContainer.innerHTML = `<p class="m-catalogmanager-headers">${getValue('advancedFilter.fields')}</p>`;
    fieldsContainer.appendChild(state.fieldsTemplate);
    this.bindQueryableFieldCells();
    this.bindAdvancedFilterPagination();
  }

  /**
   * Asocia eventos de clic a las celdas de campos consultables
   *
   * @private
   * @function
   */
  bindQueryableFieldCells() {
    const state = this.advancedFilterState_;
    this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-fieldstable')
      .addEventListener('click', (evt) => {
        const fieldName = evt.target.innerHTML;
        state.selectedField = fieldName;
        this.getAdvancedFilterAssistantTextarea().value += fieldName;
        this.showQueryableFieldValues(fieldName);
        this.toggleCellFocus(evt.target);
      });
  }

  /**
   * Muestra el tipo del campo seleccionado en el filtro avanzado
   *
   * @private
   * @function
   * @param {string} fieldName Nombre del campo consultable
   */
  async showQueryableFieldValues(fieldName) {
    const fieldType = await this.getQueryableFieldType(fieldName);
    const typeContainer = this.getAdvancedFilterContainer().querySelector('.m-catalogmanager-type');
    const typeTemplate = IDEE.template.compileSync(typeTableTemplate, {
      jsonp: true,
      vars: { fieldType },
    });
    typeContainer.innerHTML = `<p class="m-catalogmanager-headers">${getValue('advancedFilter.type')}</p>`;
    typeContainer.appendChild(typeTemplate);
  }

  /**
   * Obtiene la etiqueta traducida del tipo de un campo consultable
   *
   * @private
   * @function
   * @param {string} fieldName Nombre del campo
   * @returns {string} Etiqueta del tipo de dato
   */
  async getQueryableFieldType(fieldName) {
    const schema = this.advancedFilterState_.queryableFields[fieldName];
    if (!schema) {
      return getValue('advancedFilter.types.unknown');
    }
    let { type, format } = schema;
    const ref = schema.$ref;
    if (ref) {
      const refParts = ref.split('#');
      const url = refParts[0];
      const pathParts = refParts[1].substring(1).split('/');
      const response = await IDEE.remote.get(url);
      const refSchema = JSON.parse(response.text);
      let root = refSchema;
      pathParts.forEach((pathPart) => {
        root = root[pathPart];
      });
      type = root.type;
      format = root.format;
    }
    if (type === 'string' && format === 'date-time') {
      return getValue('advancedFilter.types.date');
    }
    if (type === 'string') {
      return getValue('advancedFilter.types.string');
    }
    if (type === 'number') {
      return getValue('advancedFilter.types.number');
    }
    if (type === 'integer') {
      return getValue('advancedFilter.types.integer');
    }
    if (type === 'boolean') {
      return getValue('advancedFilter.types.boolean');
    }
    return getValue('advancedFilter.types.unknown');
  }

  /**
   * Inserta un operador SQL en el textarea del filtro avanzado
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en un botón de operador
   */
  advancedFilterOperatorClick(evt) {
    const btn = evt.target;
    const textarea = this.getAdvancedFilterAssistantTextarea();
    switch (btn.innerHTML) {
      case '&#61;':
      case '=':
        textarea.value += ' = ';
        break;
      case '&lt;':
        textarea.value += ' < ';
        break;
      case '&gt;':
        textarea.value += ' > ';
        break;
      case '&lt;&gt;':
        textarea.value += ' <> ';
        break;
      case '&gt;=':
        textarea.value += ' >= ';
        break;
      case '&lt;=':
        textarea.value += ' <= ';
        break;
      default:
        textarea.value += ` ${btn.textContent.trim().toLowerCase()} `;
    }
  }

  /**
   * Divide una expresión SQL en condiciones separadas por el operador AND
   *
   * @private
   * @function
   * @param {string} sql Expresión SQL completa
   * @returns {Array<string>} Lista de condiciones individuales
   */
  splitSqlByAnd(sql) {
    const parts = [];
    let start = 0;
    let inQuote = null;
    for (let i = 0; i < sql.length; i += 1) {
      const char = sql[i];
      if (char === '\'' || char === '"') {
        if (inQuote === char) {
          inQuote = null;
        } else if (!inQuote) {
          inQuote = char;
        }
      }
      if (!inQuote && sql.slice(i, i + 5).toLowerCase() === ' and ') {
        parts.push(sql.slice(start, i).trim());
        start = i + 5;
        i += 4;
      }
    }
    const lastPart = sql.slice(start).trim();
    if (lastPart) {
      parts.push(lastPart);
    }
    return parts;
  }

  /**
   * Parsea una condición SQL en campo, operador y valor
   *
   * @private
   * @function
   * @param {string} condition Condición SQL (p. ej. 'cloud_cover < 20')
   * @returns {{field: string, operator: string, value: string}} Componentes de la condición
   * @throws {Error} Si la condición no es válida
   */
  parseSqlCondition(condition) {
    const operators = ['<=', '>=', '<>', '=', '<', '>'];
    let inQuote = null;
    let operator = null;
    let operatorIndex = -1;

    for (let i = 0; i < condition.length; i += 1) {
      const char = condition[i];
      if (char === '\'' || char === '"') {
        if (inQuote === char) {
          inQuote = null;
        } else if (!inQuote) {
          inQuote = char;
        }
      }
      if (!inQuote) {
        const foundOperator = operators.find((op) => condition.slice(i, i + op.length) === op);
        if (foundOperator) {
          operator = foundOperator;
          operatorIndex = i;
          break;
        }
      }
    }

    if (!operator || operatorIndex <= 0) {
      throw new Error('Invalid condition');
    }

    const fieldPart = condition.slice(0, operatorIndex).trim();
    const valuePart = condition.slice(operatorIndex + operator.length).trim();
    if (!fieldPart || !valuePart) {
      throw new Error('Invalid condition');
    }

    return {
      field: this.parseSqlFieldName(fieldPart),
      operator,
      value: valuePart,
    };
  }

  /**
   * Extrae el nombre de campo eliminando comillas si las tiene
   *
   * @private
   * @function
   * @param {string} fieldPart Parte izquierda de la condición SQL
   * @returns {string} Nombre del campo sin comillas
   */
  parseSqlFieldName(fieldPart) {
    const quoted = fieldPart.match(/^["'](.+)["']$/);
    return quoted ? quoted[1] : fieldPart;
  }

  /**
   * Convierte el valor literal de una condición SQL al tipo JavaScript adecuado
   *
   * @private
   * @function
   * @param {string} field Nombre del campo
   * @param {string} valueStr Valor en formato string de la condición
   * @returns {string|number|boolean} Valor parseado
   */
  parseSqlConditionValue(field, valueStr) {
    const schema = this.advancedFilterState_?.queryableFields[field];
    const trimmed = valueStr.trim();
    const quotedMatch = trimmed.match(/^['"](.*)['"]$/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return schema?.type === 'integer' ? parseInt(trimmed, 10) : Number(trimmed);
    }
    return trimmed;
  }

  /**
   * Convierte una expresión SQL en un objeto de consulta STAC (CQL2-like)
   *
   * @private
   * @function
   * @param {string} sql Expresión SQL del filtro avanzado
   * @returns {Object} Objeto de consulta STAC con operadores por campo
   * @throws {Error} Si contiene operadores no soportados
   */
  turnSqlIntoStacQuery(sql) {
    const trimmed = sql.trim();
    if (!trimmed) {
      return {};
    }
    const conditions = this.splitSqlByAnd(trimmed);
    const query = {};
    conditions.forEach((condition) => {
      const { field, operator, value } = this.parseSqlCondition(condition);
      const stacOperator = this.sqlToStacOperator_[operator];
      if (!stacOperator) {
        throw new Error(`Unsupported operator: ${operator}`);
      }
      if (!query[field]) {
        query[field] = {};
      }
      query[field][stacOperator] = this.parseSqlConditionValue(field, value);
    });
    return query;
  }

  /**
   * Asocia eventos de paginación a la tabla de campos consultables
   *
   * @private
   * @function
   */
  bindAdvancedFilterPagination() {
    const state = this.advancedFilterState_;
    if (state.fieldsTemplate) {
      state.fieldsTemplate.querySelectorAll('#m-attributetable-tfoot>button').forEach((btn) => {
        btn.addEventListener('click', (evt) => this.changeAdvancedFilterPage(evt));
      });
    }
  }

  /**
   * Cambia la página de campos consultables en el filtro avanzado
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en botón de paginación
   */
  changeAdvancedFilterPage(evt) {
    const state = this.advancedFilterState_;
    const totalPages = state.fieldsPages.length;
    let currentPage = state.currentFieldsPage;

    if (evt.target.id === 'prevBtn') {
      currentPage = currentPage > 0 ? currentPage - 1 : currentPage;
    } else {
      currentPage = currentPage < totalPages - 1 ? currentPage + 1 : currentPage;
    }

    state.currentFieldsPage = currentPage;
    this.renderQueryableFields();
  }

  /**
   * Marca visualmente la celda seleccionada en la tabla de campos
   *
   * @private
   * @function
   * @param {HTMLElement} cell Celda TD seleccionada
   */
  toggleCellFocus(cell) {
    const table = cell.closest('table');
    if (!table) {
      return;
    }
    table.querySelectorAll('td').forEach((td) => td.classList.remove('focus'));
    cell.classList.add('focus');
  }

  /**
   * Aplica el filtro avanzado y recarga los ítems de la colección
   *
   * @private
   * @function
   */
  applyAdvancedFilter() {
    const tab = this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-advanced-filters-tabs>div.active');
    if (tab.id === 'advanced-filter-tab-assistant') {
      this.applyAdvancedFilterAssistant();
    } else if (tab.id === 'advanced-filter-tab-query') {
      this.applyAdvancedFilterQuery();
    }
  }

  /**
   * Aplica el filtro avanzado del asistente SQL convirtiéndolo a stac-query
   *
   * @private
   * @function
   */
  applyAdvancedFilterAssistant() {
    const state = this.advancedFilterState_;
    const catalog = this.catalogs_[state.catalogIndex];
    const collection = catalog.collections[state.collectionIndex];
    const sqlExpression = this.getAdvancedFilterAssistantTextarea().value.trim();
    let filterObj;
    try {
      filterObj = this.turnSqlIntoStacQuery(sqlExpression);
    } catch (err) {
      console.error(err);
      IDEE.dialog.error(getValue('advancedFilter.invalidQuery'));
      return;
    }
    collection.advancedFilter = {
      format: 'stac-query',
      filter: filterObj,
      sqlExpression,
      limit: 10,
    };
    this.getFilteredItemsAdvanced();
  }

  /**
   * Aplica el filtro avanzado de la pestaña de consulta JSON (stac-query, cql-json o cql2-json)
   *
   * @private
   * @function
   */
  applyAdvancedFilterQuery() {
    const state = this.advancedFilterState_;
    const catalog = this.catalogs_[state.catalogIndex];
    const collection = catalog.collections[state.collectionIndex];
    const queryExpression = this.getAdvancedFilterQueryTextarea().value.trim();
    let jsonExpression;
    try {
      jsonExpression = JSON.parse(queryExpression);
    } catch (err) {
      console.error(err);
      IDEE.dialog.error(getValue('advancedFilter.invalidQuery'));
      return;
    }
    const format = this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-query-type').value;
    collection.advancedFilter = {
      format,
      filter: jsonExpression,
      queryExpression,
      limit: 10,
    };
    this.getFilteredItemsAdvanced();
  }

  /**
   * Ejecuta la búsqueda avanzada contra el catálogo STAC y renderiza los resultados
   *
   * @private
   * @function
   */
  getFilteredItemsAdvanced() {
    // this.updateBboxFilter();
    const state = this.advancedFilterState_;
    const catalog = this.catalogs_[state.catalogIndex];
    const collection = catalog.collections[state.collectionIndex];
    const bbox = this.commonFilters_.bbox || null;
    const datetime = this.commonFilters_.datetime || null;
    catalog.obj.getFilteredItemsAdvanced(collection.id, collection.advancedFilter, bbox, datetime)
      .then((items) => {
        collection.links = items.links;
        if (items.features.length === 0) {
          IDEE.dialog.info(getValue('exception').no_results);
          return;
        }
        this.renderCollectionItems(state.catalogIndex, state.collectionIndex, items);
        this.toggleAdvancedFilters();
      }).catch((err) => {
        console.error(err);
        IDEE.dialog.error(getValue('advancedFilter.applyError'));
      });
  }

  /**
   * Limpia el filtro avanzado y recarga los ítems sin filtro
   *
   * @private
   * @function
   */
  clearAdvancedFilter() {
    const state = this.advancedFilterState_;
    const catalog = this.catalogs_[state.catalogIndex];
    const collection = catalog.collections[state.collectionIndex];
    collection.advancedFilter = null;
    this.getAdvancedFilterAssistantTextarea().value = '';
    this.getAdvancedFilterQueryTextarea().value = '';
    state.selectedField = null;
    const itemsElement = this.template_.querySelector(`.m-catalogmanager-items.collection-${collection.id}`);
    if (itemsElement && !itemsElement.classList.contains('empty')) {
      this.getItems(state.catalogIndex, state.collectionIndex);
    }
  }

  /**
   * Renderiza la lista de ítems de una colección en el DOM
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @param {Object} items Respuesta STAC con features y links de paginación
   */
  renderCollectionItems(catalogIndex, collectionIndex, items) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    const container = this.template_.querySelector(`.m-catalogmanager-items.collection-${collection.id}`);
    const itemsJson = this.getJsonItems(items.features, catalogIndex, collectionIndex);
    collection.items = itemsJson;
    const html = IDEE.template.compileSync(itemsTemplate, {
      vars: {
        items: itemsJson,
        hasNotPrev: !this.linksHaveRel(items.links, 'previous'),
        hasNotNext: !this.linksHaveRel(items.links, 'next'),
        translations: {
          metadata: getValue('metadata'),
          previous: getValue('previous'),
          next: getValue('next'),
        },
      },
    });
    container.innerHTML = html.outerHTML;
    container.classList.remove('empty', 'hidden');
    container.querySelector('.m-catalogmanager-ulitems').addEventListener('click', (evt) => this.itemsEvent(evt));
    container.querySelector('.m-catalogmanager-next-items-button').addEventListener('click', (evt) => this.changeItemsPage(evt, 'next'));
    container.querySelector('.m-catalogmanager-prev-items-button').addEventListener('click', (evt) => this.changeItemsPage(evt, 'previous'));
    container.querySelectorAll('.m-catalogmanager-title-item').forEach((item) => {
      item.addEventListener('mouseenter', (evt) => this.applyFocusStyle(evt));
      item.addEventListener('mouseleave', (evt) => this.removeFocusStyle(evt));
    });
    const huella = this.getHuellaLayer(collection);
    if (huella) {
      huella.setSource(items);
    }
  }

  /**
   * Divide un array en páginas de tamaño fijo
   *
   * @private
   * @function
   * @param {Array} items Lista de elementos a paginar
   * @returns {Array<Array>} Lista de páginas
   */
  spliteList(items) {
    const pageSize = 5;
    const pages = [];
    let firstItem = 0;
    while (firstItem < items.length) {
      const newPage = [];
      for (let i = firstItem; i < firstItem + pageSize && i < items.length; i += 1) {
        if (items[i] !== undefined) {
          newPage.push(items[i]);
        }
      }
      pages.push(newPage);
      firstItem += pageSize;
    }
    return pages.length > 0 ? pages : [[]];
  }

  /**
   * Alterna la visibilidad entre el listado principal y el filtro avanzado
   *
   * @private
   * @function
   */
  toggleAdvancedFilters() {
    const commonFiltersBtn = this.template_.querySelector('#m-catalogmanager-filters');
    const sections = this.template_.querySelectorAll('section.m-catalogmanager-content');
    sections.forEach((section) => {
      if (!(section.id === 'm-catalogmanager-filters-content' && !commonFiltersBtn.classList.contains('active'))) {
        this.toggleHidden(section);
      }
    });
  }

  /**
   * Personaliza el texto del botón de cierre del modal informativo
   *
   * @private
   * @function
   */
  changeCloseButtonModal() {
    // Elements
    const button = document.querySelector(BT_CLOSE_MODAL);

    button.innerHTML = getValue('close');
  }

  /**
   * Añade un catálogo STAC desde el formulario del modal
   *
   * @private
   * @function
   */
  addCatalog() {
    const title = document.querySelector('.m-catalogmanager-add-panel #title').value;
    const url = document.querySelector('.m-catalogmanager-add-panel #catalog-url').value;
    const publicValue = document.querySelector('.m-catalogmanager-add-panel #cat-public').checked;
    const authUrl = document.querySelector('.m-catalogmanager-add-panel #auth-url').value;
    const user = document.querySelector('.m-catalogmanager-add-panel #user').value;
    const password = document.querySelector('.m-catalogmanager-add-panel #password').value;

    try {
      const catalog = new IDEE.stac.Catalog({
        title,
        url,
        public: publicValue,
        authUrl,
      });
      if (!publicValue) {
        catalog.authenticate(user, password);
      }
      this.catalogs_.push(this.getJsonCatalog(catalog));
      this.closeDialog();
      this.renderCatalogs();
    } catch (error) {
      console.error(error.message);
    }
  }

  /**
   * Abre un modal con los metadatos de un ítem STAC
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @param {string} itemId Identificador del ítem
   */
  openItemInfo(catalogIndex, collectionIndex, itemId) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    const item = collection.items.find((it) => it.id === itemId);
    const metadataTemplate = IDEE.template.compileSync(itemMetadataTemplate, {
      jsonp: true,
      parseToHtml: false,
      vars: {
        id: item.id,
        collectionId: collection.id,
        datetime: item.properties.datetime,
        provider: item.properties.provider || getValue('unknown'),
        extent: item.bbox.join(', '),
        crs: 'EPSG:4326',
        platform: item.properties.platform || getValue('unknown'),
        instruments: item.properties.instruments.join(', '),
        sunElevation: item.properties['view:sun_elevation'],
        cloudCover: item.properties['eo:cloud_cover'],
        processingLevel: item.properties.processing_level || getValue('unknown'),
        translations: getValue('itemMetadata'),
      },
    });
    IDEE.dialog.info(metadataTemplate, getValue('itemMetadata.title'), this.order);
    this.changeCloseButtonModal();
  }

  openCollectionInfo(catalogIndex, collectionIndex) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    const infoTemplate = IDEE.template.compileSync(collectionMetadataTemplate, {
      jsonp: true,
      parseToHtml: false,
      vars: {
        metadata: collection.metadata,
        translations: getValue('collectionMetadata'),
      },
    });
    IDEE.dialog.info(infoTemplate, getValue('collectionMetadata.title'), this.order);
    this.changeCloseButtonModal();
  }

  /**
   * Muestra u oculta los campos de autenticación según el checkbox público
   *
   * @private
   * @function
   */
  togglePublic() {
    const publicValue = document.querySelector('.m-catalogmanager-add-panel #cat-public').checked;
    if (publicValue) {
      document.querySelector('.m-catalogmanager-add-panel .private-data').classList.add('hidden');
    } else {
      document.querySelector('.m-catalogmanager-add-panel .private-data').classList.remove('hidden');
    }
  }

  /**
   * Renderiza la lista de catálogos en el panel principal
   *
   * @private
   * @function
   */
  renderCatalogs() {
    const contentElement = this.template_.querySelector('#m-catalogmanager-list-content');
    const translations = {
      catalogs: getValue('catalogs'),
      public: getValue('cat_public'),
      private: getValue('private'),
    };
    const html = IDEE.template.compileSync(contentTemplate, {
      vars: {
        catalogs: this.catalogs_,
        translations,
      },
    });
    contentElement.innerHTML = html.innerHTML;
    contentElement.querySelector('.m-catalogmanager-ulcatalogs').addEventListener('click', (evt) => this.catalogEvent(evt));
  }

  /**
   * Crea la representación JSON interna de un catálogo STAC
   *
   * @private
   * @function
   * @param {IDEE.stac.Catalog} catalog Instancia del catálogo STAC
   * @returns {Object} Objeto catálogo con metadatos y referencia al objeto STAC
   */
  getJsonCatalog(catalog) {
    const index = this.catalogs_.length;
    return {
      index,
      title: catalog.title,
      public: catalog.public,
      obj: catalog,
      layerGroup: null,
      collections: [],
    };
  }

  /**
   * Gestiona el clic en un catálogo para expandir o contraer sus colecciones
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el listado de catálogos
   */
  catalogEvent(evt) {
    const target = this.findParentByClass(evt.target, 'm-catalogmanager-title-catalog');
    const catalogIndex = target.dataset.catalogIndex;
    const collectionsElement = this.template_.querySelector(`.m-catalogmanager-collections.catalog-${catalogIndex}`);
    if (collectionsElement.classList.contains('empty')) {
      this.getCollections(catalogIndex, collectionsElement);
    }
    this.toggleHidden(collectionsElement);
  }

  /**
   * Alterna la clase CSS 'hidden' de un elemento
   *
   * @private
   * @function
   * @param {HTMLElement} elem Elemento DOM a mostrar u ocultar
   */
  toggleHidden(elem) {
    if (elem.classList.contains('hidden')) {
      elem.classList.remove('hidden');
    } else {
      elem.classList.add('hidden');
    }
  }

  /**
   * Obtiene y renderiza las colecciones de un catálogo STAC
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {HTMLElement} collectionsElement Contenedor DOM de las colecciones
   */
  getCollections(catalogIndex, collectionsElement) {
    const catalog = this.catalogs_[catalogIndex];
    const container = collectionsElement;
    catalog.obj.getCollections().then((collections) => {
      const collectionsJson = this.getJsonCollections(collections, catalogIndex);
      catalog.collections = collectionsJson;
      const html = IDEE.template.compileSync(collectionsTemplate, {
        vars: {
          collections: collectionsJson,
          translations: {
            footprint: getValue('footprint'),
            metadata: getValue('metadata'),
            advancedFilters: getValue('advancedFilters'),
          },
        },
      });
      container.innerHTML = html.outerHTML;
      container.classList.remove('empty');
      container.querySelector('.m-catalogmanager-ulcollections').addEventListener('click', (evt) => this.collectionEvent(evt));
    });
  }

  /**
   * Transforma las colecciones STAC en objetos JSON internos
   *
   * @private
   * @function
   * @param {Array<Object>} collections Colecciones devueltas por la API STAC
   * @param {number} catalogIndex Índice del catálogo padre
   * @returns {Array<Object>} Lista de colecciones con metadatos internos
   */
  getJsonCollections(collections, catalogIndex) {
    return collections.map((collection, index) => {
      const metadata = {
        extent: collection.extent,
        license: collection.license,
        summaries: collection.summaries,
        description: collection.description,
        stacVersion: collection.stac_version,
      };
      if (metadata.extent?.spatial?.bbox) {
        metadata.extent.spatial.bbox = metadata.extent.spatial.bbox.map((bbox) => bbox.join(', ')).join(' / ');
      }
      if (metadata.extent?.temporal?.interval) {
        metadata.extent.temporal.interval = metadata.extent.temporal.interval.map((interval) => interval.join(' / ')).join(', ');
      }
      if (!metadata.summaries) {
        metadata.summaries = {};
      }
      if (metadata.summaries.platform) {
        metadata.summaries.platform = metadata.summaries.platform.join(', ');
      } else {
        metadata.summaries.platform = getValue('unknown');
      }
      if (metadata.summaries.instruments) {
        metadata.summaries.instruments = metadata.summaries.instruments.join(', ');
      } else {
        metadata.summaries.instruments = getValue('unknown');
      }
      return {
        index,
        id: collection.id,
        title: collection.title,
        metadata,
        catalogIndex,
        layer: null,
        items: [],
        advancedFilter: null,
      };
    });
  }

  /**
   * Gestiona el clic en una colección (ítems, huella o filtro avanzado)
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el listado de colecciones
   */
  collectionEvent(evt) {
    evt.stopPropagation();
    const target = this.findParentByClass(evt.target, 'm-catalogmanager-title-collection');
    const catalogIndex = target.dataset.catalogIndex;
    const collectionIndex = target.dataset.collectionIndex;
    const collectionId = target.dataset.collectionId;
    if (evt.target.classList.contains('m-catalogmanager-footprint-button')) {
      this.previewItems(catalogIndex, collectionIndex);
      return;
    }
    if (evt.target.classList.contains('m-catalogmanager-filter-button')) {
      this.openAdvancedFilters(catalogIndex, collectionIndex);
      return;
    }
    if (evt.target.classList.contains('m-catalogmanager-info-button')) {
      this.openCollectionInfo(catalogIndex, collectionIndex);
      return;
    }
    const itemsElement = this.template_.querySelector(`.m-catalogmanager-items.collection-${collectionId}`);
    if (itemsElement.classList.contains('empty')) {
      this.getItems(catalogIndex, collectionIndex);
    }
    this.toggleHidden(itemsElement);
  }

  /**
   * Obtiene y renderiza los ítems de una colección aplicando filtros activos
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   */
  getItems(catalogIndex, collectionIndex) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    let promise = null;
    const bbox = this.commonFilters_.bbox || null;
    if (collection.advancedFilter) {
      promise = catalog.obj
        .getFilteredItemsAdvanced(collection.id, collection.advancedFilter, bbox);
    } else if (!IDEE.utils.isNullOrEmpty(this.commonFilters_)) {
      promise = catalog.obj.getFilteredItems(collection.id, this.commonFilters_);
    } else {
      promise = catalog.obj.getItems(collection.id);
    }
    promise.then((items) => {
      collection.links = items.links;
      if (items.features.length === 0) {
        IDEE.dialog.info(getValue('exception').no_results);
        return;
      }
      this.renderCollectionItems(catalogIndex, collectionIndex, items);
    });
  }

  /**
   * Navega entre páginas de ítems usando los enlaces de paginación STAC
   *
   * @private
   * @function
   * @param {Event} event Evento de clic en botón de paginación
   * @param {string} rel Relación del enlace STAC ('next' o 'previous')
   */
  changeItemsPage(event, rel) {
    event.stopPropagation();
    const target = this.findParentByClass(event.target, 'm-catalogmanager-items');
    const catalogIndex = target.dataset.catalogIndex;
    const collectionIndex = target.dataset.collectionIndex;
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    let promise = null;
    if (collection.advancedFilter) {
      promise = catalog.obj.getFilteredItemsAdvancedByLinks(collection.links, rel);
    } else {
      promise = catalog.obj.getItemsByLinks(collection.links, rel);
    }
    promise.then((items) => {
      collection.links = items.links;
      if (items.features.length === 0) {
        IDEE.dialog.info(getValue('exception').no_results);
        return;
      }
      this.renderCollectionItems(catalogIndex, collectionIndex, items);
    });
  }

  /**
   * Transforma los ítems STAC en objetos JSON internos para la plantilla
   *
   * @private
   * @function
   * @param {Array<Object>} items Features STAC
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @returns {Array<Object>} Lista de ítems con metadatos internos
   */
  getJsonItems(items, catalogIndex, collectionIndex) {
    return items.map((item, index) => {
      return {
        index,
        id: item.id,
        collectionIndex,
        catalogIndex,
        properties: item.properties,
        bbox: item.bbox,
      };
    });
  }

  /**
   * Gestiona el clic en un ítem (metadatos o imágenes)
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el listado de ítems
   */
  itemsEvent(evt) {
    evt.stopPropagation();
    const target = evt.target;
    const itemDiv = this.findParentByClass(evt.target, 'm-catalogmanager-title-item');
    const catalogIndex = itemDiv.dataset.catalogIndex;
    const collectionIndex = itemDiv.dataset.collectionIndex;
    const itemId = itemDiv.dataset.itemId;
    if (target.classList.contains('m-catalogmanager-info-button')) {
      this.openItemInfo(catalogIndex, collectionIndex, itemId);
    } else {
      const imagesElement = this.template_.querySelector(`.m-catalogmanager-images.item-${itemId}`);
      if (imagesElement.classList.contains('empty')) {
        this.getItemImages(catalogIndex, collectionIndex, itemId, imagesElement);
      }
      this.toggleHidden(imagesElement);
    }
  }

  /**
   * Gestiona la selección de un ítem en el mapa y abre su diálogo de imágenes
   *
   * @private
   * @function
   * @param {string} itemId Identificador del ítem STAC seleccionado
   */
  onItemSelect(itemId) {
    const itemElement = this.template_.querySelector(`#${itemId}`);
    const catalogIndex = itemElement.dataset.catalogIndex;
    const collectionIndex = itemElement.dataset.collectionIndex;

    this.getItemImages(catalogIndex, collectionIndex, itemId, null, true);
  }

  /**
   * Obtiene y renderiza las imágenes TIFF de un ítem STAC
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @param {string} itemId Identificador del ítem
   * @param {HTMLElement|null} imagesElement Contenedor DOM de las imágenes
   * @param {boolean} [openDialog=false] Si es verdadero, abre un modal con las imágenes
   */
  getItemImages(catalogIndex, collectionIndex, itemId, imagesElement, openDialog = false) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    catalog.obj.getItem(collection.id, itemId).then((item) => {
      let assetsKeys = Object.keys(item.assets);
      assetsKeys = assetsKeys.filter((key) => item.assets[key].type.includes('image/tif'));
      const container = imagesElement;
      let content = '';
      let html = null;
      if (assetsKeys.length === 0) {
        content = `<div class="m-catalogmanager-no-images">${getValue('no_images')}</div>`;
      } else {
        const images = assetsKeys.map((key) => {
          return {
            key,
            itemId,
            collectionIndex,
            catalogIndex,
            title: item.assets[key].title,
          };
        });
        html = IDEE.template.compileSync(imagesTemplate, {
          vars: {
            images,
            downloadable: !catalog.obj.public,
            translations: {
              imageActions: getValue('imageActions'),
              images: getValue('images'),
              actions: getValue('actions'),
            },
          },
        });
      }
      if (openDialog) {
        IDEE.dialog.info(html ? html.outerHTML : content, item.id, this.order);
        document.querySelector('div.m-dialog.info .m-catalogmanager-tableimages').addEventListener('click', (evt) => this.imagesEvent(evt));
        this.changeCloseButtonModal();
      } else {
        if (html) {
          html.addEventListener('click', (evt) => this.imagesEvent(evt));
          container.appendChild(html);
        } else {
          container.innerHTML = content;
        }
        container.classList.remove('empty');
      }
    });
  }

  /**
   * Gestiona acciones sobre una imagen (previsualizar o descargar)
   *
   * @private
   * @function
   * @param {Event} evt Evento de clic en el listado de imágenes
   */
  imagesEvent(evt) {
    evt.stopPropagation();
    const target = evt.target;
    const imageDiv = this.findParentByClass(target, 'm-catalogmanager-title-image');
    const imageKey = imageDiv.dataset.imageKey;
    const collectionIndex = imageDiv.dataset.collectionIndex;
    const catalogIndex = imageDiv.dataset.catalogIndex;
    const itemId = imageDiv.dataset.itemId;
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    if (target.classList.contains('m-catalogmanager-preview-button')) {
      this.closeDialog();
      catalog.obj.getItem(collection.id, itemId).then((item) => {
        const asset = item.assets[imageKey];
        this.drawImageTiff(asset, catalog, collection);
        const itemBbox = item.bbox;
        this.map_.setBbox(this.getImpl().transformExtent(itemBbox, 'EPSG:4326', this.map_.getProjection().code));
      });
    } else if (target.classList.contains('m-catalogmanager-download-button')) {
      this.closeDialog();
      catalog.obj.getItem(collection.id, itemId).then((item) => {
        const asset = item.assets[imageKey];
        window.open(asset.href, '_blank');
      });
    } else if (target.classList.contains('m-catalogmanager-histogram-button')) {
      this.closeDialog();
      catalog.obj.getItem(collection.id, itemId).then((item) => {
        const asset = item.assets[imageKey];
        this.getHistogram(asset);
      });
    }
  }

  /**
   * Inicia una descarga nativa del navegador sin cargar el fichero en memoria
   *
   * @private
   * @function
   * @param {string} url URL del asset
   * @param {string} filename Nombre sugerido del fichero
   */
  downloadViaBrowser(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /**
   * Espera un intervalo de tiempo
   *
   * @private
   * @function
   * @param {number} ms Milisegundos de espera
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Descarga masivamente mediante el gestor de descargas del navegador (fallback)
   *
   * @private
   * @function
   * @param {Array<Object>} tasks Tareas de descarga
   * @returns {Promise<void>}
   */
  async masiveDownloadToBrowserDownloads(tasks) {
    const usedNames = new Set();
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    this.showMasiveDownloadProgress(0, tasks.length, '');

    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
      const task = tasks[taskIndex];
      try {
        // eslint-disable-next-line no-await-in-loop
        const asset = await this.resolveMasiveDownloadAsset(task);
        const filename = this.ensureUniqueDownloadFilename(
          this.sanitizeDownloadFilename(asset.title),
          usedNames,
        );
        usedNames.add(filename);
        this.showMasiveDownloadProgress(taskIndex + 1, tasks.length, filename);
        this.downloadViaBrowser(asset.href, filename);
        // eslint-disable-next-line no-await-in-loop
        await this.delay(BROWSER_DOWNLOAD_DELAY_MS);
        successCount += 1;
      } catch (err) {
        failedCount += 1;
        errors.push({
          filename: task.imageKey,
          message: err.message || getValue('masiveDownload.error'),
        });
        console.error(err);
      }
    }

    this.hideMasiveDownloadProgress();
    this.clearSelection();
    this.showMasiveDownloadCompleteMessage(successCount, failedCount, errors, true);
  }

  /**
   * Añade una capa GeoTIFF al mapa dentro del grupo de capas del catálogo
   *
   * @private
   * @function
   * @param {Object} image Asset STAC con href y title de la imagen
   * @param {Object} cat Objeto catálogo interno
   * @param {Object} coll Objeto colección interno
   */
  drawImageTiff(image, cat, coll) {
    const catalog = cat;
    const collection = coll;
    const styleSpec = this.resolveStyleSpec(image);
    const style = this.buildWebGlStyle(styleSpec);
    const geotiff = new IDEE.layer.GeoTIFF({
      url: image.href,
      name: image.title,
      legend: image.title,
    }, {
      convertToRGB: false,
      style,
    });
    if (catalog.layerGroup === null) {
      catalog.layerGroup = new IDEE.layer.LayerGroup({
        name: catalog.title,
        legend: catalog.title,
      });
      this.map_.addLayerGroups(catalog.layerGroup);
    }
    if (!collection.layerGroup) {
      collection.layerGroup = new IDEE.layer.LayerGroup({
        name: collection.title,
        legend: collection.title,
      });
      catalog.layerGroup.addLayers(collection.layerGroup);
    }
    collection.layerGroup.addLayers(geotiff);
  }

  /**
   * Muestra la huella (footprint) de los ítems de una colección en el mapa
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   */
  previewItems(catalogIndex, collectionIndex) {
    const catalog = this.catalogs_[catalogIndex];
    if (catalog.layerGroup === null) {
      catalog.layerGroup = new IDEE.layer.LayerGroup({
        name: catalog.title,
        legend: catalog.title,
      });
      this.map_.addLayerGroups(catalog.layerGroup);
    }
    const collection = catalog.collections[collectionIndex];
    let promise = null;
    if (collection.links && this.linksHaveRel(collection.links, 'self')) {
      promise = catalog.obj.getItemsByLinks(collection.links, 'self');
    } else if (collection.advancedFilter) {
      promise = catalog.obj.getFilteredItemsAdvanced(
        collection.id,
        collection.advancedFilter,
        this.commonFilters_.bbox,
        this.commonFilters_.datetime,
      );
    } else if (!IDEE.utils.isNullOrEmpty(this.commonFilters_)) {
      promise = catalog.obj.getFilteredItems(collection.id, this.commonFilters_);
    } else {
      promise = catalog.obj.getItems(collection.id, 10);
    }
    promise.then((items) => {
      if (items.features.length === 0) {
        IDEE.dialog.info(getValue('exception').no_results);
        return;
      }
      if (!collection.layerGroup) {
        collection.layerGroup = new IDEE.layer.LayerGroup({
          name: collection.title,
          legend: collection.title,
        });
        catalog.layerGroup.addLayers(collection.layerGroup);
      }
      const huella = this.getHuellaLayer(collection);
      if (huella) {
        huella.setSource(items);
      } else {
        const layer = new IDEE.layer.GeoJSON({
          name: collection.id,
          legend: 'Huella',
          source: items,
          extract: true,
        });
        collection.layerGroup.addLayers(layer);
        this.getImpl().addLayerToSelectItem(layer.getImpl().getLayer());
      }
    });
  }

  getHistogram(asset) {
    const bands = asset['eo:bands']?.map((band, index) => index + 1) ?? [];
    const currentMouseCursorStyle = document.body.style.cursor ?? 'auto';
    document.body.style.cursor = 'wait';
    IDEE.gdalUtils.getHistogramGdalinfo(asset.href, bands)
      .then((histogram) => {
        this.showHistogramDialog(asset, histogram, bands);
      })
      .catch((err) => {
        console.error(err);
        IDEE.dialog.error(getValue('histogramDialog.loadError'));
      })
      .finally(() => {
        document.body.style.cursor = currentMouseCursorStyle;
      });
  }

  /**
   * Muestra el modal con el histograma de la imagen
   *
   * @private
   * @function
   * @param {Object} asset Asset STAC con href y title
   * @param {Object} histogram Datos del histograma por banda
   * @param {Array<number>} bandsIndex Bandas disponibles
   */
  showHistogramDialog(asset, histogram, bandsIndex) {
    this.destroyHistogramChart();
    this.histogramData_ = histogram;
    const bands = asset['eo:bands']?.map((band, index) => ({ name: band.name, index: index + 1 })) ?? [];

    const histogramHtml = IDEE.template.compileSync(histogramTemplate, {
      parseToHtml: false,
      vars: {
        bands,
        translations: getValue('histogramDialog'),
      },
    });
    const title = `${getValue('histogramDialog.title')} - ${asset.title || asset.href}`;
    IDEE.dialog.info(histogramHtml, title, this.order);
    this.changeCloseButtonModal();

    const dialogContent = document.querySelector('.m-dialog.info .m-content');
    const canvas = dialogContent?.querySelector('.m-catalogmanager-histogram-canvas');
    const statsContainer = dialogContent?.querySelector('.m-catalogmanager-histogram-stats-container');
    const bandSelect = dialogContent?.querySelector('.m-catalogmanager-histogram-band-select');
    const closeButton = document.querySelector(BT_CLOSE_MODAL);

    if (!canvas || !bandSelect) {
      return;
    }

    const defaultBand = bands[0].index;
    bandSelect.value = String(defaultBand);
    this.renderHistogramChart(canvas, Number(defaultBand));
    this.renderHistogramStats(statsContainer, Number(defaultBand));

    bandSelect.addEventListener('change', (evt) => {
      this.renderHistogramChart(canvas, Number(evt.target.value));
      this.renderHistogramStats(statsContainer, Number(evt.target.value));
    });

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.destroyHistogramChart();
        this.histogramData_ = null;
      }, { once: true });
    }
  }

  /**
   * Construye las etiquetas del eje X a partir de los metadatos del histograma
   *
   * @private
   * @function
   * @param {Object} bandHistogram Datos de histograma de una banda
   * @returns {Array<number|string>} Etiquetas del eje X
   */
  buildHistogramLabels(bandHistogram) {
    const { buckets } = bandHistogram;
    return buckets.map((_, index) => index);
    /* if (min == null || max == null) {
      return buckets.map((_, index) => index);
    }
    const step = (max - min) / buckets.length;
    return buckets.map((_, index) => Math.round((min + (index + 0.5) * step) * 100) / 100); */
  }

  /**
   * Renderiza el gráfico de histograma con Chart.js
   *
   * @private
   * @function
   * @param {HTMLCanvasElement} canvas Canvas donde dibujar el gráfico
   * @param {number} band Número de banda
   */
  renderHistogramChart(canvas, band) {
    const bandHistogram = this.histogramData_?.[band];
    if (!bandHistogram) {
      return;
    }

    this.destroyHistogramChart();
    const colors = HISTOGRAM_BAND_COLORS[band.index] || {
      border: 'rgb(20, 138, 235)',
      background: 'rgba(20, 138, 235, 0.6)',
    };
    const translations = getValue('histogramDialog');

    this.histogramChart_ = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.buildHistogramLabels(bandHistogram),
        datasets: [{
          label: `${translations.band} ${band}`,
          data: bandHistogram.buckets,
          borderColor: colors.border,
          backgroundColor: colors.background,
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: translations.pixelValue,
            },
            ticks: {
              maxTicksLimit: 12,
            },
          },
          y: {
            title: {
              display: true,
              text: translations.frequency,
            },
            beginAtZero: true,
          },
        },
      },
    });
  }

  renderHistogramStats(statsContainer, band) {
    const bandHistogram = this.histogramData_?.[band];
    if (!bandHistogram) {
      return;
    }
    const container = statsContainer;
    const statsHtml = IDEE.template.compileSync(histogramStatsTemplate, {
      parseToHtml: false,
      vars: {
        translations: getValue('histogramDialog'),
        pixelCount: bandHistogram.pixelCount,
        min: bandHistogram.min,
        max: bandHistogram.max,
        mean: bandHistogram.mean,
        stddev: bandHistogram.stddev,
      },
    });
    container.innerHTML = statsHtml;
  }

  /**
   * Destruye la instancia activa del gráfico de histograma
   *
   * @private
   * @function
   */
  destroyHistogramChart() {
    if (this.histogramChart_) {
      this.histogramChart_.destroy();
      this.histogramChart_ = null;
    }
  }

  /**
   * Actualiza el listado de ítems
   *
   * @private
   * @function
   */
  updateItems() {
    const itemsElements = this.template_.querySelectorAll('.m-catalogmanager-items');
    itemsElements.forEach((itemsElement) => {
      const ie = itemsElement;
      if (!ie.classList.contains('hidden')) {
        const catalogIndex = ie.dataset.catalogIndex;
        const collectionIndex = ie.dataset.collectionIndex;
        this.updateBboxFilter();
        this.updateTemporalFilter();
        this.getItems(catalogIndex, collectionIndex);
      } else if (!ie.classList.contains('empty')) {
        ie.classList.add('empty');
        ie.innerHTML = '';
      }
    });
  }

  /**
   * Actualiza el filtro espacial si está activo el modo de extensión de vista
   *
   * @private
   * @function
   */
  updateBboxFilter() {
    const btnView = this.template_.querySelector('.m-catalogmanager-filters-spatial-predefined #view');
    if (btnView && btnView.classList.contains('active')) {
      const bbox = this.map_.getBbox();
      const extent = [bbox.x.min, bbox.y.min, bbox.x.max, bbox.y.max];
      this.setSpatialFilterByExtent(this.getImpl().transformExtent(extent, this.map_.getProjection().code, 'EPSG:4326'));
    }
  }

  /**
   * Actualiza el filtro temporal si está activo el modo de rango personalizado
   *
   * @private
   * @function
   */
  updateTemporalFilter() {
    const btnRange = this.template_.querySelector('#m-catalogmanager-filters-temporal-predefined #range');
    if (btnRange && btnRange.classList.contains('active')) {
      this.setTemporalFilterByType('range');
    }
  }

  /**
   * Obtiene la capa de huella (footprint) de una colección
   *
   * @private
   * @function
   * @param {Object} collection Objeto de colección con layerGroup
   * @returns {IDEE.layer.Vector|undefined} Capa de huella o indefinido si no existe
   */
  getHuellaLayer(collection) {
    const collectionLayerGroup = collection.layerGroup;
    if (!collectionLayerGroup) {
      return;
    }
    return collectionLayerGroup.getLayers().find((layer) => layer.legend === 'Huella');
  }

  /**
   * Resalta en el mapa la huella del ítem bajo el cursor
   *
   * @private
   * @function
   * @param {Event} evt Evento mouseenter sobre el título del ítem
   */
  applyFocusStyle(evt) {
    evt.stopPropagation();
    const target = evt.target;
    const catalogIndex = target.dataset.catalogIndex;
    const collectionIndex = target.dataset.collectionIndex;
    const itemId = target.dataset.itemId;
    const collection = this.catalogs_[catalogIndex].collections[collectionIndex];
    const huella = this.getHuellaLayer(collection);
    if (!huella) {
      return;
    }
    this.clearFocusStyle(huella);
    const itemFeature = huella.getFeatureById(itemId);
    if (itemFeature) {
      itemFeature.setStyle(this.focusStyle_);
    }
  }

  /**
   * Elimina el resaltado de huella al salir del ítem con el cursor
   *
   * @private
   * @function
   * @param {Event} evt Evento mouseleave sobre el título del ítem
   */
  removeFocusStyle(evt) {
    evt.stopPropagation();
    const target = evt.target;
    const catalogIndex = target.dataset.catalogIndex;
    const collectionIndex = target.dataset.collectionIndex;
    const collection = this.catalogs_[catalogIndex].collections[collectionIndex];
    const huella = this.getHuellaLayer(collection);
    if (!huella) {
      return;
    }
    this.clearFocusStyle(huella);
  }

  /**
   * Restablece el estilo por defecto de la feature con resaltado activo
   *
   * @private
   * @function
   * @param {IDEE.layer.Vector} huellaLayer Capa de huella de la colección
   */
  clearFocusStyle(huellaLayer) {
    const focusFeature = huellaLayer.getFeatures().find((feature) => feature.getStyle() !== null);
    if (focusFeature) {
      focusFeature.setStyle(null);
    }
  }

  /**
   * Busca el ancestro DOM más cercano que contenga una clase CSS dada
   *
   * @private
   * @function
   * @param {HTMLElement} elem Elemento de partida
   * @param {string} className Nombre de la clase a buscar
   * @returns {HTMLElement|null} Elemento ancestro encontrado o null
   */
  findParentByClass(elem, className) {
    let parent = elem;
    while (parent && !parent.classList.contains(className)) {
      parent = parent.parentElement;
    }
    return parent;
  }

  /**
   * Comprueba si existe un enlace STAC con la relación indicada
   *
   * @private
   * @function
   * @param {Array<Object>} links Enlaces de paginación STAC
   * @param {string} rel Relación del enlace ('next', 'previous', 'self', etc.)
   * @returns {boolean} true si existe el enlace con esa relación
   */
  linksHaveRel(links, rel) {
    return links.some((link) => link.rel === rel);
  }

  /**
   * Mapea bandas espectrales a índices RGB por common_name
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset
   * @param {Array<string>} channelNames Nombres de canal ('red', 'green', 'blue')
   * @returns {{r: number, g: number, b: number}|null} Índices de bandas o null si no se encuentran
   */
  mapBandsByCommonName(eoBands, channelNames) {
    const indices = {};
    const bandsNumber = {
      gray: 1,
      red: 1,
      green: 2,
      blue: 3,
    };
    eoBands.forEach((band, i) => {
      const key = band.common_name?.toLowerCase();
      if (key) {
        indices[key] = bandsNumber[key];
      }
    });
    const [redName, greenName, blueName] = channelNames;
    const r = indices[redName];
    const g = indices[greenName];
    const b = indices[blueName];
    if (r && g && b) {
      return [r, g, b];
    }
    return null;
  }

  /**
   * Combina los metadatos de bandas STAC (eo:bands, raster:bands, bands)
   *
   * @private
   * @function
   * @param {Object} asset Asset STAC
   * @returns {Array<Object>} Bandas unificadas por índice
   */
  getAssetBands(asset) {
    const eoBands = asset['eo:bands'];
    const rasterBands = asset['raster:bands'];
    const bands = asset.bands;

    if (Array.isArray(bands) && bands.length > 0) {
      return bands;
    }

    if (Array.isArray(eoBands) && eoBands.length > 0) {
      if (Array.isArray(rasterBands)) {
        return eoBands.map((band, index) => ({
          ...band,
          ...(rasterBands[index] || {}),
        }));
      }
      return eoBands;
    }

    if (Array.isArray(rasterBands) && rasterBands.length > 0) {
      return rasterBands;
    }

    return [];
  }

  /**
   * Determina los índices de bandas RGB para el estilo WebGL según los metadatos del asset
   *
   * @private
   * @function
   * @param {Object} asset Asset STAC con metadatos eo:bands
   * @returns {{bands: {r: number, g: number, b: number}}|null} Índices de banda o null
   */
  resolveStyleSpec(asset) {
    let spec = null;
    const eoBands = this.getAssetBands(asset);
    if (!Array.isArray(eoBands) || eoBands.length === 0) {
      return null;
    }

    // RGB Monobanda
    if (eoBands.length === 1) {
      const commonName = eoBands[0].common_name?.toLowerCase();
      const rgbChannels = {
        red: [1, 0, 0],
        green: [0, 1, 0],
        blue: [0, 0, 1],
      };
      if (commonName && rgbChannels[commonName]) {
        spec = { bands: rgbChannels[commonName] };
      } else {
        spec = { bands: [1, 1, 1] };
      }
    } else {
      // RGB multiBanda
      const rgbBands = this.mapBandsByCommonName(eoBands, ['red', 'green', 'blue']);
      if (rgbBands) {
        spec = { bands: rgbBands };
      } else if (eoBands.length >= 3) {
        spec = { bands: [1, 2, 3] };
      } else { // Escala de grises
        spec = { bands: [1, 1, 1] };
      }
    }
    const bandDisplayOrder = asset.band_display_order;
    if (bandDisplayOrder) {
      spec.bands = this.reorderBands(eoBands, bandDisplayOrder);
    }
    return spec;
  }

  /**
   * Reordena los índices de banda según band_display_order (nombre o índice numérico)
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset
   * @param {Array<string>} bandDisplayOrder Orden de visualización definido en el asset
   * @returns {Array<number>} Índices de banda reordenados (base 1)
   */
  reorderBands(eoBands, bandDisplayOrder) {
    const reorderedBands = [];
    bandDisplayOrder.forEach((bandName, index) => {
      let bandIndex = -1;
      bandIndex = Number.parseInt(bandName, 10);
      if (Number.isNaN(bandIndex)) {
        bandIndex = eoBands.findIndex((b) => b.name?.toLowerCase() === bandName.toLowerCase());
        if (bandIndex !== -1) {
          bandIndex += 1;
        }
      }
      if (bandIndex !== -1) {
        reorderedBands.push(bandIndex);
      } else {
        reorderedBands.push(index + 1);
      }
    });
    return reorderedBands;
  }

  /**
   * Reordena los índices de banda alternativamente según band_display_order
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset
   * @param {Array<string>} bandDisplayOrder Orden de visualización definido en el asset
   * @returns {Array<number>} Índices de banda reordenados (base 1)
   */
  reorderBandsAlt(eoBands, bandDisplayOrder) {
    const reorderedBands = [];
    eoBands.forEach((band, index) => {
      let bandIndex = -1;
      bandIndex = bandDisplayOrder.findIndex((b) => b.toLowerCase() === band.name.toLowerCase());
      if (bandIndex !== -1) {
        bandIndex += 1;
      }
      if (bandIndex !== -1) {
        reorderedBands.push(bandIndex);
      } else {
        reorderedBands.push(index + 1);
      }
    });
    return reorderedBands;
  }

  /**
   * Construye el estilo WebGL de OpenLayers a partir de una especificación de bandas.
   * La normalización de valores la realiza la fuente GeoTIFF (normalize: true por defecto).
   * Los píxeles con valor nodata (0) se renderizan transparentes.
   *
   * @private
   * @function
   * @param {{bands: Array<number>}} spec Índices de banda
   * @returns {Object|null} Estilo WebGL para IDEE.layer.GeoTIFF
   */
  buildWebGlStyle(spec) {
    if (!spec) {
      return null;
    }
    const bands = spec.bands;
    const channelValue = (bandIndex) => (bandIndex ? ['band', bandIndex] : 0);
    const styleBands = ['array'];
    for (let i = 0; i < bands.length && i < 3; i += 1) {
      styleBands.push(channelValue(bands[i]));
    }
    styleBands.push(1);
    return {
      variables: {
        nodata: 0,
      },
      color: [
        'case',
        ['==', ['band', 1], ['var', 'nodata']],
        [0, 0, 0, 0],
        styleBands,
      ],
    };
  }

  /**
   * Cierra el modal informativo activo simulando un clic en su botón de cierre
   *
   * @private
   * @function
   */
  closeDialog() {
    const buttonClose = document.querySelector('div.m-dialog.info div.m-button > button');
    if (buttonClose) {
      buttonClose.click();
    }
  }

  /**
   * Esta función compara controles
   *
   * @public
   * @function
   * @param {IDEE.Control} control Control a comparar
   * @returns {boolean} true si ambos controles son instancias de CatalogmanagerControl
   * @api stable
   */
  equals(control) {
    return control instanceof CatalogmanagerControl;
  }

  // DESCARGA MASIVA
  // ----------------------------------------------------------------------------------------------

  /**
   * Desmarca todas las imágenes TIFF seleccionadas en el panel y en el modal activo
   *
   * @private
   * @function
   */
  clearSelection() {
    const roots = [this.template_];
    const dialog = document.querySelector('div.m-dialog.info');
    if (dialog) {
      roots.push(dialog);
    }
    roots.forEach((root) => {
      const checkedInputs = root.querySelectorAll('.m-catalogmanager-checkbox-image:checked');
      for (let i = 0; i < checkedInputs.length; i += 1) {
        checkedInputs[i].checked = false;
      }
    });
  }

  /**
   * Descarga masivamente las imágenes TIFF seleccionadas.
   * Chrome/Edge: ZIP por streaming a carpeta elegida.
   * Firefox: ZIP por streaming con StreamSaver. Fallback: descargas individuales.
   *
   * @public
   * @function
   * @returns {Promise<void>}
   * @api stable
   */
  async masiveDownload() {
    const selections = this.collectSelectedImages();
    if (selections.length === 0) {
      IDEE.dialog.info(getValue('exception').no_selection);
      return;
    }

    const groups = this.groupSelectionsByItem(selections);
    const tasks = this.resolveMasiveDownloadTasks(groups);

    if (tasks.length === 0) {
      IDEE.dialog.info(getValue('exception').no_selection);
      return;
    }

    if (this.isDirectoryPickerSupported()) {
      let directoryHandle;
      try {
        directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      } catch (err) {
        if (err.name === 'AbortError') {
          IDEE.dialog.info(getValue('masiveDownload.cancelled'));
        } else {
          console.error(err);
          IDEE.dialog.info(getValue('masiveDownload.error'));
        }
        return;
      }
      await this.masiveDownloadToDirectory(directoryHandle, tasks);
      return;
    }

    if (this.isStreamSaverSupported()) {
      await this.masiveDownloadToStreamSaverZip(tasks);
      return;
    }

    await this.masiveDownloadToBrowserDownloads(tasks);
  }

  /**
   * Recoge las imágenes TIFF marcadas en el panel y en el modal de diálogo
   *
   * @private
   * @function
   * @returns {Array<Object>} Lista de selecciones con índices de catálogo/colección
   */
  collectSelectedImages() {
    const roots = [this.template_];
    const dialog = document.querySelector('div.m-dialog.info');
    if (dialog) {
      roots.push(dialog);
    }
    const seen = new Set();
    const selections = [];
    roots.forEach((root) => {
      root.querySelectorAll('.m-catalogmanager-checkbox-image:checked').forEach((input) => {
        let {
          imageKey, itemId, collectionIndex, catalogIndex,
        } = input.dataset;
        if (!imageKey) {
          const parent = input.closest('.m-catalogmanager-title-image');
          if (parent) {
            imageKey = parent.dataset.imageKey;
            itemId = parent.dataset.itemId;
            collectionIndex = parent.dataset.collectionIndex;
            catalogIndex = parent.dataset.catalogIndex;
          }
        }
        const key = `${catalogIndex}|${collectionIndex}|${itemId}|${imageKey}`;
        if (!seen.has(key) && imageKey && itemId) {
          seen.add(key);
          selections.push({
            catalogIndex,
            collectionIndex,
            itemId,
            imageKey,
          });
        }
      });
    });
    return selections;
  }

  /**
   * Agrupa selecciones por ítem STAC para minimizar llamadas a getItem
   *
   * @private
   * @function
   * @param {Array<Object>} selections Selecciones de imágenes
   * @returns {Array<Object>} Grupos con imageKeys por ítem
   */
  groupSelectionsByItem(selections) {
    const groups = new Map();
    selections.forEach((selection) => {
      const key = `${selection.catalogIndex}|${selection.collectionIndex}|${selection.itemId}`;
      if (!groups.has(key)) {
        groups.set(key, {
          catalogIndex: selection.catalogIndex,
          collectionIndex: selection.collectionIndex,
          itemId: selection.itemId,
          imageKeys: [],
        });
      }
      groups.get(key).imageKeys.push(selection.imageKey);
    });
    return Array.from(groups.values());
  }

  /**
   * Construye las tareas de descarga a partir de los grupos de selección.
   * La URL del asset se resuelve con getItem justo antes de cada fetch.
   *
   * @private
   * @function
   * @param {Array<Object>} groups Grupos por ítem STAC
   * @returns {Array<Object>}
   */
  resolveMasiveDownloadTasks(groups) {
    const tasks = [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const group = groups[groupIndex];
      for (let keyIndex = 0; keyIndex < group.imageKeys.length; keyIndex += 1) {
        tasks.push({
          catalogIndex: group.catalogIndex,
          collectionIndex: group.collectionIndex,
          itemId: group.itemId,
          imageKey: group.imageKeys[keyIndex],
        });
      }
    }
    return tasks;
  }

  /**
   * Comprueba si el navegador soporta la API File System Access
   *
   * @private
   * @function
   * @returns {boolean}
   */
  isDirectoryPickerSupported() {
    return typeof window.showDirectoryPicker === 'function';
  }

  /**
   * Comprueba si StreamSaver puede usarse para descargar por streaming
   *
   * @private
   * @function
   * @returns {boolean}
   */
  isStreamSaverSupported() {
    return 'serviceWorker' in window.navigator && typeof window.WritableStream !== 'undefined';
  }

  /**
   * Descarga masivamente empaquetando en ZIP por streaming a una carpeta (Chrome/Edge)
   *
   * @private
   * @function
   * @param {FileSystemDirectoryHandle} directoryHandle Carpeta destino
   * @param {Array<Object>} tasks Tareas de descarga
   * @returns {Promise<void>}
   */
  async masiveDownloadToDirectory(directoryHandle, tasks) {
    this.showMasiveDownloadProgress(0, tasks.length, '', 'zipProgress');

    let zipFilename = MASIVE_DOWNLOAD_ZIP_BASENAME;
    try {
      const zipPackage = this.buildMasiveDownloadZipResponse(tasks, (current, total, filename) => {
        this.showMasiveDownloadProgress(current, total, filename, 'zipProgress');
      });
      zipFilename = zipPackage.zipFilename;

      await this.writeStreamToDirectory(directoryHandle, zipFilename, zipPackage.zipResponse.body);

      this.hideMasiveDownloadProgress();
      this.clearSelection();
      this.showMasiveDownloadCompleteMessage(tasks.length, 0, [], false, zipFilename);
    } catch (err) {
      console.error(err);
      this.hideMasiveDownloadProgress();
      this.clearSelection();
      this.showMasiveDownloadCompleteMessage(0, tasks.length, [{
        filename: zipFilename,
        message: err.message || getValue('masiveDownload.error'),
      }], false);
    }
  }

  /**
   * Descarga masivamente un ZIP por streaming con StreamSaver (Firefox y similares)
   *
   * @private
   * @function
   * @param {Array<Object>} tasks Tareas de descarga
   * @returns {Promise<void>}
   */
  async masiveDownloadToStreamSaverZip(tasks) {
    this.configureStreamSaverMitm();
    this.showMasiveDownloadProgress(0, tasks.length, '', 'zipProgress');

    let zipFilename = MASIVE_DOWNLOAD_ZIP_BASENAME;
    try {
      const zipPackage = this.buildMasiveDownloadZipResponse(tasks, (current, total, filename) => {
        this.showMasiveDownloadProgress(current, total, filename, 'zipProgress');
      });
      zipFilename = zipPackage.zipFilename;

      const fileStream = streamSaver.createWriteStream(zipFilename);
      if (!zipPackage.zipResponse.body) {
        throw new Error(getValue('masiveDownload.error'));
      }
      await zipPackage.zipResponse.body.pipeTo(fileStream);

      this.hideMasiveDownloadProgress();
      this.clearSelection();
      this.showMasiveDownloadCompleteMessage(tasks.length, 0, [], true, zipFilename);
    } catch (err) {
      console.error(err);
      this.hideMasiveDownloadProgress();
      this.clearSelection();
      this.showMasiveDownloadCompleteMessage(0, tasks.length, [{
        filename: zipFilename,
        message: err.message || getValue('masiveDownload.error'),
      }], true);
    }
  }

  /**
   * Muestra el indicador de progreso de la descarga masiva
   *
   * @private
   * @function
   * @param {number} current Índice actual (1-based)
   * @param {number} total Total de ficheros
   * @param {string} filename Nombre del fichero en curso
   * @param {string} progressKey Clave i18n de progreso
   */
  showMasiveDownloadProgress(current, total, filename, progressKey = 'progress') {
    let progress = document.querySelector('.m-catalogmanager-download-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'm-catalogmanager-download-progress';
      progress.innerHTML = '<p class="m-catalogmanager-download-progress-text"></p>';
      document.body.appendChild(progress);
    }
    const text = progress.querySelector('.m-catalogmanager-download-progress-text');
    if (text) {
      text.textContent = this.formatMasiveDownloadMessage(progressKey, {
        current,
        total,
        filename,
      });
    }
  }

  /**
   * Sustituye placeholders {{key}} en textos i18n de descarga masiva
   *
   * @private
   * @function
   * @param {string} key Clave relativa dentro de masiveDownload
   * @param {Object} params Valores a interpolar
   * @returns {string}
   */
  formatMasiveDownloadMessage(key, params = {}) {
    let message = getValue(`masiveDownload.${key}`);
    Object.keys(params).forEach((param) => {
      message = message.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
    });
    return message;
  }

  /**
   * Oculta el indicador de progreso de la descarga masiva
   *
   * @private
   * @function
   */
  hideMasiveDownloadProgress() {
    const progress = document.querySelector('.m-catalogmanager-download-progress');
    if (progress) {
      progress.remove();
    }
  }

  /**
   * Construye la respuesta ZIP de client-zip para la selección actual
   *
   * @private
   * @function
   * @param {Array<Object>} tasks Tareas de descarga
   * @param {Function} onProgress Callback de progreso (current, total, filename)
   * @returns {{zipFilename: string, zipResponse: Response}}
   */
  buildMasiveDownloadZipResponse(tasks, onProgress) {
    const usedNames = new Set();
    const zipFilename = this.ensureUniqueDownloadFilename(
      MASIVE_DOWNLOAD_ZIP_BASENAME,
      new Set(),
    );
    const zipResponse = downloadZip(
      this.createMasiveDownloadZipEntries(tasks, usedNames, onProgress),
    );
    return { zipFilename, zipResponse };
  }

  /**
   * Evita colisiones de nombre dentro de una misma descarga masiva
   *
   * @private
   * @function
   * @param {string} filename Nombre base del fichero
   * @param {Set<string>} usedNames Nombres ya reservados
   * @returns {string}
   */
  ensureUniqueDownloadFilename(filename, usedNames) {
    if (!usedNames.has(filename)) {
      return filename;
    }
    const extensionIndex = filename.lastIndexOf('.');
    const base = extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
    const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : '';
    let counter = 1;
    let candidate = `${base} (${counter})${extension}`;
    while (usedNames.has(candidate)) {
      counter += 1;
      candidate = `${base} (${counter})${extension}`;
    }
    return candidate;
  }

  /**
   * Generador async de entradas para client-zip con URL actualizada por fichero
   *
   * @private
   * @function
   * @param {Array<Object>} tasks Tareas de descarga
   * @param {Set<string>} usedNames Nombres ya reservados dentro del ZIP
   * @param {Function} onProgress Callback de progreso (current, total, filename)
   * @yields {Object} Entrada compatible con client-zip
   */
  async* createMasiveDownloadZipEntries(tasks, usedNames, onProgress) {
    for (let taskIndex = 0; taskIndex < tasks.length; taskIndex += 1) {
      const task = tasks[taskIndex];
      // eslint-disable-next-line no-await-in-loop
      const asset = await this.resolveMasiveDownloadAsset(task);
      const filename = this.ensureUniqueDownloadFilename(
        this.sanitizeDownloadFilename(asset.title),
        usedNames,
      );
      usedNames.add(filename);
      if (onProgress) {
        onProgress(taskIndex + 1, tasks.length, filename);
      }
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(asset.href);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      yield { name: filename, input: response };
    }
  }

  /**
   * Obtiene el asset STAC de una tarea de descarga con URL actualizada
   *
   * @private
   * @function
   * @param {Object} task Tarea de descarga masiva
   * @returns {Promise<Object>}
   */
  async resolveMasiveDownloadAsset(task) {
    const catalog = this.catalogs_[task.catalogIndex];
    const collection = catalog.collections[task.collectionIndex];
    const item = await catalog.obj.getItem(collection.id, task.itemId);
    const asset = item.assets[task.imageKey];
    if (!asset) {
      throw new Error(getValue('masiveDownload.error'));
    }
    return asset;
  }

  /**
   * Normaliza el nombre de fichero eliminando caracteres no válidos
   *
   * @private
   * @function
   * @param {string} filename Nombre original del asset
   * @returns {string}
   */
  sanitizeDownloadFilename(filename) {
    const sanitized = (filename || 'download').replace(/[/\\?%*:|"<>]/g, '_').trim();
    return sanitized || 'download.tif';
  }

  /**
   * Escribe un stream en un fichero de la carpeta elegida
   *
   * @private
   * @function
   * @param {FileSystemDirectoryHandle} directoryHandle Carpeta destino
   * @param {string} filename Nombre del fichero destino
   * @param {ReadableStream} body Stream de datos
   * @returns {Promise<void>}
   */
  async writeStreamToDirectory(directoryHandle, filename, body) {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    if (body) {
      await body.pipeTo(writable);
      return;
    }
    await writable.close();
  }

  /**
   * Muestra el resumen final de la descarga masiva
   *
   * @private
   * @function
   * @param {number} successCount Descargas correctas o iniciadas
   * @param {number} failedCount Descargas fallidas
   * @param {Array<Object>} errors Detalle de errores
   * @param {boolean} useBrowserNote Indica si se añade nota de carpeta de descargas
   * @param {string|null} zipFilename Nombre del ZIP creado (Chrome/Edge)
   */
  showMasiveDownloadCompleteMessage(
    successCount,
    failedCount,
    errors,
    useBrowserNote = false,
    zipFilename = null,
  ) {
    const summary = zipFilename
      ? this.formatMasiveDownloadMessage('completeZip', {
        filename: zipFilename,
        success: successCount,
      })
      : this.formatMasiveDownloadMessage('complete', {
        success: successCount,
        failed: failedCount,
      });
    const parts = [`<p>${summary}</p>`];
    if (useBrowserNote) {
      parts.push(
        `<p class="m-catalogmanager-download-browser-note">${getValue('masiveDownload.browserDownloads')}</p>`,
      );
    }
    if (errors.length > 0) {
      const errorsHtml = errors.map((error) => (
        `<li>${error.filename}: ${error.message}</li>`
      )).join('');
      parts.push(`<ul class="m-catalogmanager-download-errors">${errorsHtml}</ul>`);
    }
    IDEE.dialog.info(parts.join(''), getValue('masiveDownload.title'), this.order);
  }

  /**
   * Configura la URL del mitm de StreamSaver junto al script del plugin
   *
   * @private
   * @function
   */
  configureStreamSaverMitm() {
    if (streamSaver.mitm) {
      return;
    }
    const scripts = document.getElementsByTagName('script');
    let mitmBaseUrl = window.location.href;
    for (let scriptIndex = 0; scriptIndex < scripts.length; scriptIndex += 1) {
      const scriptSrc = scripts[scriptIndex].src;
      if (scriptSrc && (scriptSrc.includes('catalogmanager') || scriptSrc.includes('main.js'))) {
        mitmBaseUrl = scriptSrc;
        break;
      }
    }
    streamSaver.mitm = new URL('streamsaver/mitm.html', mitmBaseUrl).href;
  }

  // FIN DESCARGA MASIVA
  // ----------------------------------------------------------------------------------------------
}
