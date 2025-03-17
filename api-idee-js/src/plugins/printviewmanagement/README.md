<p align="center">
  <img src="https://www.ign.es/resources/viewer/images/logoApiCnig0.5.png" height="152" />
</p>
<h1 align="center"><strong>API IDEE</strong> <small>🔌 IDEE.plugin.printviewmanagement</small></h1>

# Descripción

Plugin que permite utilizar diferentes herramientas de impresión.
- Impresión de imagen con plantilla.
- Impresión de imagen (desde servidor o desde cliente).
- Impresión de imágenes de capas precargadas.
- Posibilidad de añadir fichero de georreferenciación (WLD).

# Dependencias

Para que el plugin funcione correctamente es necesario importar las siguientes dependencias en el documento html:

- **printviewmanagement.ol.min.js**
- **printviewmanagement.ol.min.css**

```html
 <link href="https://componentes.cnig.es/api-idee/plugins/printviewmanagement/printviewmanagement.ol.min.css" rel="stylesheet" />
 <script type="text/javascript" src="https://componentes.cnig.es/api-idee/plugins/printviewmanagement/printviewmanagement.ol.min.js"></script>
```

# Uso del histórico de versiones

Existe un histórico de versiones de todos los plugins de API-IDEE en [api-idee-legacy](https://github.com/Desarrollos-IDEE/API-IDEE/tree/master/api-idee-legacy/plugins) para hacer uso de versiones anteriores.
Ejemplo:
```html
 <link href="https://componentes.cnig.es/api-idee/plugins/printviewmanagement/printviewmanagement-1.0.0.ol.min.css" rel="stylesheet" />
 <script type="text/javascript" src="https://componentes.cnig.es/api-idee/plugins/printviewmanagement/printviewmanagement-1.0.0.ol.min.js"></script>
```

# Parámetros

El constructor se inicializa con un JSON con los siguientes atributos:

- **position**:  Ubicación del plugin sobre el mapa.
  - 'TL': (top left) - Arriba a la izquierda (por defecto).
  - 'TR': (top right) - Arriba a la derecha.
  - 'BL': (bottom left) - Abajo a la izquierda.
  - 'BR': (bottom right) - Abajo a la derecha.
- **collapsed**: Indica si el plugin viene colapsado de entrada (true/false). Por defecto: true.
- **collapsible**: Indica si el plugin puede abrirse y cerrarse (true) o si permanece siempre abierto (false). Por defecto: true.
- **tooltip**: Texto que se muestra al dejar el ratón encima del plugin. Por defecto: Impresión del mapa.
- **isDraggable**: "True" para que el plugin se pueda desplazar, por defecto false.
- **useProxy**: Define si el plugin utilizará el proxy o no, valores true o false. Por defecto: false.
- **serverUrl**: URL del servidor Geoprint. Por defecto: https://componentes.cnig.es/geoprint.
- **printStatusUrl**: URL para consultar el estado de la impresión. Por defecto: https://componentes.cnig.es/geoprint/print/status.
- **georefImageEpsg**: Indica si el control "Impresión de imágenes de capas precargadas" se añade al plugin (true/false). Por defecto: true.
  - **tooltip**: Texto que se muestra al dejar el ratón encima del plugin. Por defecto: Impresión del mapa.
  - **layers**: Array de objetos con información de las capas a imprimir.
    - url: URL de la capa.
    - name: Nombre de la capa.
    - format: Formato de la capa.
    - legend: Leyenda de la capa.
    - EPSG: Opcional, por defecto 3857.
  ```JavaScript
      layers: [
      {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa ETRS89 (long,lat)',
                EPSG: 'EPSG:4326',
              },
              {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa WGS84/Pseudo-Mercator',
                EPSG: 'EPSG:3857',
              },
              {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa ETRS89/UTM-31-N',
                EPSG: 'EPSG:25831',
              },
              {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa ETRS89/UTM-30-N',
                EPSG: 'EPSG:25830',
              },
              {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa ETRS89/UTM-29-N',
                EPSG: 'EPSG:25829',
              },
              {
                url: 'http://www.ign.es/wms-inspire/mapa-raster?',
                name: 'mtn_rasterizado',
                format: 'image/jpeg',
                legend: 'Mapa ETRS89/UTM-28-N',
                EPSG: 'EPSG:25828',
              },
    ],

  ```
- **georefImage**: Indica si el control "Impresión de imagen (desde servidor o desde cliente)" se añade al plugin (true/false). Por defecto: true.
  - **tooltip**: Texto que se muestra al dejar el ratón encima del plugin. Por defecto: Impresión del mapa.
  - **printTemplateUrl**: URL con las plantillas.
  - **printSelector**: Añade los dos modos de impresión (true/false). Por defecto: true.
  - **printType**: Define el modo de impresión (client/server), es necesario que printSelector tenga valor false.
- **printermap**:  Indica si el control "Impresión de imagen con plantilla" se añade al plugin (true/false). Por defecto: true.
  - **tooltip**: Texto que se muestra al dejar el ratón encima del plugin. Por defecto: Impresión del mapa.
  - **printTemplateUrl**: URL con las plantillas a utilizar. Por defecto: https://componentes.cnig.es/geoprint/print/CNIG.
  - **fixedDescription**: Valor booleano que indica si añadir por defecto un texto a la descripción específico de fototeca sin posibilidad de edición (true/false). Por defecto: false.
  - **headerLegend**: URL de una imagen para añadir como leyenda en la parte central de la cabecera.
  - **filterTemplates**: Listado de nombres de plantillas que queremos tener disponibles, si no se manda el parámetro aparecerán todas por defecto.
  - **logo**: URL de una imagen para añadir como logo en la esquina superior derecha.
- **defaultOpenControl**: Indica el control que aparecerá abierto al inicio. Por defecto: 0.

# API-REST

```javascript
URL_API?printviewmanagement=position*collapsed*collapsible*tooltip*isDraggable*serverUrl*printStatusUrl*georefImageEpsg*georefImage*printermap*defaultOpenControl
```

<table>
  <tr>
    <th>Parámetros</th>
    <th>Opciones/Descripción</th>
    <th>Disponibilidad</th>
  </tr>
  <tr>
    <td>position</td>
    <td>TR/TL/BR/BL</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>collapsed</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>collapsible</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>tooltip</td>
    <td>tooltip</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>isDraggable</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>serverUrl</td>
    <td>serverUrl</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>printStatusUrl</td>
    <td>printStatusUrl</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>georefImageEpsg (*)</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>georefImage (*)</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>printermap (*)</td>
    <td>true/false</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
  <tr>
    <td>defaultOpenControl</td>
    <td>0, 1, 2, 3</td>
    <td>Base64 ✔️ | Separador ✔️</td>
  </tr>
</table>
(*) Este parámetro podrá ser enviado por API-REST con los valores true o false. Si es true indicará al plugin que se añada el control con los valores por defecto. Para añadir los zooms deseados en los que se podrá centrar el mapa se deberá realizar mediante API-REST en base64.

### Ejemplos de uso API-REST

```
https://componentes.cnig.es/api-idee?printviewmanagement=TL*true*true*Imprimir*true***false*false*true
```

```
https://componentes.cnig.es/api-idee?printviewmanagement=TL*true*true*Imprimir*true***false*true*true*0

### Ejemplos de uso API-REST en base64

Para la codificación en base64 del objeto con los parámetros del plugin podemos hacer uso de la utilidad IDEE.utils.encodeBase64.
Ejemplo:
```javascript
IDEE.utils.encodeBase64(obj_params);
```

1) Ejemplo de constructor del plugin:

```javascript
{
  isDraggable: true,
  position: 'TL',
  collapsible: true,
  collapsed: true,
  tooltip: 'Imprimir',
  georefImageEpsg: {
    tooltip: 'Georeferenciar imagen',
    layers: [
      {
        url: 'http://www.ign.es/wms-inspire/mapa-raster?',
        name: 'mtn_rasterizado',
        format: 'image/jpeg',
        legend: 'Mapa ETRS89 UTM',
        EPSG: 'EPSG:4326',
      },
      {
        url: 'http://www.ign.es/wms-inspire/pnoa-ma?',
        name: 'OI.OrthoimageCoverage',
        format: 'image/jpeg',
        legend: 'Imagen (PNOA) ETRS89 UTM',
      },
    ],
  },
  georefImage: {
    tooltip: 'Georeferenciar imagen',
    printTemplateUrl: 'https://componentes.cnig.es/geoprint/print/mapexport',
    printSelector: true,
  },
  printermap: true,
  defaultOpenControl: 3
}
```
```
https://componentes.cnig.es/api-idee?printviewmanagement=base64=eyJpc0RyYWdnYWJsZSI6dHJ1ZSwicG9zaXRpb24iOiJUTCIsImNvbGxhcHNpYmxlIjp0cnVlLCJjb2xsYXBzZWQiOnRydWUsInRvb2x0aXAiOiJJbXByaW1pciIsImdlb3JlZkltYWdlRXBzZyI6eyJ0b29sdGlwIjoiR2VvcmVmZXJlbmNpYXIgaW1hZ2VuIiwibGF5ZXJzIjpbeyJ1cmwiOiJodHRwOi8vd3d3Lmlnbi5lcy93bXMtaW5zcGlyZS9tYXBhLXJhc3Rlcj8iLCJuYW1lIjoibXRuX3Jhc3Rlcml6YWRvIiwiZm9ybWF0IjoiaW1hZ2UvanBlZyIsImxlZ2VuZCI6Ik1hcGEgRVRSUzg5IFVUTSIsIkVQU0ciOiJFUFNHOjQzMjYifSx7InVybCI6Imh0dHA6Ly93d3cuaWduLmVzL3dtcy1pbnNwaXJlL3Bub2EtbWE/IiwibmFtZSI6Ik9JLk9ydGhvaW1hZ2VDb3ZlcmFnZSIsImZvcm1hdCI6ImltYWdlL2pwZWciLCJsZWdlbmQiOiJJbWFnZW4gKFBOT0EpIEVUUlM4OSBVVE0ifV19LCJnZW9yZWZJbWFnZSI6eyJ0b29sdGlwIjoiR2VvcmVmZXJlbmNpYXIgaW1hZ2VuIiwicHJpbnRUZW1wbGF0ZVVybCI6Imh0dHBzOi8vY29tcG9uZW50ZXMuY25pZy5lcy9nZW9wcmludC9wcmludC9tYXBleHBvcnQiLCJwcmludFNlbGVjdG9yIjp0cnVlfSwicHJpbnRlcm1hcCI6dHJ1ZSwiZGVmYXVsdE9wZW5Db250cm9sIjozfQ==
```


2) Ejemplo de constructor del plugin:
```javascript
{
  isDraggable: true,
  position: 'TL',
  collapsible: true,
  collapsed: true,
  tooltip: 'Imprimir',
  georefImageEpsg: false,
  georefImage: false,
  printermap: true
}
```
```
https://componentes.cnig.es/api-idee?printviewmanagement=base64=eyJpc0RyYWdnYWJsZSI6dHJ1ZSwicG9zaXRpb24iOiJUTCIsImNvbGxhcHNpYmxlIjp0cnVlLCJjb2xsYXBzZWQiOnRydWUsInRvb2x0aXAiOiJJbXByaW1pciIsImdlb3JlZkltYWdlRXBzZyI6ZmFsc2UsImdlb3JlZkltYWdlIjpmYWxzZSwicHJpbnRlcm1hcCI6dHJ1ZX0=
```

# Ejemplo de uso

```javascript
const map = IDEE.map({
  container: 'map'
});

const mp = new IDEE.plugin.PrintViewManagement({
  isDraggable: true,
  position: 'TL',
  collapsible: true,
  collapsed: true,
  tooltip: 'Imprimir',
  serverUrl: 'https://componentes.cnig.es/geoprint',
  printStatusUrl: 'https://componentes.cnig.es/geoprint/print/status',
  defaultOpenControl: 3
  georefImageEpsg: {
    tooltip: 'Georeferenciar imagen',
    layers: [
      {
        url: 'http://www.ign.es/wms-inspire/mapa-raster?',
        name: 'mtn_rasterizado',
        format: 'image/jpeg',
        legend: 'Mapa ETRS89 UTM',
        EPSG: 'EPSG:4326',
      },
      {
        url: 'http://www.ign.es/wms-inspire/pnoa-ma?',
        name: 'OI.OrthoimageCoverage',
        format: 'image/jpeg',
        legend: 'Imagen (PNOA) ETRS89 UTM',
        // EPSG: 'EPSG:4258',
      },
    ],
  },
  georefImage: {
    tooltip: 'Georeferenciar imagen',
    printTemplateUrl: 'https://componentes.cnig.es/geoprint/print/mapexport',
    printSelector: false,
    printType: 'client', // 'client' or 'server'
  },
  printermap: {
    printTemplateUrl: 'https://componentes.cnig.es/geoprint/print/CNIG',
    // fixedDescription: true,
    headerLegend: 'https://www.idee.es/csw-codsi-idee/images/cabecera-CODSI.png',
    filterTemplates: ['A3 Horizontal'],
    logo: 'https://www.idee.es/csw-codsi-idee/images/cabecera-CODSI.png',
  },
});

map.addPlugin(mp);

```


# 👨‍💻 Desarrollo

Para el stack de desarrollo de este componente se ha utilizado

* NodeJS Version: 14.16
* NPM Version: 6.14.11
* Entorno Windows.

## 📐 Configuración del stack de desarrollo / *Work setup*


### 🐑 Clonar el repositorio / *Cloning repository*

Para descargar el repositorio en otro equipo lo clonamos:

```bash
git clone [URL del repositorio]
```

### 1️⃣ Instalación de dependencias / *Install Dependencies*

```bash
npm i
```

### 2️⃣ Arranque del servidor de desarrollo / *Run Application*

```bash
npm start:ol
npm start:cesium
```

## 📂 Estructura del código / *Code scaffolding*

```any
/
├── src 📦                  # Código fuente
├── task 📁                 # EndPoints
├── test 📁                 # Testing
├── webpack-config 📁       # Webpack configs
└── ...
```
## 📌 Metodologías y pautas de desarrollo / *Methodologies and Guidelines*

Metodologías y herramientas usadas en el proyecto para garantizar el Quality Assurance Code (QAC)

* ESLint
  * [NPM ESLint](https://www.npmjs.com/package/eslint) \
  * [NPM ESLint | Airbnb](https://www.npmjs.com/package/eslint-config-airbnb)

## ⛽️ Revisión e instalación de dependencias / *Review and Update Dependencies*

Para la revisión y actualización de las dependencias de los paquetes npm es necesario instalar de manera global el paquete/ módulo "npm-check-updates".

```bash
# Install and Run
$npm i -g npm-check-updates
$ncu
```

## Tabla de compatibilidad de versiones   
[Consulta el api resourcePlugin](https://componentes-desarrollo.idee.es/api-idee/api/actions/resourcesPlugins?name=printviewmanagement)
