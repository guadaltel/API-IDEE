<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="es.juntadeandalucia.mapea.plugins.PluginsManager"%>
<%@ page import="es.juntadeandalucia.mapea.parameter.adapter.ParametersAdapterV3ToV4"%>
<%@ page import="java.util.Map"%>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="mapea" content="yes">
    <title>Visor base</title>
    <link type="text/css" rel="stylesheet" href="assets/css/apiign-1.0.0.ol.min.css">
    <link href="plugins/ignsearch/ignsearch.ol.min.css" rel="stylesheet" />
    <link href="plugins/attributions/attributions.ol.min.css" rel="stylesheet" />
    <link href="plugins/xylocator/xylocator.ol.min.css" rel="stylesheet" />
    <link href="plugins/sharemap/sharemap.ol.min.css" rel="stylesheet" />
    <link href="plugins/mousesrs/mousesrs.ol.min.css" rel="stylesheet" />
    <link href="plugins/zoomextent/zoomextent.ol.min.css" rel="stylesheet" />
    <link href="plugins/toc/toc.ol.min.css" rel="stylesheet" />
    <link href="plugins/selectionzoom/selectionzoom.ol.min.css" rel="stylesheet" />
    </link>
    <style type="text/css">
        html,
        body {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
        }
    </style>
    <%
      Map<String, String[]> parameterMap = request.getParameterMap();
      PluginsManager.init (getServletContext());
      Map<String, String[]> adaptedParams = ParametersAdapterV3ToV4.adapt(parameterMap);
      String[] cssfiles = PluginsManager.getCSSFiles(adaptedParams);
      for (int i = 0; i < cssfiles.length; i++) {
         String cssfile = cssfiles[i];
   %>
    <link type="text/css" rel="stylesheet" href="plugins/<%=cssfile%>">
    </link>
    <%
      } %>
</head>

<body>
    <div id="mapjs" class="m-container"></div>
    <script type="text/javascript" src="vendor/browser-polyfill.js"></script>
    <script type="text/javascript" src="js/apiign-1.0.0.ol.min.js"></script>
    <script type="text/javascript" src="js/configuration-1.0.0.js"></script>
    <script type="text/javascript" src="plugins/ignsearch/ignsearch.ol.min.js"></script>
    <script type="text/javascript" src="plugins/attributions/attributions.ol.min.js"></script>
    <script type="text/javascript" src="plugins/xylocator/xylocator.ol.min.js"></script>
    <script type="text/javascript" src="plugins/sharemap/sharemap.ol.min.js"></script>
    <script type="text/javascript" src="plugins/zoomextent/zoomextent.ol.min.js"></script>
    <script type="text/javascript" src="plugins/mousesrs/mousesrs.ol.min.js"></script>
    <script type="text/javascript" src="plugins/toc/toc.ol.min.js"></script>
    <script type="text/javascript" src="plugins/selectionzoom/selectionzoom.ol.min.js"></script>
    <%
      String[] jsfiles = PluginsManager.getJSFiles(adaptedParams);
      for (int i = 0; i < jsfiles.length; i++) {
         String jsfile = jsfiles[i];
   %>
    <script type="text/javascript" src="plugins/<%=jsfile%>"></script>

    <%
      }
   %>
    <script type="text/javascript">
        const map = M.map({
            container: 'mapjs',
            controls: ['panzoom', 'scale*true', 'scaleline', 'rotate', 'location', 'getfeatureinfo'],
            zoom: 5,
            maxZoom: 20,
            minZoom: 4,
            center: [-467062.8225, 4683459.6216],
        });

        const layerinicial = new M.layer.WMS({
            url: 'https://www.ign.es/wms-inspire/unidades-administrativas?',
            name: 'AU.AdministrativeBoundary',
            legend: 'Limite administrativo',
            tiled: false,
        }, {});

        const layerUA = new M.layer.WMS({
            url: 'https://www.ign.es/wms-inspire/unidades-administrativas?',
            name: 'AU.AdministrativeUnit',
            legend: 'Unidad administrativa',
            tiled: false
        }, {});

        map.addLayers([layerinicial, layerUA]);

        const mp = new M.plugin.IGNSearch({
            servicesToSearch: 'gn',
            maxResults: 10,
            isCollapsed: false,
            noProcess: 'municipio,poblacion',
            countryCode: 'es',
            reverse: true,
        });
        const mp2 = new M.plugin.Attributions({
            mode: 1,
            scale: 10000,
        });

        const mp3 = new M.plugin.ShareMap({
            baseUrl: 'https://componentes.ign.es/api-core/',
            position: 'BR',
        });
        const mp4 = new M.plugin.XYLocator({
            position: 'TL',
        });
        const mp6 = new M.plugin.ZoomExtent();
        const mp7 = new M.plugin.MouseSRS({
            srs: 'EPSG:4326',
            label: 'WGS84',
            precision: 6,
            geoDecimalDigits: 4,
            utmDecimalDigits: 2,
        });

        const mp8 = new M.plugin.TOC({
            collapsed: false,
        });

        const mp9 = new M.plugin.SelectionZoom({
            position: 'TR',
            collapsible: true,
            collapsed: true,
            layerId: 0,
            layerVisibility: true,
            layerOpts: [{
                    id: 'peninsula',
                    preview: 'plugins/selectionzoom/images/espana.png',
                    title: 'Peninsula',
                    layers: [new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/pnoa-ma?',
                            name: 'OI.OrthoimageCoverage',
                            legend: 'Imagen (PNOA)',
                            matrixSet: 'GoogleMapsCompatible',
                            transparent: true,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/jpeg',
                        }),
                        new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/ign-base?',
                            name: 'IGNBaseOrto',
                            matrixSet: 'GoogleMapsCompatible',
                            legend: 'Mapa IGN',
                            transparent: false,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/png',
                        })
                    ],
                },
                {
                    id: 'canarias',
                    title: 'Canarias',
                    preview: 'plugins/selectionzoom/images/canarias.png',
                    layers: [new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/pnoa-ma?',
                            name: 'OI.OrthoimageCoverage',
                            legend: 'Imagen (PNOA)',
                            matrixSet: 'GoogleMapsCompatible',
                            transparent: true,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/jpeg',
                        }),
                        new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/ign-base?',
                            name: 'IGNBaseOrto',
                            matrixSet: 'GoogleMapsCompatible',
                            legend: 'Mapa IGN',
                            transparent: false,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/png',
                        })
                    ],
                },
                {
                    id: 'baleares',
                    title: 'Baleares',
                    preview: 'plugins/selectionzoom/images/baleares.png',
                    layers: [new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/pnoa-ma?',
                            name: 'OI.OrthoimageCoverage',
                            legend: 'Imagen (PNOA)',
                            matrixSet: 'GoogleMapsCompatible',
                            transparent: true,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/jpeg',
                        }),
                        new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/ign-base?',
                            name: 'IGNBaseOrto',
                            matrixSet: 'GoogleMapsCompatible',
                            legend: 'Mapa IGN',
                            transparent: false,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/png',
                        })
                    ],
                },
                {
                    id: 'ceuta',
                    preview: 'plugins/selectionzoom/images/ceuta.png',
                    title: 'Ceuta',
                    layers: [new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/pnoa-ma?',
                            name: 'OI.OrthoimageCoverage',
                            legend: 'Imagen (PNOA)',
                            matrixSet: 'GoogleMapsCompatible',
                            transparent: true,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/jpeg',
                        }),
                        new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/ign-base?',
                            name: 'IGNBaseOrto',
                            matrixSet: 'GoogleMapsCompatible',
                            legend: 'Mapa IGN',
                            transparent: false,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/png',
                        })
                    ],
                },
                {
                    id: 'melilla',
                    preview: 'plugins/selectionzoom/images/melilla.png',
                    title: 'Melilla',
                    layers: [new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/pnoa-ma?',
                            name: 'OI.OrthoimageCoverage',
                            legend: 'Imagen (PNOA)',
                            matrixSet: 'GoogleMapsCompatible',
                            transparent: true,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/jpeg',
                        }),
                        new M.layer.WMTS({
                            url: 'http://www.ign.es/wmts/ign-base?',
                            name: 'IGNBaseOrto',
                            matrixSet: 'GoogleMapsCompatible',
                            legend: 'Mapa IGN',
                            transparent: false,
                            displayInLayerSwitcher: false,
                            queryable: false,
                            visible: true,
                            format: 'image/png',
                        })
                    ],
                },
            ],
        });

        map.addPlugin(mp);
        map.addPlugin(mp2);
        map.addPlugin(mp3);
        map.addPlugin(mp4);
        map.addPlugin(mp6);
        map.addPlugin(mp7);
        map.addPlugin(mp8);
        map.addPlugin(mp9);
    </script>
</body>

</html>