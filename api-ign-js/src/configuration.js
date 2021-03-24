/**
 * IGN API
 * Version ${pom.version}
 * Date ${build.timestamp}
 */

const backgroundlayersIds = '${backgroundlayers.ids}'.split(',');
const backgroundlayersTitles = '${backgroundlayers.titles}'.split(',');
const backgroundlayersLayers = '${backgroundlayers.layers}'.split(',');
const backgroundlayersOpts = backgroundlayersIds.map((id, index) => {
  return {
    id,
    title: backgroundlayersTitles[index],
    layers: backgroundlayersLayers[index].split('+'),
  };
});

(function(M) {
  /**
   * Pixels width for mobile devices
   *
   * @private
   * @type {Number}
   */
  M.config('MOBILE_WIDTH', '${mobile.width}');

  /**
   * The Mapea URL
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('MAPEA_URL', '${mapea.url}');

  /**
   * The path to the Mapea proxy to send
   * jsonp requests
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('PROXY_URL', location.protocol + '${mapea.proxy.url}');

  /**
   * The path to the Mapea proxy to send
   * jsonp requests
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('PROXY_POST_URL', location.protocol + '${mapea.proxy_post.url}');

  /**
   * The path to the Mapea templates
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('TEMPLATES_PATH', '${mapea.templates.path}');

  /**
   * The path to the Mapea theme
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('THEME_URL', location.protocol + '${mapea.theme.url}');

  /**
   * The path to the Mapea theme
   * @const
   * @type {string}
   * @public
   * @api stable
   */

  /**
   * TODO
   * @type {object}
   * @public
   * @api stable
   */
  M.config('tileMappgins', {
    /**
     * Predefined WMC URLs
     * @const
     * @type {Array<string>}
     * @public
     * @api stable
     */
    'tiledNames': '${tile.mappings.tiledNames}'.split(','),

    /**
     * WMC predefined names
     * @const
     * @type {Array<string>}
     * @public
     * @api stable
     */
    'tiledUrls': '${tile.mappings.tiledUrls}'.split(','),

    /**
     * WMC context names
     * @const
     * @type {Array<string>}
     * @public
     * @api stable
     */
    'names': '${tile.mappings.names}'.split(','),

    /**
     * WMC context names
     * @const
     * @type {Array<string>}
     * @public
     * @api stable
     */
    'urls': '${tile.mappings.urls}'.split(',')
  });

  /**
   * Default projection
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('DEFAULT_PROJ', '${mapea.proj.default}');

  /**
   * Default projection
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('GEOPRINT_URL', '${geoprint.url}');

  /**
   * Default projection
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('GEOREFIMAGE_TEMPLATE', '${geoprint.url}' + '${georefimage.template}');

  /**
   * Default projection
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('PRINTERMAP_TEMPLATE', '${geoprint.url}' + '${printermap.template}');

  /**
   * Default projection
   * @const
   * @type {string}
   * @public
   * @api stable
   */
  M.config('GEOPRINT_STATUS', '${geoprint.url}' + '${geoprint.status}');

  /**
   * WMTS configuration
   *
   * @private
   * @type {object}
   */
  M.config('wmts', {
    base: '${wmts.base}',
  });

  /**
   * Controls configuration
   *
   * @private
   * @type {object}
   */
  M.config('controls', {
    default: '${controls.default}',
  });

  /**
   * Attributions configuration
   *
   * @private
   * @type {object}
   */
  M.config('attributions', {
    defaultAttribution: '${attributions.defaultAttribution}',
    defaultURL: '${attributions.defaultURL}',
    url: '${attributions.url}',
    type: '${attributions.type}',
  });

  /**
   * BackgroundLayers Control
   *
   * @private
   * @type {object}
   */
  M.config('backgroundlayers', backgroundlayersOpts);

  /**
   * IGNSearch List Control
   *
   * @private
   * @type {object}
   */
   M.config('IGNSEARCH_TYPES_CONFIGURATION', [
     'Estado',
     'Isla administrativa',
     'Comarca administrativa',
     'Jurisdicci\u00F3n',
     'Distrito municipal',
     'Construcci\u00F3n/instalaci\u00F3n abierta',
     'Edificaci\u00F3n',
     'V\u00E9rtice Geod\u00E9sico',
     'Alineaci\u00F3n monta\u00F1osa',
     'Monta\u00F1a',
     'Paso de monta\u00F1a',
     'Llanura',
     'Depresi\u00F3n',
     'Vertientes',
     'Comarca geogr\u00E1fica',
     'Paraje',
     'Elemento puntual del paisaje',
     'Saliente costero',
     'Playa',
     'Isla',
     'Otro relieve costero',
     'Espacio protegido restante',
     'Instalaci\u00F3n portuaria',
     'Camino y v\u00EDa pecuaria',
     'Curso natural de agua',
     'Masa de agua',
     'Curso artificial de agua',
     'Embalse',
     'Hidr\u00F3nimo puntual',
     'Glaciares',
     'Mar',
     'Entrante costero y estrecho mar\u00EDtimo',
     'Relieve submarino',
   ]);
})(window.M);
