import template from 'templates/histograms';
import { getValue } from './i18n/language';
import { computeBandStats, createCalcHistogramRequest } from './util/calchistogramservice';

/**
 * Control de histogramas y estadísticas descriptivas de la capa seleccionada.
 */
export default class HistogramControl {
  /**
   * @param {IDEE.control.RasterManagementControl} parentControl Control principal.
   */
  constructor(parentControl) {
    /**
     * @private
     * @type {IDEE.control.RasterManagementControl}
     */
    this.parentControl_ = parentControl;

    /**
     * @private
     * @type {HTMLElement|null}
     */
    this.root_ = null;

    /**
     * @private
     * @type {Array<object>}
     */
    this.bandHistograms_ = [];

    /**
     * @private
     * @type {number}
     */
    this.requestId_ = 0;

    /**
     * Petición activa con método abort().
     * @private
     * @type {{ promise: Promise, abort: Function }|null}
     */
    this.activeRequest_ = null;

    /**
     * @private
     * @type {boolean}
     */
    this.isLoading_ = false;
  }

  /**
   * Inicializa la interfaz dentro del contenedor de histogramas.
   *
   * @param {HTMLElement} html Plantilla principal del control.
   */
  init(html) {
    const container = html.querySelector('#m-rastermanagement-histograms-container');
    const content = IDEE.template.compileSync(template, {
      vars: {
        selectLayerHint: getValue('histogramSelectLayer'),
        histogramCalculate: getValue('histogramCalculate'),
        histogramCancel: getValue('histogramCancel'),
        histogramLoading: getValue('histogramLoading'),
        band: getValue('band'),
        descriptiveStats: getValue('descriptiveStats'),
        statPixels: getValue('statPixels'),
        statMin: getValue('statMin'),
        statMax: getValue('statMax'),
        statMean: getValue('statMean'),
        statMedian: getValue('statMedian'),
        statStdDev: getValue('statStdDev'),
        statPercentile25: getValue('statPercentile25'),
        statPercentile75: getValue('statPercentile75'),
      },
    });
    container.innerHTML = '';
    container.appendChild(content);
    this.root_ = content;

    const bandSelect = this.root_.querySelector('#m-rastermanagement-histogram-band');
    bandSelect.addEventListener('change', () => {
      this.renderSelectedBandStats_();
    });

    const calculateBtn = this.root_.querySelector('#m-rastermanagement-histogram-calculate');
    calculateBtn.addEventListener('click', () => {
      this.load();
    });

    const cancelBtn = this.root_.querySelector('#m-rastermanagement-histogram-cancel');
    cancelBtn.addEventListener('click', () => {
      this.cancelCalculation_();
    });

    this.loadIfVisible();
  }

  /**
   * Actualiza la vista de histogramas si la pestaña está visible,
   * sin lanzar el cálculo automáticamente.
   */
  loadIfVisible() {
    if (!this.isActive_()) {
      return;
    }
    this.resetView_();
  }

  /**
   * Solicita el histograma de la capa seleccionada.
   */
  load() {
    if (!this.root_ || this.isLoading_) {
      return;
    }

    this.cancelPendingRequest_();
    this.bandHistograms_ = [];

    const layer = this.parentControl_.selectedLayer;
    if (!layer) {
      this.showState_('empty');
      return;
    }

    const urlRaster = layer.url;
    if (IDEE.utils.isNullOrEmpty(urlRaster)) {
      this.showError_(getValue('histogramNoUrl'));
      return;
    }

    const requestId = this.requestId_ + 1;
    this.requestId_ = requestId;
    this.isLoading_ = true;
    this.showState_('loading');

    const request = createCalcHistogramRequest(urlRaster);
    this.activeRequest_ = request;

    request.promise
      .then((bandHistograms) => {
        if (requestId !== this.requestId_) {
          return;
        }
        this.isLoading_ = false;
        this.activeRequest_ = null;
        if (!bandHistograms.length) {
          this.showError_(getValue('histogramEmpty'));
          return;
        }
        this.bandHistograms_ = bandHistograms;
        this.populateBandSelector_();
        this.renderSelectedBandStats_();
        this.showState_('content');
      })
      .catch((err) => {
        if (requestId !== this.requestId_) {
          return;
        }
        this.isLoading_ = false;
        this.activeRequest_ = null;
        // eslint-disable-next-line no-console
        console.error(err);
        this.showError_(getValue('histogramError'));
      });
  }

  /**
   * Cancela el cálculo en curso y vuelve al estado inicial.
   *
   * @private
   * @function
   */
  cancelCalculation_() {
    if (!this.isLoading_) {
      return;
    }
    this.cancelPendingRequest_();
    this.isLoading_ = false;
    this.bandHistograms_ = [];

    const layer = this.parentControl_.selectedLayer;
    if (!layer) {
      this.showState_('empty');
      return;
    }
    this.showState_('idle');
  }

  /**
   * Restablece la vista sin calcular.
   *
   * @private
   * @function
   */
  resetView_() {
    this.cancelPendingRequest_();
    this.isLoading_ = false;
    this.bandHistograms_ = [];

    const layer = this.parentControl_.selectedLayer;
    if (!layer) {
      this.showState_('empty');
      return;
    }
    this.showState_('idle');
  }

  /**
   * @private
   * @function
   */
  cancelPendingRequest_() {
    this.requestId_ += 1;
    if (this.activeRequest_) {
      this.activeRequest_.abort();
      this.activeRequest_ = null;
    }
  }

  /**
   * @private
   * @function
   * @returns {boolean}
   */
  isActive_() {
    const html = this.parentControl_.html;
    if (!html) {
      return false;
    }

    const geoprocessSection = html.querySelector('#m-rastermanagement-geoprocess-section');
    if (geoprocessSection.classList.contains('hidden')) {
      return false;
    }

    const histogramsTab = html.querySelector('#m-rastermanagement-histograms-tab');
    return histogramsTab.classList.contains('active');
  }

  /**
   * @private
   * @function
   * @param {'empty'|'idle'|'loading'|'content'|'error'} state Estado visible.
   * @param {string} [errorMessage] Mensaje de error opcional.
   */
  showState_(state, errorMessage) {
    const emptyEl = this.root_.querySelector('#m-rastermanagement-histogram-empty');
    const actionsEl = this.root_.querySelector('#m-rastermanagement-histogram-actions');
    const loadingRow = this.root_.querySelector('#m-rastermanagement-histogram-loading-row');
    const errorEl = this.root_.querySelector('#m-rastermanagement-histogram-error');
    const contentEl = this.root_.querySelector('#m-rastermanagement-histogram-content');

    emptyEl.classList.add('hidden');
    actionsEl.classList.add('hidden');
    loadingRow.classList.add('hidden');
    errorEl.classList.add('hidden');
    contentEl.classList.add('hidden');

    if (state === 'empty') {
      emptyEl.classList.remove('hidden');
    } else if (state === 'idle') {
      actionsEl.classList.remove('hidden');
    } else if (state === 'loading') {
      loadingRow.classList.remove('hidden');
    } else if (state === 'content') {
      contentEl.classList.remove('hidden');
      actionsEl.classList.remove('hidden');
    } else if (state === 'error') {
      errorEl.innerText = errorMessage;
      errorEl.classList.remove('hidden');
      actionsEl.classList.remove('hidden');
    }
  }

  /**
   * @private
   * @function
   * @param {string} message Mensaje de error.
   */
  showError_(message) {
    this.showState_('error', message);
  }

  /**
   * @private
   * @function
   */
  populateBandSelector_() {
    const bandRow = this.root_.querySelector('#m-rastermanagement-histogram-band-row');
    const bandSelect = this.root_.querySelector('#m-rastermanagement-histogram-band');

    while (bandSelect.firstChild) {
      bandSelect.removeChild(bandSelect.firstChild);
    }

    this.bandHistograms_.forEach((bandHistogram) => {
      const option = document.createElement('option');
      option.value = String(bandHistogram.band);
      option.innerText = `${getValue('band')} ${bandHistogram.band}`;
      bandSelect.appendChild(option);
    });

    if (this.bandHistograms_.length > 1) {
      bandRow.classList.remove('hidden');
    } else {
      bandRow.classList.add('hidden');
    }
  }

  /**
   * @private
   * @function
   */
  renderSelectedBandStats_() {
    const bandSelect = this.root_.querySelector('#m-rastermanagement-histogram-band');
    const selectedBand = Number(bandSelect.value);
    let bandHistogram = this.bandHistograms_[0];
    for (let i = 0; i < this.bandHistograms_.length; i += 1) {
      if (this.bandHistograms_[i].band === selectedBand) {
        bandHistogram = this.bandHistograms_[i];
        break;
      }
    }

    const stats = computeBandStats(bandHistogram);
    if (!stats) {
      this.showError_(getValue('histogramEmpty'));
      return;
    }

    this.setStatValue_('pixels', stats.pixels, 0);
    this.setStatValue_('min', stats.min, 0);
    this.setStatValue_('max', stats.max, 0);
    this.setStatValue_('mean', stats.mean, 1);
    this.setStatValue_('median', stats.median, 1);
    this.setStatValue_('stddev', stats.stdDev, 1);
    this.setStatValue_('p25', stats.percentile25, 1);
    this.setStatValue_('p75', stats.percentile75, 1);
  }

  /**
   * @private
   * @function
   * @param {string} statId Identificador del valor estadístico.
   * @param {number} value Valor numérico.
   * @param {number} decimals Decimales a mostrar.
   */
  setStatValue_(statId, value, decimals) {
    const statEl = this.root_.querySelector(`#m-rastermanagement-histogram-stat-${statId}`);
    statEl.innerText = this.formatNumber_(value, decimals);
  }

  /**
   * @private
   * @function
   * @param {number} value Valor numérico.
   * @param {number} decimals Decimales a mostrar.
   * @returns {string}
   */
  formatNumber_(value, decimals) {
    let lang = 'es-ES';
    if (IDEE.language.getLang() === 'en') {
      lang = 'en-US';
    }
    return value.toLocaleString(lang, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}
