# IDEE.style.Raster

Estilo visual para **capas de imagen geográfica** (GeoTIFF y similares) en el visor IDEE.

---

## Índice

**Parte 1 — Guía para empezar** *(léela primero si no conoces estos temas)*

1. [¿Qué hace esto?](#qué-hace-esto)
2. [Recetas rápidas](#recetas-rápidas-quiero--uso)
3. [¿Dónde configuro cada cosa?](#dónde-configuro-cada-cosa)
4. [Conceptos básicos](#conceptos-básicos-glosario)
5. [Modos de estilo (resumen)](#modos-de-estilo-resumen)
6. [Checklist visual de validación](#checklist-visual-de-validación)

**Parte 2 — Referencia técnica**

7. [Importación y constructor](#importación-y-constructor)
8. [Parámetros del estilo](#parámetros-del-estilo-options)
9. [Modos detallados (filtros, color, rampa)](#modos-detallados)
10. [Métodos de la API](#métodos-de-la-api)
11. [Uso con la capa GeoTIFF](#uso-con-la-capa-geotiff)
12. [Configuraciones recomendadas](#configuraciones-recomendadas)
13. [Casos especiales (normalize, nodata COG…)](#casos-especiales)

**Parte 3 — Avanzado** *(solo desarrolladores)*

14. [Estilos OpenLayers a medida](#avanzado-estilos-openlayers-a-medida)
15. [Checklist técnico de validación](#checklist-técnico-de-validación)

---

# Parte 1 — Guía para empezar

## ¿Qué hace esto?

Imagina una **foto satélite** (o un mapa de alturas, temperaturas, etc.) cargada en el mapa. Por defecto se muestra tal cual viene del archivo.

`IDEE.style.Raster` permite **cambiar cómo se ve** esa imagen:

| Lo que quieres lograr | Cómo se llama en la API |
|----------------------|-------------------------|
| Colorear según el **valor numérico** de cada píxel (bajo = azul, alto = rojo) | **Rampa** (`ramp`, `min`, `max`) |
| **Teñir** toda la imagen de un color (p. ej. azul) | **Color fijo** (`color`) |
| Ajustar la imagen como en un editor de fotos (más gris, más brillo…) | **Filtros** (`saturation`, `brightness`, etc.) |
| **Ocultar** zonas sin dato (bordes vacíos del archivo) | **Nodata** (`nodata`) |

El estilo siempre debe hacer **algo visible**. Si todas las opciones están en su valor por defecto, la capa ignora el estilo o lo quita.

**Prueba interactiva:** abre `test/development/style-raster.html` en el entorno de desarrollo.

---

## Recetas rápidas («Quiero… → uso…»)

### Poner la foto en escala de grises

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: -1 }));
```

### Teñir toda la capa de azul

```javascript
layer.setStyle(new IDEE.style.Raster({ color: 'blue' }));
```

> **Importante:** `color: 'blue'` pinta **toda** la capa de azul. **No** es lo mismo que una rampa azul→rojo según el valor del terreno.

### Mapa de colores por altura (MDT, una sola banda)

```javascript
layer.setStyle(new IDEE.style.Raster({
  bands: 1,
  min: 0,
  max: 2000,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
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

Hay **dos sitios**. Mezclarlos es el error más habitual.

| Qué configuras | Dónde | Ejemplos |
|----------------|-------|----------|
| **Archivo**, nombre, leyenda del árbol | Capa `GeoTIFF` (1.er argumento) | `url`, `name`, `legend` |
| **Cómo se leen** los datos del TIFF | Opciones de la **capa** (2.º argumento) | `bands`, `normalize`, `nodata`, `convertToRGB` |
| **Cómo se pinta** en pantalla | **Estilo** `Raster` + `layer.setStyle()` | `ramp`, `color`, `saturation`, `min`, `max` |

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
| **GeoTIFF / capa ráster** | Archivo de imagen geográfica en el mapa (satélite, MDT, etc.) |
| **Estilo Raster** | Reglas de **cómo se colorea o filtra** esa capa |
| **Banda (`bands`)** | «Canal» del archivo. En una foto RGB hay banda 1 (rojo), 2 (verde), 3 (azul). Un MDT suele tener solo banda 1 (altura). |
| **Rampa (`ramp`)** | Lista de colores ordenados: los valores **bajos** del dato → primer color; los **altos** → último color (como un termómetro de colores). |
| **`min` / `max`** | Qué valores numéricos del dato corresponden al primer y último color de la rampa. |
| **`nodata`** | Número que significa «aquí no hay dato». Esos píxeles se hacen **transparentes**. |
| **`normalize`** (en la capa) | Convierte los valores del archivo a un rango 0–1 (como un porcentaje). Si está activo, `min`/`max` del estilo suelen ser `0` y `1`. |
| **`convertToRGB`** (en la capa) | Si es `true`, la capa convierte el dato a color automáticamente. Para usar **rampa personalizada**, ponlo en `false`. |
| **Filtros** | Ajustes de imagen: saturación (color ↔ gris), brillo, contraste, exposición, gamma. |
| **Leyenda** | Barra de colores que explica la rampa. Solo se genera automáticamente cuando usas **rampa**. |

---

## Modos de estilo (resumen)

| Modo | Qué verás en el mapa | Opciones principales | ¿Leyenda automática? |
|------|----------------------|----------------------|----------------------|
| **Rampa** | Colores según el valor del dato | `ramp`, `min`, `max`, `bands` | Sí (barra min–max) |
| **Color fijo** | Toda la capa teñida de un color | `color` | No |
| **Solo filtros** | La foto original, pero más gris/brillante/etc. | `saturation`, `brightness`, … | No |
| **Nodata** | Huecos transparentes donde no hay dato | `nodata` (+ banda para detectarlo) | Depende del modo anterior |

**Reglas de prioridad** (solo puede haber una forma de colorear a la vez):

1. Si hay **rampa** → se usa la rampa (se ignora `color`).
2. Si no hay rampa pero hay **`color`** → color fijo.
3. Si solo hay **nodata** → se muestran los colores originales de la imagen, excepto donde hay nodata.
4. Los **filtros** se pueden combinar con cualquiera de los anteriores.

---

## Checklist visual de validación

Marca lo que **ves** en el mapa (no hace falta leer código):

- [ ] Con **rampa**, los colores cambian según el terreno/valor (no es un color plano).
- [ ] Con **`color: 'blue'`**, toda la capa se tiñe de azul (no es una rampa).
- [ ] Con **`saturation: -1`**, la imagen se ve en escala de grises.
- [ ] Con **`nodata: 0`**, desaparecen los bordes vacíos del archivo.
- [ ] Con **`clearStyle()`**, la imagen vuelve a como estaba antes del estilo.
- [ ] Con **rampa**, la leyenda del visor muestra la barra de colores.
- [ ] Con **solo filtros** o **color fijo**, la leyenda **no** cambia a barra de rampa.

**Tests de desarrollo:** `test/development/style-raster.html` · `test/development/geotiff-only.html`

---

# Parte 2 — Referencia técnica

## Importación y constructor

```javascript
import Raster from 'IDEE/style/Raster';

const style = new IDEE.style.Raster(options, vendorOptions);
// o
const style = new IDEE.style.Raster(options);
```

| Argumento | Tipo | Descripción |
|-----------|------|-------------|
| `options` | `Object` | Opciones del estilo ráster |
| `vendorOptions` | `Object` | Opciones adicionales para la implementación OpenLayers (opcional) |

El estilo exige **al menos un efecto activo**: rampa, color, nodata o algún filtro distinto de su valor por defecto.

---

## Parámetros del estilo (`options`)

### `bands`

| | |
|---|---|
| **Tipo** | `number` \| `Array<number>` |
| **Por defecto** | `1` (solo si hay rampa o nodata) |
| **Descripción** | Banda o bandas usadas en la simbología. Solo con **rampa** o **nodata**. |

| Valor | Comportamiento |
|-------|----------------|
| `1` | Valor de esa banda |
| `[1, 2, 3]` | **Media aritmética** de las bandas (útil para brillo en RGB) |

- `bands: [1]` ≡ `bands: 1`
- `bands: []` → error

---

### `min` / `max`

Solo con **rampa**. Definen qué valores del dato se mapean al primer y último color.

| | `min` | `max` |
|---|-------|-------|
| **Por defecto** | `0` | `1` |
| Píxeles ≤ `min` | Primer color de `ramp` | — |
| Píxeles ≥ `max` | — | Último color de `ramp` |

Con **`normalize: true`** en la capa, los datos están en **0–1**: usa `min: 0`, `max: 1`. La implementación ajusta la interpolación automáticamente.

Con **`normalize: false`**, usa el rango real (p. ej. `0`–`2000` en un MDT).

---

### `ramp`

| | |
|---|---|
| **Tipo** | `Array<string>` \| `null` |
| **Descripción** | Colores en hex (`#RRGGBB`) o CSS válido para `chroma-js`. |

- Opcional. **Excluyente con `color`** (al definir rampa se borra `color`).
- Mínimo **2 colores**; si pasas 1, se añade su color inverso.
- Colores repartidos uniformemente entre `min` y `max`.
- `setRamp(null)` elimina rampa y campos asociados.

```javascript
ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000']
```

---

### `color`

| | |
|---|---|
| **Tipo** | `string` \| `Array<number>` |
| **Descripción** | Color literal para toda la capa (OpenLayers WebGL). |

| Formato | Ejemplo |
|---------|---------|
| Nombre CSS | `'blue'`, `'red'` |
| Hexadecimal | `'#3388ff'` |
| RGB | `[51, 136, 255]` |
| RGBA | `[51, 136, 255, 0.8]` |

- No aplica si hay **rampa** activa.
- Combinable con **filtros** y **nodata**.
- **No** colorea por valor de banda (para eso usa `ramp`).

```javascript
new IDEE.style.Raster({ color: 'blue' });
new IDEE.style.Raster({ color: '#3388ff', saturation: -0.5 });
```

Valores inválidos → excepción `invalid_raster_color`.

---

### Filtros WebGL

Todos en rangos indicados. Valor por defecto = sin efecto.

| Parámetro | Default | Rango | Efecto principal |
|-----------|---------|-------|------------------|
| `gamma` | `1` | `0` … ∞ | `< 1` aclara · `> 1` oscurece |
| `saturation` | `0` | `-1` … `1` | `-1` escala de grises |
| `exposure` | `0` | `-1` … `1` | Más / menos exposición |
| `contrast` | `0` | `-1` … `1` | Más / menos contraste |
| `brightness` | `0` | `-1` … `1` | Más / menos brillo |

Valores fuera de rango en filtores ±1 se recortan. `gamma` negativo lanza error.

---

### `nodata`

| | |
|---|---|
| **Tipo** | `number` |
| **Descripción** | Valor renderizado como **transparente**. |

Comparación sobre la **primera banda** del índice. Recomendable definir `nodata` también en la capa GeoTIFF.

---

### `interpolation` / `interpolationBase`

Solo con **rampa**.

| `interpolation` | Comportamiento |
|-----------------|----------------|
| `'linear'` | Reparto uniforme (por defecto) |
| `'exponential'` | Curva; usa `interpolationBase` (default `2`) |

---

## Modos detallados

### Solo filtros (sin rampa ni color)

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: 0.3 }));
```

- `getLegendURL()` mantiene la leyenda de la capa.
- Setters de rampa/color/min/max no aplican.

### Color personalizado

```javascript
layer.setStyle(new IDEE.style.Raster({ color: '#3388ff' }));
```

- `Raster.hasColor(options)` → `true`
- No usa `bands` salvo con `nodata`.

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

## Métodos de la API

### Estáticos

| Método | Descripción |
|--------|-------------|
| `Raster.optionsHaveEffect(options)` | Hay rampa, color, nodata o filtros activos |
| `Raster.hasRamp(options)` | Hay rampa válida (≥ 2 colores) |
| `Raster.hasColor(options)` | Hay `color` personalizado |
| `Raster.deserialize(parameters)` | Restaura desde JSON |

### Getters / setters (instancia)

Todos los setters reaplican el estilo si ya está en una capa (`update_()`).

| Método | Notas |
|--------|-------|
| `getBands()` / `setBands()` | Solo rampa o nodata |
| `getMin()` / `setMin()` | Solo rampa |
| `getMax()` / `setMax()` | Solo rampa |
| `getRamp()` / `setRamp(null)` | Al añadir rampa borra `color` |
| `getColor()` / `setColor()` | No aplica con rampa |
| `getGamma()` … `getBrightness()` | Filtros |
| `getNodata()` / `setNodata()` | Transparencia |
| `getInterpolation()` / `setInterpolation()` | Solo rampa |

Setter sin efecto activo restante → `invalid_raster_options`.

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
| `setStyle(null)` / `clearStyle()` | Quita estilo IDEE; restaura estilo OL anterior |
| `setStyle({})` / `new Raster({})` | Igual que clear (sin efecto activo) |
| Misma instancia otra vez | Reaplica sin `unapply` (útil tras setters) |

**Capas compatibles:** `GeoTIFF`, `GenericRaster` (con `WebGLTile`).

### Leyenda: `layer.getLegendURL()`

Solo sustituye la leyenda por la barra de rampa si `Raster.hasRamp(style.getOptions(), true)`.

### Canvas / serialización

```javascript
rasterStyle.updateCanvas();  // solo con rampa
const json = rasterStyle.toJSON();
const restored = IDEE.style.Raster.deserialize(json.parameters);
```

---

## Configuraciones recomendadas

### Sentinel TCI (RGB) con rampa

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '...', name: 'TCI' }, {
  convertToRGB: false, normalize: true, bands: [1, 2, 3],
});
layer.setStyle(new IDEE.style.Raster({
  bands: [1, 2, 3], min: 0, max: 1,
  ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000'],
}));
```

### MDT monobanda

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '.../mdt.tif' }, {
  convertToRGB: false, normalize: false, bands: [1], nodata: -9999,
});
layer.setStyle(new IDEE.style.Raster({
  bands: 1, min: 0, max: 2000, nodata: -9999,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
}));
```

### Solo filtros en TCI

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: -0.8 }));
```

---

## Casos especiales

### `min` / `max` y `normalize`

| `normalize` en capa | Rango de píxeles | `min` / `max` |
|---------------------|------------------|---------------|
| `true` | 0 – 1 | `0` y `1` |
| `false` | Valores crudos | Según dato (0–255, 0–2000…) |

Error típico: `normalize: true` con `max: 255` → casi todo el mapa en el primer color.

### Interpolación exponencial

```javascript
new IDEE.style.Raster({
  min: 0, max: 1, ramp: contrastRamp,
  interpolation: 'exponential', interpolationBase: 0.05,
});
```

### COG con bounding box mayor que la escena

Zonas vacías suelen valer `0`. Con rampa se pintan del primer color. Solución: `nodata: 0` en capa **y** estilo.

### Flujo completo

```javascript
const mapjs = IDEE.map({ container: 'map' });
const layer = new IDEE.layer.GeoTIFF({ url: '...', name: 'Mi ráster' }, {
  convertToRGB: false, normalize: true, bands: [1, 2, 3],
});
const style = new IDEE.style.Raster({
  bands: [1, 2, 3], min: 0.05, max: 0.85,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
  nodata: 0,
});
mapjs.addGeoTIFF(layer);
layer.setStyle(style);
style.setMin(0.1);
layer.setStyle(style);
```

---

# Parte 3 — Avanzado

> **No necesitas esta sección** para rampas, color fijo, filtros o nodata.  
> Úsala solo si necesitas fórmulas a medida (NDVI, paletas científicas, etc.).

## Avanzado: estilos OpenLayers a medida

`IDEE.style.Raster` **no** expone expresiones WebGL libres (`interpolate` custom, `palette`, `case` complejos, variables `['var', 'x']`, etc.).

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

**En runtime:**

```javascript
layer.getImpl().getLayer().setStyle({
  color: ['array', ['band', 1], ['band', 2], ['band', 3], 1],
});
```

Si después aplicas `IDEE.style.Raster`, se guarda el estilo OL previo y se restaura con `clearStyle()`.

Documentación OpenLayers: [cog-style](https://openlayers.org/en/latest/examples/cog-style.html) · [ExpressionValue](https://openlayers.org/en/latest/apidoc/module-ol_style_expressions.html#~ExpressionValue)

---

## Checklist técnico de validación

- [ ] Rampa + `normalize: true` → `min`/`max` en 0–1
- [ ] `convertToRGB: false` con rampa o simbología por bandas
- [ ] `color: 'blue'` ≠ rampa monobanda (color plano vs gradiente por valor)
- [ ] `Raster.optionsHaveEffect` / `hasRamp` / `hasColor` coherentes con UI
- [ ] `setStyle({})` restaura estilo OL anterior (`vendorOptions` o `{}`)
- [ ] Reaplicar misma instancia no rompe WebGL (`style_ === style`)
- [ ] `getLegendURL()` solo con rampa
- [ ] `invalid_raster_color` con color mal formado
- [ ] `invalid_raster_options` al quitar último efecto activo
- [ ] Tests: `style-raster.html`, `geotiff-only.html`
