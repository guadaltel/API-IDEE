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
import itemMetadataTemplate from 'templates/itemMetadata';
import advancedFilterTemplate from 'templates/advancedFilter';
import fieldsTableTemplate from 'templates/fieldstable';
import typeTableTemplate from 'templates/typetable';
import { getValue } from './i18n/language';

// - Modal
/** @private @type {string} Selector CSS del botón de cierre del modal informativo */
const BT_CLOSE_MODAL = 'div.m-dialog.info div.m-button > button';

export default class CatalogmanagerControl extends IDEE.Control {
  /**
   * @classdesc
   * Control de gestión de catálogos STAC. Permite añadir catálogos, explorar
   * colecciones e ítems, aplicar filtros temporales, espaciales y avanzados,
   * y visualizar metadatos e imágenes en el mapa.
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
    this.template_.querySelector('.m-catalogmanager-filters-spatial-predefined').addEventListener('click', (evt) => this.setSpatialFilter(evt));
    this.template_.querySelector('#m-catalogmanager-updatecatalog').addEventListener('click', this.resetItems.bind(this));
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
    const btn = evt.target;
    const filtersContent = this.template_.querySelector('#m-catalogmanager-filters-content');
    const listContent = this.template_.querySelector('#m-catalogmanager-list-content');
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      filtersContent.classList.add('hidden');
      listContent.classList.remove('hidden');
    } else {
      btn.classList.add('active');
      filtersContent.classList.remove('hidden');
      listContent.classList.add('hidden');
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
  setSpatialFilter(evt) {
    const btn = evt.target;
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
   * @param {string} filterType Tipo de filtro ('view')
   */
  setSpatialFilterByType(filterType) {
    switch (filterType) {
      case 'view':
        const bbox = this.map_.getBbox();
        const extent = [bbox.x.min, bbox.y.min, bbox.x.max, bbox.y.max];
        this.commonFilters_.bbox = ol.proj.transformExtent(extent, this.map_.getProjection().code, 'EPSG:4326');
        break;
      default:
        delete this.commonFilters_.bbox;
        break;
    }
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
    const advancedFiltersHtml = IDEE.template.compileSync(advancedFilterTemplate, {
      vars: {
        catalogIndex,
        collectionIndex,
        operators: this.operators_,
        translations: {
          title: getValue('advancedFilter.title'),
          fields: getValue('advancedFilter.fields'),
          type: getValue('advancedFilter.type'),
          operators: getValue('advancedFilter.operators'),
          filter_exp: getValue('advancedFilter.filter_exp'),
          placeholder: getValue('advancedFilter.placeholder'),
          return: getValue('advancedFilter.return'),
          apply: getValue('advancedFilter.apply'),
          clear: getValue('advancedFilter.clear'),
        },
      },
    });
    const container = this.template_.querySelector('#m-catalogmanager-advanced-filters-content');
    container.innerHTML = advancedFiltersHtml.outerHTML;
    this.initAdvancedFilterState(catalogIndex, collectionIndex, queryableFields);
    this.renderQueryableFields();
    this.addAdvancedFilterEvents(container);
    if (collection.advancedFilter?.sqlExpression) {
      this.getAdvancedFilterTextarea().value = collection.advancedFilter.sqlExpression;
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
    return this.template_.querySelector('#m-catalogmanager-advanced-filters-content #div-contenedor');
  }

  /**
   * Obtiene el textarea de expresión SQL del filtro avanzado
   *
   * @private
   * @function
   * @returns {HTMLTextAreaElement|null} Textarea de la expresión de filtro
   */
  getAdvancedFilterTextarea() {
    return this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-textArea');
  }

  /**
   * Registra los eventos del panel de filtro avanzado
   *
   * @private
   * @function
   * @param {HTMLElement} container Contenedor raíz del filtro avanzado
   */
  addAdvancedFilterEvents(container) {
    const root = container.querySelector('#div-contenedor');
    root.querySelectorAll('#m-catalogmanager-operators-container>button').forEach((btn) => {
      btn.addEventListener('click', (evt) => this.advancedFilterOperatorClick(evt));
    });
    root.querySelector('#volver-btn').addEventListener('click', () => this.toggleAdvancedFilters());
    root.querySelector('#aplicar-btn').addEventListener('click', () => this.applyAdvancedFilter());
    root.querySelector('#limpiar-filtro-btn').addEventListener('click', () => this.clearAdvancedFilter());
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
    const fieldsContainer = this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-fields');
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
        this.getAdvancedFilterTextarea().value += fieldName;
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
  showQueryableFieldValues(fieldName) {
    const fieldType = this.getQueryableFieldType(fieldName);
    const typeContainer = this.getAdvancedFilterContainer().querySelector('#m-catalogmanager-type');
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
  getQueryableFieldType(fieldName) {
    const schema = this.advancedFilterState_.queryableFields[fieldName];
    if (!schema) {
      return getValue('advancedFilter.types.unknown');
    }
    const { type, format } = schema;
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
    const textarea = this.getAdvancedFilterTextarea();
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
    const state = this.advancedFilterState_;
    const catalog = this.catalogs_[state.catalogIndex];
    const collection = catalog.collections[state.collectionIndex];
    const sqlExpression = this.getAdvancedFilterTextarea().value.trim();
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
    const bbox = this.commonFilters_.bbox || null;
    const datetime = this.commonFilters_.datetime || null;
    catalog.obj.getFilteredItemsAdvanced(collection.id, collection.advancedFilter, bbox, datetime)
      .then((items) => {
        collection.links = items.links;
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
    this.getAdvancedFilterTextarea().value = '';
    state.selectedField = null;
    const itemsElement = this.template_.querySelector(`.m-catalogmanager-items.collection-${collection.id}`);
    if (itemsElement && !itemsElement.classList.contains('empty')) {
      this.getItems(state.catalogIndex, state.collectionIndex, itemsElement);
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
      },
    });
    container.innerHTML = html.outerHTML;
    container.classList.remove('empty', 'hidden');
    container.querySelector('.m-catalogmanager-ulitems').addEventListener('click', (evt) => this.itemsEvent(evt));
    container.querySelector('.m-catalogmanager-next-items-button').addEventListener('click', (evt) => this.changeItemsPage(evt, 'next'));
    container.querySelector('.m-catalogmanager-prev-items-button').addEventListener('click', (evt) => this.changeItemsPage(evt, 'previous'));
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
    const actionSecction = this.template_.querySelector('#m-catalogmanager-actions-content');
    const contentSecction = this.template_.querySelector('#m-catalogmanager-list-content');
    const advancedFiltersSecction = this.template_.querySelector('#m-catalogmanager-advanced-filters-content');
    this.toggleHidden(actionSecction);
    this.toggleHidden(contentSecction);
    this.toggleHidden(advancedFiltersSecction);
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
      const buttonClose = document.querySelector('div.m-dialog.info div.m-button > button');
      buttonClose.click();
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
  openItemMetadata(catalogIndex, collectionIndex, itemId) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    catalog.obj.getItem(collection.id, itemId).then((item) => {
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
    });
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
      id: index,
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
    const catalogIndex = target.dataset.catalogId;
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
      return {
        index,
        id: collection.id,
        title: collection.title,
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
      this.previewItem(catalogIndex, collectionIndex);
      return;
    }
    if (evt.target.classList.contains('m-catalogmanager-filter-button')) {
      this.openAdvancedFilters(catalogIndex, collectionIndex);
      return;
    }
    const itemsElement = this.template_.querySelector(`.m-catalogmanager-items.collection-${collectionId}`);
    if (itemsElement.classList.contains('empty')) {
      this.getItems(catalogIndex, collectionIndex, itemsElement);
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
   * @param {HTMLElement} itemsElement Contenedor DOM de los ítems
   */
  getItems(catalogIndex, collectionIndex, itemsElement) {
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
    const catalogIndex = itemDiv.dataset.catalogId;
    const collectionIndex = itemDiv.dataset.collectionIndex;
    const itemId = itemDiv.dataset.itemId;
    if (target.classList.contains('m-catalogmanager-info-button')) {
      this.openItemMetadata(catalogIndex, collectionIndex, itemId);
    } else {
      const imagesElement = this.template_.querySelector(`.m-catalogmanager-images.item-${itemId}`);
      if (imagesElement.classList.contains('empty')) {
        this.getItemImages(catalogIndex, collectionIndex, itemId, imagesElement);
      }
      this.toggleHidden(imagesElement);
    }
  }

  /**
   * Obtiene y renderiza las imágenes TIFF de un ítem STAC
   *
   * @private
   * @function
   * @param {number} catalogIndex Índice del catálogo
   * @param {number} collectionIndex Índice de la colección
   * @param {string} itemId Identificador del ítem
   * @param {HTMLElement} imagesElement Contenedor DOM de las imágenes
   */
  getItemImages(catalogIndex, collectionIndex, itemId, imagesElement) {
    const catalog = this.catalogs_[catalogIndex];
    const collection = catalog.collections[collectionIndex];
    catalog.obj.getItem(collection.id, itemId).then((item) => {
      let assetsKeys = Object.keys(item.assets);
      assetsKeys = assetsKeys.filter((key) => item.assets[key].type.includes('image/tif'));
      const container = imagesElement;
      if (assetsKeys.length === 0) {
        container.innerHTML = `<div class="m-catalogmanager-no-images">${getValue('no_images')}</div>`;
        container.classList.remove('empty');
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
        const html = IDEE.template.compileSync(imagesTemplate, {
          vars: {
            images,
            translations: {
              info: getValue('imageActions.info'),
              preview: getValue('imageActions.preview'),
              download: getValue('imageActions.download'),
            },
          },
        });
        container.innerHTML = html.outerHTML;
        container.classList.remove('empty');
        container.querySelector('.m-catalogmanager-ulimages').addEventListener('click', (evt) => this.imagesEvent(evt));
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
      catalog.obj.getItem(collection.id, itemId).then((item) => {
        const asset = item.assets[imageKey];
        this.drawImageTiff(asset, catalog, collection);
      });
    } else if (target.classList.contains('m-catalogmanager-download-button')) {
      catalog.obj.getItem(collection.id, itemId).then((item) => {
        const asset = item.assets[imageKey];
        window.open(asset.href, '_blank');
      });
    }
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
    // const styleSpec = this.resolveStyleSpec(image);
    // const style = this.buildWebGlStyle(styleSpec);
    const geotiff = new IDEE.layer.GeoTIFF({
      url: image.href,
      name: image.title,
      legend: image.title,
    }, {
      style: null,
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
  previewItem(catalogIndex, collectionIndex) {
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
    } else if (!IDEE.utils.isNullOrEmpty(this.commonFilters_)) {
      promise = catalog.obj.getFilteredItems(collection.id, this.commonFilters_);
    } else {
      promise = catalog.obj.getItems(collection.id, 10);
    }
    promise.then((items) => {
      const layer = new IDEE.layer.GeoJSON({
        name: collection.id,
        legend: 'Huella',
        source: items,
        extract: true,
      });
      if (!collection.layerGroup) {
        collection.layerGroup = new IDEE.layer.LayerGroup({
          name: collection.title,
          legend: collection.title,
        });
        catalog.layerGroup.addLayers(collection.layerGroup);
      }
      collection.layerGroup.addLayers(layer);
    });
  }

  /**
   * Reinicia el listado de ítems ocultando y vaciando todos los contenedores
   *
   * @private
   * @function
   */
  resetItems() {
    const itemsElements = this.template_.querySelectorAll('.m-catalogmanager-items');
    itemsElements.forEach((itemsElement) => {
      const ie = itemsElement;
      ie.innerHTML = '';
      if (!ie.classList.contains('empty')) {
        ie.classList.add('empty');
      }
      if (!ie.classList.contains('hidden')) {
        ie.classList.add('hidden');
      }
    });
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
   * Detecta el tipo de producto a partir del identificador del ítem
   *
   * @private
   * @function
   * @param {string} itemId Identificador del ítem STAC
   * @returns {string|null} Tipo de producto ('PAN', 'MS4', 'PSH') o null
   */
  detectProductType(itemId) {
    const match = itemId?.match(/_(PAN|MS4|PSH)_/);
    return match ? match[1] : null;
  }

  /**
   * Genera una etiqueta descriptiva para una banda espectral
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset STAC
   * @param {number} bandIndex Índice de la banda (base 1)
   * @returns {string} Etiqueta de la banda
   */
  bandLabel(eoBands, bandIndex) {
    if (!Array.isArray(eoBands) || bandIndex < 1) {
      return `banda ${bandIndex}`;
    }
    const band = eoBands[bandIndex - 1];
    const name = band?.common_name || band?.name;
    return name ? `banda ${bandIndex} (${name})` : `banda ${bandIndex}`;
  }

  /**
   * Resuelve la configuración de canales para un asset de una sola banda
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset
   * @returns {{mode: string, label: string, bands: Object}} Especificación de visualización
   */
  resolveSingleBandChannels(eoBands) {
    const commonName = eoBands[0].common_name?.toLowerCase();
    const rgbChannels = {
      red: { r: 1, g: 0, b: 0 },
      green: { r: 0, g: 1, b: 0 },
      blue: { r: 0, g: 0, b: 1 },
    };
    if (commonName && rgbChannels[commonName]) {
      return {
        mode: 'channel',
        label: `Canal ${commonName}`,
        bands: rgbChannels[commonName],
      };
    }
    const name = eoBands[0].common_name || eoBands[0].name || '1';
    return {
      mode: 'grayscale',
      label: `Escala de grises (${name})`,
      bands: { r: 1, g: 1, b: 1 },
    };
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
      return { r, g, b };
    }
    return null;
  }

  /**
   * Infiere el valor máximo de normalización según las bandas y el modo de visualización
   *
   * @private
   * @function
   * @param {Array<Object>} eoBands Bandas espectrales del asset
   * @param {string} mode Modo de visualización ('rgb', 'grayscale', 'channel')
   * @returns {number} Valor máximo para normalización
   */
  inferMaxFromEoBands(eoBands, mode) {
    if (eoBands[0].center_wavelength) {
      return eoBands[0].center_wavelength;
    }
    if (mode === 'rgb') {
      const rgbBands = this.mapBandsByCommonName(eoBands, ['red', 'green', 'blue']);
      if (rgbBands || eoBands.length >= 3) {
        return 255;
      }
    }
    return 10000;
  }

  /**
   * Determina la especificación de estilo WebGL según las bandas del asset
   *
   * @private
   * @function
   * @param {Object} asset Asset STAC con metadatos eo:bands
   * @returns {Object|null} Especificación de estilo o null si no hay bandas
   */
  resolveStyleSpec(asset) {
    const eoBands = asset['eo:bands'];
    // const displayOrder = asset.band_display_order;
    if (!Array.isArray(eoBands) || eoBands.length === 0) {
      return null;
    }

    if (eoBands.length === 1) {
      const singleBand = this.resolveSingleBandChannels(eoBands);
      return {
        ...singleBand,
        detail: this.bandLabel(eoBands, 1),
        max: this.inferMaxFromEoBands(eoBands, singleBand.mode === 'channel' ? 'channel' : 'grayscale'),
      };
    }

    const rgbBands = this.mapBandsByCommonName(eoBands, ['red', 'green', 'blue']);
    if (rgbBands) {
      return {
        mode: 'rgb',
        label: 'Color verdadero',
        detail: `R=${this.bandLabel(eoBands, rgbBands.r)}, G=${this.bandLabel(eoBands, rgbBands.g)}, B=${this.bandLabel(eoBands, rgbBands.b)}`,
        bands: rgbBands,
        max: this.inferMaxFromEoBands(eoBands, 'rgb'),
      };
    }

    if (eoBands.length >= 3) {
      return {
        mode: 'rgb',
        label: 'RGB (bandas 1-3)',
        detail: `${this.bandLabel(eoBands, 1)}, ${this.bandLabel(eoBands, 2)}, ${this.bandLabel(eoBands, 3)}`,
        bands: { r: 1, g: 2, b: 3 },
        max: this.inferMaxFromEoBands(eoBands, 'rgb'),
      };
    }

    const band = eoBands[0];
    const name = band.common_name || band.name || '1';
    return {
      mode: 'grayscale',
      label: `Escala de grises (${name})`,
      detail: this.bandLabel(eoBands, 1),
      bands: { r: 1, g: 1, b: 1 },
      max: this.inferMaxFromEoBands(eoBands, 'grayscale'),
    };
  }

  /**
   * Construye el estilo WebGL de OpenLayers a partir de una especificación de bandas
   *
   * @private
   * @function
   * @param {Object} spec Especificación de estilo devuelta por resolveStyleSpec
   * @returns {Object|undefined} Estilo WebGL para IDEE.layer.GeoTIFF
   */
  buildWebGlStyle(spec) {
    if (!spec) {
      return undefined;
    }
    const { r, g, b } = spec.bands;
    const max = spec.max ?? 10000;
    const normalizeBand = (bandIndex) => ['clamp', ['/', ['band', bandIndex], ['var', 'max']], 0, 1];
    const channelValue = (bandIndex) => (bandIndex ? normalizeBand(bandIndex) : 0);
    return {
      variables: {
        max,
        nodata: 0,
      },
      color: [
        'case',
        ['any',
          ['==', ['band', 1], ['var', 'nodata']],
          ['==', ['band', 1], 0],
        ],
        [0, 0, 0, 0],
        [
          'array',
          channelValue(r),
          channelValue(g),
          channelValue(b),
          1,
        ],
      ],
    };
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
}
