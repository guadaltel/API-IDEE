# IDEE.stac.Catalog

Clase de la fachada JavaScript de API IDEE para consultar catálogos [STAC](https://stacspec.org/) (SpatioTemporal Asset Catalog). Permite obtener colecciones, ítems, campos consultables y aplicar filtros simples o avanzados, tanto en catálogos públicos como en catálogos protegidos con autenticación Bearer.

**Fuente:** `api-idee-js/src/facade/js/stac/Catalog.js`

---

## Construcción

### Constructor

```javascript
// Catalogo público
const catalog = new IDEE.stac.Catalog({
  url: 'https://stac.dataspace.copernicus.eu/v1',
  title: 'Copernicus Data Space',
  public: true,
});
```

```javascript
// Catalogo privado
const catalog = new IDEE.stac.Catalog({
  url: 'https://stac.dataspace.copernicus.eu/v1',
  authUrl: 'https://mi-servidor-auth.example.com/o/custom-auth/token',
  collectionsUrl: 'https://mi-servidor-auth.example.com/o/collections',
  title: 'Copernicus Data Space',
  public: false,
});
```

Los parámetros del constructor son los siguientes:

| Parámetro | Tipo | Obligatorio | Descripción |
|-----------|------|-------------|-------------|
| `url` | `string` | Sí | URL base del catálogo STAC. |
| `authUrl` | `string` | Sí\* | URL del servicio de autenticación. Requerida si `public` es `false`. |
| `collectionsUrl` | `string` | Sí\* | URL del servicio de colecciones autorizadas. Requerida si `public` es `false`. Si se omite en catálogos públicos, se consulta `{url}/collections`. |
| `title` | `string` | No | Título descriptivo del catálogo (usado por el plugin de gestión de catálogos). |
| `public` | `boolean` | No | Indica si el catálogo es público. Por defecto `true` (debe indicarse `false` explícitamente para catálogos privados). |

\* `authUrl` es obligatorio para catálogos privados cuando se use `authenticate()` para obtener el token que se usará en el resto de consultas.

### Propiedades de instancia

Tras la construcción, la instancia expone:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `url` | `string` | URL base del catálogo STAC. |
| `public` | `boolean` | Indica si el catálogo es público. |
| `authUrl` | `string` | URL del servicio de autenticación. |
| `collectionsUrl` | `string` | URL del servicio de colecciones (si se indicó en el constructor). |
| `title` | `string` | Título descriptivo del catálogo (si se indicó en el constructor). |
| `token` | `string\|null` | Token de acceso obtenido tras `authenticate()`. Inicialmente `null`. |

---

## Modos de funcionamiento

### Catálogo público

Cuando `public: true`:

- Las peticiones a ítems y queryables no envían cabecera `Authorization`.
- Si no se indica `collectionsUrl`, `getCollections()` consulta `GET {url}/collections`.
- Si se indica `collectionsUrl`, `getCollections()` consulta ese endpoint (con o sin token según el servicio).

### Catálogo privado

Cuando `public: false`:

1. Llamar primero a `authenticate(username, password)` para obtener el token.
2. Las peticiones posteriores incluyen `Authorization: Bearer {token}` cuando corresponda.
3. `getCollections()` consulta `POST {collectionsUrl}` con `{ accessToken: token }`, devolviendo las colecciones autorizadas para el usuario.

---

## Métodos

Todos los métodos asíncronos devuelven `Promise` y deben usarse con `async/await` o `.then()/.catch()`. La excepción es `getFilterData()`, que es síncrono.

### `authenticate(username, password)`

Autentica al usuario y almacena el token en la instancia.

```javascript
await catalog.authenticate('usuario', 'contraseña');
// catalog.token contiene el access_token
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `username` | `string` | Nombre de usuario. |
| `password` | `string` | Contraseña. |

**Retorno:** `Promise<boolean>` — `true` si la autenticación fue correcta. Devuelve `undefined` si faltan credenciales.

**Endpoint:** `POST {authUrl}` con cuerpo `{ username, password }`.

---

### `getCollections()`

Obtiene el listado de colecciones disponibles.

```javascript
const collections = await catalog.getCollections();
```

**Retorno:** `Promise<Array<Object>>` — Array de objetos colección STAC.

| Modo | Endpoint |
|------|----------|
| Público sin `collectionsUrl` | `GET {url}/collections` |
| Público con `collectionsUrl` o privado | `POST {collectionsUrl}` con `{ accessToken: token }` (el token puede ser `null` si el servicio no lo exige) |

---

### `getQueryableFields(collectionId)`

Obtiene los campos consultables de una colección para construir filtros.

```javascript
const fields = await catalog.getQueryableFields('ccm-optical');
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string` | Identificador de la colección. |

**Retorno:** `Promise<Object>` — Esquema de propiedades consultables (`data.properties` del endpoint).

**Endpoint:** `GET {url}/collections/{collectionId}/queryables`

---

### `getItems(collectionId, limit)`

Obtiene ítems de una colección con un límite de resultados.

```javascript
const items = await catalog.getItems('ccm-optical', 10);
```

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `collectionId` | `string` | — | Identificador de la colección. |
| `limit` | `number` | `10` | Número máximo de ítems. |

**Retorno:** `Promise<Object>` — Respuesta STAC (`FeatureCollection`).

Genera la `url` de consulta y delega la petición en `getItemsByUrl()`.

---

### `getItem(collectionId, itemId)`

Obtiene un ítem concreto.

```javascript
const item = await catalog.getItem('ccm-optical', 'PH1B_PHR_MS___3_20241115T141727_20241115T141750_TOU_000324_e7a7_COG');
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string` | Identificador de la colección. |
| `itemId` | `string` | Identificador del ítem. |

**Retorno:** `Promise<Object>` — Ítem STAC (`Feature`).

**Endpoint:** `GET {url}/collections/{collectionId}/items/{itemId}`

---

### `getFilteredItems(collectionId, filters)`

Filtra ítems de una o varias colecciones mediante el endpoint `/search` con parámetros GET.

El identificador de colección se añade automáticamente al parámetro `collections` del filtro.

```javascript
const result = await catalog.getFilteredItems('ccm-optical', {
  limit: 5,
  bbox: [-34.674591705357614, 47.382657634959315, 36.03763092946285, 57.276663809738096],
  datetime: '2022-04-29T10:58:10.00Z',
  ids: ['PH1B_PHR_MS___3_20220429T105809_20220429T105811_TOU_1234_8a08_COG', 'PH1B_PHR_MS__2A_20220429T105809_20220429T105811_TOU_1234_8a08']
});

const result = await catalog.getFilteredItems(['ccm-optical', 'clms_lie_europe_250m_daily_v2_cog'], {
  limit: 5,
  bbox: [-34.674591705357614, 47.382657634959315, 36.03763092946285, 57.276663809738096],
  datetime: '2022-04-29T10:58:10.00Z',
});

```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string\|Array<string>` | Identificador o array de identificadores de la/s colección/es. |
| `filters` | `Object` | Parámetros de consulta (`limit`, `bbox`, `datetime`, `ids`, etc.). |

El filtro `bbox` debe estar en EPSG:4326 (longitud, latitud).

#### Formato del parámetro `datetime`

Sigue [RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339) (ISO 8601 con zona horaria). El servidor devuelve ítems cuyo intervalo temporal **intersecta** el valor indicado (normalmente `properties.start_datetime` y `properties.end_datetime`).

| Formato | Ejemplo | Descripción |
|---------|---------|-------------|
| Instantánea | `2022-04-29T10:58:10.00Z` | Un solo momento en UTC (`Z`) u offset (`+02:00`) |
| Intervalo cerrado | `2022-04-29T00:00:00Z/2022-04-29T23:59:59Z` | Desde / hasta, separados por `/` |
| Intervalo abierto (desde) | `2022-04-29T00:00:00Z/..` | Desde esa fecha, sin límite superior |
| Intervalo abierto (hasta) | `../2022-04-29T23:59:59Z` | Hasta esa fecha, sin límite inferior |

Solo un extremo del intervalo puede estar abierto.

```javascript
// Rango cerrado
await catalog.getFilteredItems('ccm-optical', {
  datetime: '2022-04-29T00:00:00Z/2022-04-29T23:59:59Z',
  limit: 10,
});

// Desde una fecha en adelante
await catalog.getFilteredItems('ccm-optical', {
  datetime: '2022-04-29T00:00:00Z/..',
  limit: 10,
});
```

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`).

Genera la `url` de consulta y delega en `getItemsByUrl()`.

---

### `getFilteredItemsAdvanced(collectionId, filter, bbox, datetime)`

Filtra ítems mediante el endpoint `/search` con filtros avanzados (POST).

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `collectionId` | `string\|Array<string>` | — | Identificador o array de identificadores de la/s colección/es. |
| `filter` | `Object` | — | Configuración del filtro (ver tabla siguiente). |
| `bbox` | `Array<number>` | `null` | Extensión de la zona de búsqueda en EPSG:4326. |
| `datetime` | `string` | `null` | Intervalo temporal en RFC 3339. |

**Propiedades de `filter`:**

| Propiedad | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `format` | `string` | — | Formato: `stac-query`, `cql-json` o `cql2-json`. |
| `filter` | `Object` | — | Cuerpo del filtro según el formato. |
| `limit` | `number` | `10` | Número máximo de ítems. |

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`).

Genera la `url` y el `body` de consulta y delega en `getFilteredItemsAdvancedByUrl()`.

#### Ejemplos por formato de filtro

**STAC Query (`stac-query`):**

```javascript
const result = await catalog.getFilteredItemsAdvanced('ccm-optical', {
  format: 'stac-query',
  filter: {
    datetime: { lte: '2024-01-01T00:00:00Z' },
  },
  limit: 10,
}, [-34.674591705357614, 47.382657634959315, 36.03763092946285, 57.276663809738096]);

const result = await catalog.getFilteredItemsAdvanced(['ccm-optical', 'clms_lie_europe_250m_daily_v2_cog'], {
  format: 'stac-query',
  filter: {
    datetime: { lte: '2024-01-01T00:00:00Z' },
  },
  limit: 10,
}, [-34.674591705357614, 47.382657634959315, 36.03763092946285, 57.276663809738096]);
```

**CQL JSON (`cql-json`):**

```javascript
const result = await catalog.getFilteredItemsAdvanced('ccm-optical', {
  format: 'cql-json',
  filter: {
    op: 'and',
    args: [
      { op: 'gte', args: [{ property: 'datetime' }, '2024-01-01T00:00:00Z'] },
      { op: 'lte', args: [{ property: 'datetime' }, '2025-01-01T00:00:00Z'] }
    ],
  },
  limit: 10,
});
```

**CQL2 JSON (`cql2-json`):**

```javascript
const result = await catalog.getFilteredItemsAdvanced('ccm-optical', {
  format: 'cql2-json',
  filter: {
    op: 'and',
    args: [
      { op: '>=', args: [{ property: 'datetime' }, '2024-01-01T00:00:00Z'] },
      { op: '<=', args: [{ property: 'datetime' }, '2025-01-01T00:00:00Z'] }
    ],
  },
  limit: 10,
});
```

---

### `getFilteredItemsAdvancedByLinks(links, rel)`

Obtiene ítems filtrados avanzados siguiendo un enlace de paginación de una respuesta `/search` anterior.

```javascript
const nextPage = await catalog.getFilteredItemsAdvancedByLinks(result.links, 'next');
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `links` | `Array<Object>` | Array de enlaces (`links`) de la respuesta STAC. |
| `rel` | `string` | Relación del enlace: `self`, `next` o `previous`. |

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`). Devuelve `undefined` si los parámetros no son válidos.

Utiliza el `href` y el `body` del enlace y delega en `getFilteredItemsAdvancedByUrl()`.

---

### `getFilteredItemsAdvancedByUrl(url, body, errorMessage)`

Realiza una petición POST genérica al endpoint `/search` con un cuerpo de filtro.

```javascript
const result = await catalog.getFilteredItemsAdvancedByUrl(
  'https://stac.example.com/v1/search',
  { collections: ['ccm-optical'], limit: 10, query: { datetime: { lte: '2024-01-01T00:00:00Z' } } },
  'Error en búsqueda avanzada',
);
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `url` | `string` | URL del endpoint STAC `/search`. |
| `body` | `Object` | Cuerpo JSON de la petición con la configuración del filtro. |
| `errorMessage` | `string` | Mensaje de error si la petición falla. |

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`).

Añade la cabecera `Authorization: Bearer {token}` cuando el catálogo es privado y existe token.

---

### `getFilterData(collectionId, filter, bbox, datetime)`

Construye el cuerpo de la petición POST para el endpoint `/search` a partir de la configuración de filtro. Útil para reutilizar o inspeccionar el payload antes de enviarlo.

```javascript
const body = catalog.getFilterData('ccm-optical', {
  format: 'stac-query',
  filter: { datetime: { lte: '2024-01-01T00:00:00Z' } },
  limit: 10,
}, [-5, 35, 5, 45], '2024-01-01T00:00:00Z/2024-12-31T23:59:59Z');
// { collections: ['ccm-optical'], limit: 10, bbox: [...], datetime: '...', query: {...} }
```

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `collectionId` | `string\|Array<string>\|null` | — | Identificador(es) de colección. Si es `null`, no se restringe por colección. |
| `filter` | `Object` | — | Configuración del filtro (`format`, `filter`, `limit`). |
| `bbox` | `Array<number>` | `null` | Extensión en EPSG:4326. |
| `datetime` | `string` | `null` | Intervalo temporal en RFC 3339. |

**Retorno:** `Object|null` — Cuerpo de la petición listo para POST, o `null` si el formato de filtro no es válido.

**Formatos soportados en `filter.format`:** `stac-query`, `cql-json`, `cql2-json`.

---

## Uso con mapa

Los ítems STAC devueltos son GeoJSON (`Feature` o `FeatureCollection`) y pueden visualizarse con las capas de API IDEE:

```javascript

const mapa = new IDEE.map({
  container: 'map',
  projection: 'EPSG:3857',
  layers: ['OSM'],
});

const catalog = new IDEE.stac.Catalog({
  url: 'https://stac.dataspace.copernicus.eu/v1',
  public: true,
});

const result = await catalog.getItems('ccm-optical', 5);

const layer = new IDEE.layer.GeoJSON({
  name: 'STAC items',
  source: result,
  extract: true,
});

layer.on('load', () => {
  mapa.setBbox(layer.getFeaturesExtent());
});

mapa.addLayers(layer);

// Opcional: añadir assets GeoTIFF de los ítems
result.features.forEach((feature) => {
  Object.values(feature.assets).forEach((asset) => {
    if (asset.href.endsWith('.tif')) {
      mapa.addLayers(new GeoTIFF({ url: asset.href }));
    }
  });
});
```

---

### `getItemsByUrl(url, params, errorMessage)`

Realiza una petición GET genérica para obtener ítems desde una URL STAC.

```javascript
const items = await catalog.getItemsByUrl(
  'https://stac.example.com/v1/collections/mi-coleccion/items',
  { limit: 20 },
  'Error al obtener ítems',
);
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `url` | `string` | URL del endpoint STAC. |
| `params` | `Object\|null` | Parámetros de consulta de la petición GET. |
| `errorMessage` | `string` | Mensaje de error si la petición falla. |

**Retorno:** `Promise<Object>` — Respuesta STAC (`FeatureCollection`).

Añade la cabecera `Authorization: Bearer {token}` cuando el catálogo es privado y existe token.

---

---

### `getItemsByLinks(links, rel)`

Obtiene ítems siguiendo un enlace de paginación de una respuesta STAC anterior.

```javascript
const nextPage = await catalog.getItemsByLinks(items.links, 'next');
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `links` | `Array<Object>` | Array de enlaces (`links`) de la respuesta STAC. |
| `rel` | `string` | Relación del enlace: `self`, `next` o `previous`. |

**Retorno:** `Promise<Object>` — Respuesta STAC (`FeatureCollection`). Devuelve `undefined` si los parámetros no son válidos.

Delega la petición en `getItemsByUrl()`.