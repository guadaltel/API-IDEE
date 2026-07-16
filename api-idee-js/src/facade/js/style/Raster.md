# IDEE.style.Raster

Permite **cambiar cómo se ve una capa de imagen en el mapa** (GeoTIFF) dentro del visor IDEE: colores según el valor del dato, tintes, filtros de imagen o zonas transparentes.

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
9. [Modos detallados (filtros, color, rampa)](#modos-detallados)
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
| Calcular un **índice** (p. ej. vegetación NDVI) y colorearlo con rampa | **Fórmula** (`formula: 'ndvi'`) + rampa |
| **Teñir** toda la imagen de un color (p. ej. azul) | **Color fijo** (`color`) |
| Ajustar la imagen como en un editor de fotos (más gris, más brillo…) | **Filtros** (`saturation`, `brightness`, etc.) |
| **Ocultar** zonas sin dato (bordes vacíos del archivo) | **Nodata** (`nodata`) |

El estilo siempre debe hacer **algo visible**. Si todas las opciones están en su valor por defecto, la capa ignora el estilo o lo quita.

---

## Guía rápida («Quiero… → uso…»)

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

> Con `normalize: true` en la capa, las bandas están en 0–1, pero el **resultado NDVI** sigue en ≈[−1, 1]. No se fuerza el rango de la rampa a 0–1.

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
| **GeoTIFF / capa ráster** | Archivo de imagen geográfica en el mapa. |
| **Estilo Raster** | Reglas de **cómo se colorea o filtra** esa capa. |
| **Banda (`bands`)** | Cada píxel del archivo guarda **uno o más números**. Cada número es una banda. Cuando usas una rampa, `bands` le dice al estilo **qué número mirar** para elegir el color. Con NDVI: exactamente `[nir, red]`. |
| **Fórmula (`formula`)** | Cómo se calcula el valor que alimenta la rampa. Sin fórmula: valor de banda o media. Con `'ndvi'`: índice de vegetación. |
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
| **Color fijo** | Toda la capa teñida de un color | `color` | No |
| **Solo filtros** | La foto original, pero más gris/brillante/etc. | `saturation`, `brightness`, … | No |
| **Nodata** | Huecos transparentes donde no hay dato | `nodata` (+ banda para detectarlo) | Depende del modo anterior |

**Reglas de prioridad** (solo puede haber una forma de colorear a la vez):

1. Si hay **rampa** → se usa la rampa (se ignora `color`).
2. Si no hay rampa pero hay **`color`** → color fijo.
3. Si solo hay **nodata** → se muestran los colores originales de la imagen, excepto donde hay nodata.
4. Los **filtros** se pueden combinar con cualquiera de los anteriores.

---

## Ejemplos de uso

- Con **rampa**, los colores cambian según el terreno/valor (no es un color plano).
- Con **`color: 'blue'`**, toda la capa se tiñe de azul (no es una rampa).
- Con **`saturation: -1`**, la imagen se ve en escala de grises.
- Con **`nodata: 0`**, desaparecen los bordes vacíos del archivo.
- Con **`clearStyle()`**, la imagen vuelve a como estaba antes del estilo.
- Con **rampa**, la leyenda del visor muestra la barra de colores.
- Con **solo filtros** o **color fijo**, la leyenda **no** cambia a barra de rampa.

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

El estilo exige **al menos un efecto activo**: rampa, color, nodata o algún filtro distinto de su valor por defecto.

---

## Parámetros del estilo (`options`)

### `bands`

| | |
|---|---|
| **Tipo** | `number` \| `Array<number>` |
| **Por defecto** | `1` (rampa/nodata); con NDVI: `[2, 1]` |
| **Descripción** | Banda o bandas usadas en la simbología. Solo tiene efecto con **rampa** o **nodata**. |

| Valor | Comportamiento (sin fórmula) |
|-------|----------------|
| `1` | Valor de esa banda |
| `[1, 2, 3]` | **Media aritmética** de las bandas (útil para brillo en RGB) |

Con **`formula: 'ndvi'`**:

| Valor | Comportamiento |
|-------|----------------|
| `[nir, red]` | Exactamente **2** bandas: NIR y Rojo. Calcula `(nir − red) / (nir + red)` |
| Otro | Error `invalid_raster_ndvi_bands` |

- `bands: [1]` ≡ `bands: 1` (sin fórmula)
- `bands: []` → error

---

### `formula`

| | |
|---|---|
| **Tipo** | `string` |
| **Por defecto** | *(sin fórmula)* |
| **Valores** | `'ndvi'` |

Solo con **rampa**. Cambia **cómo se calcula el valor** que se colorea; la rampa (`ramp`, `min`, `max`, interpolación) se reutiliza.

| Fórmula | Expresión | `bands` | `min`/`max` por defecto |
|---------|-----------|---------|-------------------------|
| *(ninguna)* | Banda o media | número o array | `0` / `1` |
| `'ndvi'` | `(NIR − Rojo) / (NIR + Rojo)` | `[nir, red]` | `-1` / `1` |

- La media mezcla bandas por igual; el NDVI las combina con una fórmula física para resaltar vegetación. La rampa de colores es la misma; cambia solo qué valor se colorea.
- Excluyente con **`color`** (al haber rampa se ignora `color`).
- Con NDVI y `normalize: true` en la capa, **no** se fuerza el rango de la rampa a 0–1 (el índice ya sale en ≈[−1, 1]).
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

Con **`normalize: true`** en la capa (y **sin** fórmula NDVI), los datos están en **0–1**: usa `min: 0`, `max: 1`. La implementación ajusta la interpolación automáticamente.

Con **`formula: 'ndvi'`**, usa el rango del índice (por defecto `-1`…`1`), aunque la capa tenga `normalize: true`.

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
| **Descripción** | Color literal para toda la capa. |

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

### Solo filtros (sin rampa ni color)

```javascript
layer.setStyle(new IDEE.style.Raster({ saturation: 0.3 }));
```

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

## Métodos  Getters / setters (instancia)

Todos los setters reaplican el estilo si ya está en una capa (`update_()`).

| Método | Notas |
|--------|-------|
| `getBands()` / `setBands()` | Solo rampa o nodata; con NDVI exactamente `[nir, red]` |
| `getFormula()` / `setFormula()` | Solo rampa; `'ndvi'` o vacío |
| `getMin()` / `setMin()` | Solo rampa |
| `getMax()` / `setMax()` | Solo rampa |
| `getRamp()` / `setRamp(null)` | Al añadir rampa borra `color` |
| `getColor()` / `setColor()` | No aplica con rampa |
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

**No necesitas esta sección** para rampas, NDVI, color fijo, filtros o nodata.  
Úsala solo si necesitas expresiones WebGL libres (paletas científicas custom, `case` complejos, etc.).

## Avanzado: estilos a medida

`IDEE.style.Raster` **no** expone expresiones WebGL libres (`interpolate` custom, `palette`, `case` complejos, variables `['var', 'x']`, etc.).  
El NDVI ya está cubierto con `formula: 'ndvi'`.

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