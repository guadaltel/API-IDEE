# IDEE.style.Raster

Permite **cambiar cómo se ve una capa de imagen en el mapa** (GeoTIFF) dentro del visor IDEE: colores según el valor del dato, filtros de imagen o zonas transparentes.

---

## Índice

**Parte 1 — Guía para empezar** 

1. [¿Qué hace?](#qué-hace)
2. [Guía rápida](#guía-rápida)
3. [¿Dónde configuro cada cosa?](#dónde-configuro-cada-cosa)
4. [Conceptos básicos](#conceptos-básicos-glosario)
5. [Modos de estilo (resumen)](#modos-de-estilo-resumen)
6. [Ejemplos de uso](#ejemplos-uso)

**Parte 2 — Referencia técnica**

7. [Importación y constructor](#importación-y-constructor)
8. [Parámetros del estilo](#parámetros-del-estilo-options)
9. [Modos detallados (filtros, rampa)](#modos-detallados)
10. [Métodos de la API](#métodos-de-la-api)
11. [Uso con la capa GeoTIFF](#uso-con-la-capa-geotiff)
12. [Configuraciones recomendadas](#configuraciones-recomendadas)
13. [Casos especiales (normalize, nodata COG…)](#casos-especiales)

**Parte 3 — Avanzado** *(solo desarrolladores)*

14. [Estilos a medida](#avanzado-estilos-a-medida)

---

# Parte 1 — Guía para empezar

## ¿Qué hace?

Imagina una **foto satélite** (o un mapa de alturas, temperaturas, etc.) cargada en el mapa. Por defecto se muestra tal cual viene del archivo.

`IDEE.style.Raster` permite **cambiar cómo se ve** esa imagen:

| Lo que quieres lograr | Cómo se llama en la API |
|----------------------|-------------------------|
| Colorear según el **valor numérico** de cada píxel (bajo = azul, alto = rojo) | **Rampa** (`ramp`, `min`, `max`) |
| Calcular un **índice** (NDVI, NDWI, NBR…) y colorearlo con rampa | **Fórmula** (`formula: 'ndvi'` / `'ndwi'` / `'nbr'`) + rampa |
| Ajustar la imagen como en un editor de fotos (más gris, más brillo…) | **Filtros** (`saturation`, `brightness`, etc.) |
| **Ocultar** zonas sin dato (bordes vacíos del archivo) | **Nodata** (`nodata`) |

El estilo siempre debe hacer **algo visible**. Si todas las opciones están en su valor por defecto, la capa ignora el estilo o lo quita.

---

## Guía rápida («Quiero… → uso…»)

### Poner la foto en escala de grises

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: -1 }));
```

### Mapa de colores por altura (MDT, una sola banda)

```javascript
layer.setStyle(new IDEE.style.Raster({
  bands: 1,
  min: 0,
  max: 2000,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
}));
```

### Índice de vegetación (NDVI)

Necesitas **dos bandas**: NIR y Rojo, en ese orden. El valor `(NIR − Rojo) / (NIR + Rojo)` se colorea con la rampa (rango típico −1…1).

```javascript
layer.setStyle(new IDEE.style.Raster({
  formula: 'ndvi',
  bands: [2, 1], // [nir, red] — índices según tu GeoTIFF
  min: -1,
  max: 1,
  ramp: ['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571'],
}));
```

> Con `normalize: true` en la capa, las bandas están en 0–1, pero el **resultado del índice** sigue en ≈[−1, 1]. No se fuerza el rango de la rampa a 0–1.

### Índice de agua (NDWI)

Necesitas **dos bandas**: Verde y NIR, en ese orden. El valor `(Verde − NIR) / (Verde + NIR)` resalta agua y humedad.

```javascript
layer.setStyle(new IDEE.style.Raster({
  formula: 'ndwi',
  bands: [3, 8], // [green, nir] — índices según tu GeoTIFF
  min: -1,
  max: 1,
  ramp: ['#8c510a', '#d8b365', '#f5f5f5', '#5ab4ac', '#01665e'],
}));
```

> Misma lógica que NDVI: la rampa colorea el índice; el rango típico es −1…1.

### Índice de quemas (NBR)

Necesitas **dos bandas**: NIR y SWIR, en ese orden. El valor `(NIR − SWIR) / (NIR + SWIR)` resalta áreas quemadas.

```javascript
layer.setStyle(new IDEE.style.Raster({
  formula: 'nbr',
  bands: [8, 12], // [nir, swir] — índices según tu GeoTIFF (p. ej. Sentinel-2)
  min: -1,
  max: 1,
  ramp: ['#1a9850', '#a6d96a', '#ffffbf', '#fdae61', '#d73027'],
}));
```

### Quitar los bordes azules/vacíos de un COG

Configura **en la capa y en el estilo**:

```javascript
// Al crear la capa GeoTIFF
{ nodata: 0, convertToRGB: false }

// En el estilo
layer.setStyle(new IDEE.style.Raster({ nodata: 0, bands: 1, ramp: [...] }));
```

### Volver a la imagen original

```javascript
layer.clearStyle();
// o
layer.setStyle(null);
```

---

## ¿Dónde configuro cada cosa?

| Qué configuras | Dónde | Ejemplos |
|----------------|-------|----------|
| **Archivo**, nombre, leyenda del árbol | Capa `GeoTIFF` (1.er argumento) | `url`, `name`, `legend` |
| **Cómo se leen** los datos del TIFF | Opciones de la **capa** (2.º argumento) | `bands`, `normalize`, `nodata`, `convertToRGB` |
| **Cómo se pinta** en pantalla | **Estilo** `Raster` + `layer.setStyle()` | `ramp`, `saturation`, `min`, `max` |

```javascript
const layer = new IDEE.layer.GeoTIFF(
  { url: '...', name: 'Mi capa' },     // ← datos de la capa
  { normalize: true, bands: [1,2,3] }, // ← opciones de lectura
);

const style = new IDEE.style.Raster({ saturation: -0.5 }); // ← aspecto visual
mapjs.addGeoTIFF(layer);
layer.setStyle(style);
```

---

## Conceptos básicos (glosario)

| Término | En lenguaje sencillo |
|---------|----------------------|
| **GeoTIFF / capa ráster** | Archivo de imagen geográfica en el mapa. |
| **Estilo Raster** | Reglas de **cómo se colorea o filtra** esa capa. |
| **Banda (`bands`)** | Con NDVI: `[nir, red]`. Con NDWI: `[green, nir]`. Con NBR: `[nir, swir]`. |
| **Fórmula (`formula`)** | Sin fórmula: banda o media. Con `'ndvi'`, `'ndwi'` o `'nbr'`: índice espectral. |
| **Rampa (`ramp`)** | Lista de colores ordenados: los valores **bajos** del dato → primer color; los **altos** → último color. |
| **`interpolation`** | Con rampa: **cómo** se reparten esos colores entre `min` y `max`. `linear` = uniforme; `exponential` = más color en un extremo (ver [Interpolación exponencial](#interpolación-exponencial)). |
| **`min` / `max`** | Qué valores numéricos del dato corresponden al primer y último color de la rampa. |
| **`nodata`** | Número que significa «aquí no hay dato». Esos píxeles se hacen **transparentes**. |
| **`normalize`** (en la capa) | Convierte los valores del archivo a un rango 0–1 (como un porcentaje). Si está activo, `min`/`max` del estilo suelen ser `0` y `1`. |
| **`convertToRGB`** (en la capa) | Si es `true`, la capa convierte el dato a color automáticamente. Para usar **rampa personalizada**, ponlo en `false`. |
| **Filtros** | Ajustes de imagen: saturación, brillo, contraste, exposición, gamma. |
| **Leyenda** | Barra de colores que explica la rampa. Solo se genera automáticamente cuando usas **rampa**. |

---

## Modos de estilo (resumen)

| Modo | Qué verás en el mapa | Opciones principales | ¿Leyenda automática? |
|------|----------------------|----------------------|----------------------|
| **Rampa** | Colores según el valor del dato | `ramp`, `min`, `max`, `bands`, `formula` | Sí (barra min–max) |
| **Solo filtros** | La foto original, pero más gris/brillante/etc. | `saturation`, `brightness`, … | No |
| **Nodata** | Huecos transparentes donde no hay dato | `nodata` (+ banda para detectarlo) | Depende del modo anterior |

**Reglas de prioridad** (solo puede haber una forma de colorear a la vez):

1. Si hay **rampa** → se usa la rampa.
2. Si solo hay **nodata** → se muestran los colores originales de la imagen, excepto donde hay nodata.
3. Los **filtros** se pueden combinar con cualquiera de los anteriores.

---

## Ejemplos de uso

- Con **rampa**, los colores cambian según el terreno/valor (no es un color plano).
- Con **`saturation: -1`**, la imagen se ve en escala de grises.
- Con **`nodata: 0`**, desaparecen los bordes vacíos del archivo.
- Con **`clearStyle()`**, la imagen vuelve a como estaba antes del estilo.
- Con **rampa**, la leyenda del visor muestra la barra de colores.
- Con **solo filtros**, la leyenda **no** cambia a barra de rampa.

---

# Parte 2 — Referencia técnica

## Importación y constructor

```javascript
const style = new IDEE.style.Raster(options, vendorOptions);
// o
const style = new IDEE.style.Raster(options);
```

| Argumento | Tipo | Descripción |
|-----------|------|-------------|
| `options` | `Object` | Opciones del estilo ráster |
| `vendorOptions` | `Object` | Opciones adicionales para la implementación (Opcional) |

El estilo exige **al menos un efecto activo**: rampa, nodata o algún filtro distinto de su valor por defecto.

---

## Parámetros del estilo (`options`)

### `bands`

| | |
|---|---|
| **Tipo** | `number` \| `Array<number>` |
| **Por defecto** | `1` (rampa/nodata); NDVI: `[2, 1]`; NDWI: `[2, 3]`; NBR: `[1, 3]` |
| **Descripción** | Banda o bandas usadas en la simbología. Solo tiene efecto con **rampa** o **nodata**. |

| Valor | Comportamiento (sin fórmula) |
|-------|----------------|
| `1` | Valor de esa banda |
| `[1, 2, 3]` | **Media aritmética** de las bandas (útil para brillo en RGB) |

Con **`formula: 'ndvi'`**:

| Valor | Comportamiento |
|-------|----------------|
| `[nir, red]` | Exactamente **2** bandas. Calcula `(nir − red) / (nir + red)` |
| Otro | Error `invalid_raster_ndvi_bands` |

Con **`formula: 'ndwi'`**:

| Valor | Comportamiento |
|-------|----------------|
| `[green, nir]` | Exactamente **2** bandas. Calcula `(green − nir) / (green + nir)` |
| Otro | Error `invalid_raster_ndwi_bands` |

Con **`formula: 'nbr'`**:

| Valor | Comportamiento |
|-------|----------------|
| `[nir, swir]` | Exactamente **2** bandas. Calcula `(nir − swir) / (nir + swir)` |
| Otro | Error `invalid_raster_nbr_bands` |

- `bands: [1]` ≡ `bands: 1` (sin fórmula)
- `bands: []` → error

---

### `formula`

| | |
|---|---|
| **Tipo** | `string` |
| **Por defecto** | *(sin fórmula)* |
| **Valores** | `'ndvi'`, `'ndwi'`, `'nbr'` |

Solo con **rampa**. Cambia **cómo se calcula el valor** que se colorea; la rampa (`ramp`, `min`, `max`, interpolación) se reutiliza.

| Fórmula | Expresión | `bands` | `min`/`max` por defecto |
|---------|-----------|---------|-------------------------|
| *(ninguna)* | Banda o media | número o array | `0` / `1` |
| `'ndvi'` | `(NIR − Rojo) / (NIR + Rojo)` | `[nir, red]` | `-1` / `1` |
| `'ndwi'` | `(Verde − NIR) / (Verde + NIR)` | `[green, nir]` | `-1` / `1` |
| `'nbr'` | `(NIR − SWIR) / (NIR + SWIR)` | `[nir, swir]` | `-1` / `1` |

- La **media** mezcla bandas por igual; los **índices** usan fórmulas con dos bandas concretas. La rampa es la misma mecánica; cambia el valor que se colorea.
- Con **índices** (`ndvi`, `ndwi`, `nbr`) y `normalize: true` en la capa, **no** se fuerza el rango de la rampa a 0–1 (el índice ya sale en ≈[−1, 1]).
- Si el denominador es 0, el valor se trata como `0`.
- Valor inválido → excepción `invalid_raster_formula`.

```javascript
new IDEE.style.Raster({
  formula: 'ndvi',
  bands: [8, 4], // índices de banda en tu archivo
  min: -1,
  max: 1,
  ramp: ['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571'],
});
```

---

### `min` / `max`

Solo con **rampa**. Definen qué valores del dato se mapean al primer y último color.

| | `min` | `max` |
|---|-------|-------|
| **Por defecto** | `0` | `1` |
| Píxeles ≤ `min` | Primer color de `ramp` | — |
| Píxeles ≥ `max` | — | Último color de `ramp` |

Con **`normalize: true`** en la capa (y **sin** fórmula de índice), los datos están en **0–1**: usa `min: 0`, `max: 1`. La implementación ajusta la interpolación automáticamente.

Con **`formula: 'ndvi'`**, **`'ndwi'`** o **`'nbr'`**, usa el rango del índice (por defecto `-1`…`1`), aunque la capa tenga `normalize: true`.

Con **`normalize: false`**, usa el rango real (p. ej. `0`–`2000` en un MDT).

---

### `ramp`

| | |
|---|---|
| **Tipo** | `Array<string>` \| `null` |
| **Descripción** | Colores en hex (`#RRGGBB`) o CSS válido para `chroma-js`. |

- Opcional.
- Mínimo **2 colores**; si pasas 1, se añade su color inverso.
- Colores repartidos uniformemente entre `min` y `max`.
- `setRamp(null)` elimina rampa y campos asociados.

```javascript
ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000']
```

---

### Filtros

Todos en rangos indicados. Valor por defecto sin efecto.

| Parámetro | Default | Rango | Efecto principal |
|-----------|---------|-------|------------------|
| `gamma` | `1` | `0` … ∞ | `< 1` aclara · `> 1` oscurece |
| `saturation` | `0` | `-1` … `1` | `-1` escala de grises |
| `exposure` | `0` | `-1` … `1` | Más / menos exposición |
| `contrast` | `0` | `-1` … `1` | Más / menos contraste |
| `brightness` | `0` | `-1` … `1` | Más / menos brillo |

Valores fuera de rango en filtros ±1 se recortan (lo ajusta al límite más cercano). `gamma` negativo lanza error.

---

### `nodata`

| | |
|---|---|
| **Tipo** | `number` |
| **Descripción** | Valor renderizado como **transparente**. |

Comparación sobre la **primera banda** del índice. Recomendable definir `nodata` también en la capa GeoTIFF.

---

### `interpolation` / `interpolationBase`

Solo con **rampa**. Controla **cómo se reparten los colores** entre `min` y `max` (no cambia qué colores usa la rampa, sino en qué valores del dato aparece cada uno).

| `interpolation` | Comportamiento |
|-----------------|----------------|
| `'linear'` | Reparto **uniforme** (por defecto): un valor a mitad de rango tiene un color intermedio claro |
| `'exponential'` | Reparto en **curva**: concentra más colores en un extremo (bajo o alto), según `interpolationBase` |

| `interpolationBase` | Efecto aproximado (con `exponential`) |
|---------------------|----------------------------------------|
| **`2`** (por defecto) | Los valores **bajos** se quedan más tiempo en los **primeros** colores de la rampa |
| **`> 1`** (p. ej. `2`) | Similar al default: predominan los colores del inicio de la rampa |
| **`< 1`** (p. ej. `0.05`) | Hace falta un valor **muy alto** para llegar a los últimos colores; predominan colores «fríos» |

Solo tiene efecto si `interpolation: 'exponential'`. Con `linear`, `interpolationBase` se ignora.

---

## Modos detallados

### Solo filtros (sin rampa)

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: 0.3 }));
```

- Setters de rampa/min/max no aplican.

### Valores por defecto (`Raster.DEFAULT_OPTIONS`)

Referencia; no se aplican solos sin rampa:

```javascript
{
  bands: 1, min: 0, max: 1,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
  gamma: 1, saturation: 0, exposure: 0, contrast: 0, brightness: 0,
  interpolation: 'linear', interpolationBase: 2,
}
```

---

## Métodos  Getters / setters (instancia)

Todos los setters reaplican el estilo si ya está en una capa (`update_()`).

| Método | Notas |
|--------|-------|
| `getBands()` / `setBands()` | Solo rampa o nodata; con índices exactamente 2 bandas |
| `getFormula()` / `setFormula()` | Solo rampa; `'ndvi'`, `'ndwi'`, `'nbr'` o vacío |
| `getMin()` / `setMin()` | Solo rampa |
| `getMax()` / `setMax()` | Solo rampa |
| `getRamp()` / `setRamp(null)` | Solo rampa |
| `getGamma()` … `getBrightness()` | Filtros |
| `getNodata()` / `setNodata()` | Transparencia |
| `getInterpolation()` / `setInterpolation()` | Solo rampa |

### Heredados de `IDEE.style`

`canvas`, `getOptions()`, `get()`, `set()`, `refresh()`, `clone()`, `equals()`, `toImage()`, `toJSON()`.

---

## Uso con la capa GeoTIFF

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '...', name: 'Mi capa' }, {
  convertToRGB: false,
  normalize: true,
});

const style = new IDEE.style.Raster({
  bands: [1, 2, 3], min: 0, max: 1,
  ramp: ['#000080', '#ff0000'],
});

mapjs.addGeoTIFF(layer);
layer.setStyle(style);
```

**`setStyle` acepta:** instancia `Raster`, objeto de opciones, `String` serializado o `null`.

| Acción | Efecto |
|--------|--------|
| `setStyle(null)` / `clearStyle()` | Quita estilo IDEE; restaura estilo anterior |
| `setStyle({})` / `new Raster({})` | Igual que clear |
| Misma instancia otra vez | Reaplica sin `unapply` (útil tras setters) |

### Leyenda: `layer.getLegendURL()`

Solo sustituye la leyenda por la barra de rampa si `Raster.hasRamp(style.getOptions(), true)`.

---

## Configuraciones recomendadas

### Rampa

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '...', name: 'TCI' }, {
  convertToRGB: false, normalize: true, bands: [1, 2, 3],
});
layer.setStyle(new IDEE.style.Raster({
  bands: [1, 2, 3], min: 0, max: 1,
  ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000'],
}));
```

### Monobanda

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '.../mdt.tif' }, {
  convertToRGB: false, normalize: false, bands: [1], nodata: -9999,
});
layer.setStyle(new IDEE.style.Raster({
  bands: 1, min: 0, max: 2000, nodata: -9999,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
}));
```

### Solo filtros

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: -0.8 }));
```
<>

---

# Parte 3 — Avanzado

**No necesitas esta sección** para rampas, NDVI, NDWI, NBR, filtros o nodata.  
Úsala solo si necesitas expresiones WebGL libres (paletas científicas custom, `case` complejos, etc.).

## Avanzado: estilos a medida

`IDEE.style.Raster` **no** expone expresiones WebGL libres (`interpolate` custom, `palette`, `case` complejos, variables `['var', 'x']`, etc.).  
NDVI, NDWI y NBR ya están cubiertos con `formula: 'ndvi'`, `'ndwi'` y `'nbr'`.

**Al crear la capa** (3.er argumento `vendorOptions`, sin pasar por `setStyle`):

```javascript
new IDEE.layer.GeoTIFF({ url: '...', name: 'Capa' }, {
  normalize: true,
}, {
  style: {
    color: ['interpolate', ['linear'], ['band', 1], 0, [0, 0, 255], 1, [255, 0, 0]],
    saturation: -0.8,
  },
});
```