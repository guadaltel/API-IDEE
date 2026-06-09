# IDEE.stac.Catalog

Clase de la fachada JavaScript de API IDEE para consultar catálogos [STAC](https://stacspec.org/) (SpatioTemporal Asset Catalog). Permite obtener colecciones, ítems, campos consultables y aplicar filtros simples o avanzados, tanto en catálogos públicos como en catálogos protegidos con autenticación Bearer.

**Fuente:** `api-idee-js/src/facade/js/stac/Catalog.js`

---

## Construcción

### Constructor

```javascript
const catalog = new IDEE.stac.Catalog({
  url: 'https://earth-search.aws.element84.com/v1',
  authUrl: 'https://mi-servidor-auth.example.com/o/custom-auth',
  public: true,
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
const fields = await catalog.getQueryableFields('sentinel-2-pre-c1-l2a');
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
const items = await catalog.getItems('sentinel-2-pre-c1-l2a', 10);
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
const item = await catalog.getItem('sentinel-2-pre-c1-l2a', 'S2A_MSIL2A_20240101T101031');
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
const result = await catalog.getFilteredItems('sentinel-2-pre-c1-l2a', {
  limit: 5,
  bbox: [-5, 36, -4, 37],
  datetime: '2024-01-01T00:00:00Z/2024-12-31T23:59:59Z',
});
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string` | Identificador de la colección. |
| `filters` | `Object` | Parámetros de consulta (p. ej. `limit`, `bbox`, `datetime`). |

**Retorno:** `Promise<Object>` — Respuesta STAC filtrada (`FeatureCollection`).

**Endpoint:** `GET {url}/collections/{collectionId}/items` con los filtros como query params.

---

### `getFilteredItemsAdvanced(collectionId, filter)`

Filtra ítems mediante el endpoint `/search` con filtros avanzados.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `collectionId` | `string` | Identificador de la colección. |
| `filter` | `Object` | Configuración del filtro (ver tabla siguiente). |

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
const result = await catalog.getFilteredItemsAdvanced('sentinel-2-pre-c1-l2a', {
  format: 'stac-query',
  filter: {
    'eo:cloud_cover': { lt: 20 },
    datetime: { gte: '2024-01-01T00:00:00Z' },
  },
  limit: 10,
});
```

**CQL JSON (`cql-json`):**

```javascript
const result = await catalog.getFilteredItemsAdvanced('sentinel-2-pre-c1-l2a', {
  format: 'cql-json',
  filter: {
    op: 'and',
    args: [
      { op: 'lt', args: [{ property: 'eo:cloud_cover' }, 20] },
      { op: 'gte', args: [{ property: 'datetime' }, '2024-01-01T00:00:00Z'] },
    ],
  },
  limit: 10,
});
```

**CQL2 JSON (`cql2-json`):**

```javascript
const result = await catalog.getFilteredItemsAdvanced('sentinel-2-pre-c1-l2a', {
  format: 'cql2-json',
  filter: {
    op: 'and',
    args: [
      { op: '<', args: [{ property: 'eo:cloud_cover' }, 20] },
      { op: '>=', args: [{ property: 'datetime' }, '2024-01-01T00:00:00Z'] },
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
  url: 'https://earth-search.aws.element84.com/v1',
  public: true,
});

const result = await catalog.getItems('sentinel-2-pre-c1-l2a', 5);

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