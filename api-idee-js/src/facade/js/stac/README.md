# IDEE.stac.Catalog

Clase de la fachada JavaScript de API IDEE para consultar catálogos [STAC](https://stacspec.org/) (SpatioTemporal Asset Catalog). Permite obtener colecciones, ítems, campos consultables y aplicar filtros simples o avanzados, tanto en catálogos públicos como en catálogos protegidos con autenticación Bearer.

**Fuente:** `api-idee-js/src/facade/js/stac/Catalog.js`

---

## Construcción

### Constructor

```javascript
// Catálogo público
const catalog = new IDEE.stac.Catalog({
  url: 'https://stac.dataspace.copernicus.eu/v1',
  public: true,
});
```

```javascript
// Catálogo privado
const catalog = new IDEE.stac.Catalog({
  url: 'https://stac.dataspace.copernicus.eu/v1',
  authUrl: 'https://mi-servidor-auth.example.com/o/custom-auth',
  public: false,
});
```


Los parámetros del constructor son los siguientes:
- **url** (`string`, obligatorio): URL base del catálogo STAC.
- **authUrl** (`string`, opcional*): URL del servicio de autenticación y autorización. Requerida si `public` es `false`.
- **public** (`boolean`, opcional): Indica si el catálogo es público. Por defecto `false`. Si es `true`, no se requiere autenticación.

\* `authUrl` es obligatorio para catálogos privados cuando se usen `authenticate()` o `getCollections()` en modo autenticado.

---

## Modos de funcionamiento

### Catálogo público

Cuando `public: true`:

- Las peticiones a ítems y queryables no envían cabecera `Authorization`.
- `getCollections()` consulta directamente `{url}/collections`.

### Catálogo privado

Cuando `public: false`:

1. Llamar primero a `authenticate(username, password)` para obtener el token.
2. Las peticiones posteriores incluyen `Authorization: Bearer {token}` cuando corresponda.
3. `getCollections()` consulta `{authUrl}/roles` con el token, devolviendo las colecciones autorizadas para el usuario.

---

## Métodos

Todos los métodos devuelven `Promise` y deben usarse con `async/await` o `.then()/.catch()`.

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

**Retorno:** `Promise<boolean>` — `true` si la autenticación fue correcta.

**Endpoint:** `POST {authUrl}/token` con cuerpo `{ username, password }`.

---

### `getCollections()`

Obtiene el listado de colecciones disponibles.

```javascript
const collections = await catalog.getCollections();
```

**Retorno:** `Promise<Array<Object>>` — Array de objetos colección STAC.

| Modo | Endpoint |
|------|----------|
| Público | `GET {url}/collections` |
| Privado | `POST {authUrl}/roles` con `{ accessToken: token }` |

---

### `getQueryableFields(collectionId)`

Obtiene los campos consultables de una colección para construir filtros.

```javascript
const fields = await catalog.getQueryableFields('ccm-optical');
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string` | Identificador de la colección. |

**Retorno:** `Promise<Array<Object>>` — Propiedades consultables (`data.properties` del endpoint).

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

**Endpoint:** `GET {url}/collections/{collectionId}/items?limit={limit}`

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

Filtra ítems mediante parámetros GET en la URL.

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
| `collectionId` | `string`/`String Array` | Identificador o array de identificadores de la/s coleccion/es |
| `filters` | `Object` | Parámetros de consulta (`limit`, `bbox`, `datetime`, `ids`). |

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

**Endpoint:** `GET {url}/collections/{collectionId}/items` con los filtros como query params.

---

### `getFilteredItemsAdvanced(collectionId, filter)`

Filtra ítems mediante el endpoint `/search` con filtros avanzados.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string`/`String Array` | Identificador o array de identificadores de la/s coleccion/es |
| `filter` | `Object` | Configuración del filtro (ver tabla siguiente). |
| `bbox` | `Number array` | Extensión de la zona de búsqueda. EPSG:4326

**Propiedades de `filter`:**

| Propiedad | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `format` | `string` | — | Formato: `stac-query`, `cql-json` o `cql2-json`. |
| `filter` | `Object` | — | Cuerpo del filtro según el formato. |
| `limit` | `number` | `10` | Número máximo de ítems. |

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`).

**Endpoint:** `POST {url}/search`

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