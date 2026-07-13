# IDEE.style.Raster

Clase de estilo para capas ráster que permite aplicar **simbología con rampas de colores** sobre datos GeoTIFF y otras capas raster compatibles con `ol/layer/WebGLTile` (OpenLayers).

---


## Importación

```javascript
import Raster from 'IDEE/style/Raster';

// o con el namespace global
const style = new IDEE.style.Raster({ ... });
```

---

## Constructor

```javascript
new IDEE.style.Raster(options, vendorOptions)
```

| Argumento | Tipo | Descripción |
|-----------|------|-------------|
| `options` | `Object` | Opciones del estilo ráster |
| `vendorOptions` | `Object` | Opciones adicionales pasadas a la implementación OpenLayers (opcional) |

---

## Parámetros (`options`)

### `bands`

| | |
|---|---|
| **Tipo** | `number` \| `Array<number>` |
| **Por defecto** | `1` |
| **Descripción** | Banda o bandas que intervienen en la simbología. |

| Valor | Comportamiento |
|-------|----------------|
| `1` (número) | Usa el valor de esa banda |
| `[1, 2, 3]` (array) | Calcula la **media aritmética** de las bandas listadas |

**Cuándo usar un array:** imágenes multibanda RGB (p. ej. Sentinel TCI) donde interesa simbolizar por brillo.

**Cuándo usar un número:** rásteres de una sola banda (MDT, NDVI, temperatura, etc.).

Reglas:
- `bands: [1]` es equivalente a `bands: 1`.
- `bands: []` lanza error.

---

### `min`

| | |
|---|---|
| **Tipo** | `number` |
| **Por defecto** | `0` |
| **Descripción** | Valor mínimo del rango de datos que se mapea al **primer color** de la rampa. |

Los píxeles con valor **≤ min** reciben el primer color de `ramp`.

> **Importante con `normalize: true` en la capa:** OpenLayers entrega valores en el rango **0–1**. En ese caso, `min` y `max` deben estar en ese rango (p. ej. `0` y `1`). La implementación ajusta automáticamente la interpolación a `[0, 1]` cuando detecta que la capa está normalizada.

---

### `max`

| | |
|---|---|
| **Tipo** | `number` |
| **Por defecto** | `1` |
| **Descripción** | Valor máximo del rango que se mapea al **último color** de la rampa. |

Los píxeles con valor **≥ max** reciben el último color de `ramp`.

Con `normalize: false`, usa el rango real del dato (p. ej. `0`–`255` para GeoTIFF 8 bits, `0`–`2000` para un MDT).

---

### `ramp`

| | |
|---|---|
| **Tipo** | `Array<string>` |
| **Por defecto** | `['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000']` |
| **Descripción** | Rampa de colores. Cada entrada es un color en hexadecimal (`#RRGGBB`) o formato CSS válido para `chroma-js`. |

Reglas:
- Debe tener **al menos 2 colores**. Si solo se pasa uno, se añade automáticamente su color inverso.
- Los colores se distribuyen **uniformemente** entre `min` y `max`.
- Cuantos más colores, más suave será la transición.

Ejemplo:

```javascript
ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000']
```

---

### `gamma`

| | |
|---|---|
| **Tipo** | `number` |
| **Por defecto** | `1` |
| **Rango** | `0` a infinito (OpenLayers WebGL) |
| **Descripción** | Corrección gamma aplicada en el estilo WebGL. |

| Valor | Efecto |
|-------|--------|
| `1` | Sin corrección (por defecto) |
| `0` a `< 1` | Aclara la imagen |
| `> 1` | Oscurece la imagen |

Valores negativos lanzan error. Si el valor no es numérico, se usa `1`.

---

### `nodata`

| | |
|---|---|
| **Tipo** | `number` |
| **Por defecto** | `undefined` |
| **Descripción** | Valor que se renderiza como **transparente** (alpha 0). |


La comparación se hace sobre la **primera banda** del índice (p. ej. banda 1 si `bands: [1, 2, 3]`). Para enmascarar bien el brillo medio, conviene combinar con `nodata: 0` también en la capa GeoTIFF.

---

### `interpolation`

| | |
|---|---|
| **Tipo** | `string` |
| **Por defecto** | `'linear'` |
| **Valores** | `'linear'`, `'exponential'` |
| **Descripción** | Tipo de interpolación entre los colores de la rampa. |

| Valor | Comportamiento |
|-------|----------------|
| `'linear'` | Reparto uniforme de colores a lo largo del rango |
| `'exponential'` | Curva exponencial; concentra más colores en un extremo del rango |

---

### `interpolationBase`

| | |
|---|---|
| **Tipo** | `number` |
| **Por defecto** | `2` |
| **Descripción** | Base de la interpolación exponencial. Solo aplica si `interpolation: 'exponential'`. |

| Base | Efecto aproximado |
|------|-------------------|
| `> 1` (p. ej. `2`) | Los valores bajos permanecen más tiempo en los primeros colores |
| `< 1` (p. ej. `0.05`) | Los valores altos tardan más en alcanzar los últimos colores; predominan colores fríos |

---

## Valores por defecto

Definidos en `IDEE.style.Raster.DEFAULT_OPTIONS`:

```javascript
{
  bands: 1,
  min: 0,
  max: 1,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
  gamma: 1,
  interpolation: 'linear',
  interpolationBase: 2,
}
```

---

## Métodos propios

### Getters / setters

Todos los setters llaman internamente a `update_()` para reaplicar el estilo si ya está asociado a una capa.

| Método | Descripción |
|--------|-------------|
| `getBands()` / `setBands(bands)` | Banda o bandas (`number` \| `Array<number>`) |
| `getMin()` / `setMin(min)` | Valor mínimo de la rampa |
| `getMax()` / `setMax(max)` | Valor máximo de la rampa |
| `getRamp()` / `setRamp(ramp)` | Rampa de colores |
| `getGamma()` / `setGamma(gamma)` | Corrección gamma |
| `getNodata()` / `setNodata(nodata)` | Valor transparente |
| `getInterpolation()` / `setInterpolation(interpolation, interpolationBase?)` | Tipo y base de interpolación |
| `getInterpolationBase()` / `setInterpolationBase(base)` | Base exponencial |

---

---

### Aplicar el estilo desde la capa

`IDEE.layer.GeoTIFF` expone `setStyle`, `getStyle` y `clearStyle`:

```javascript
const layer = new IDEE.layer.GeoTIFF({ url: '...', name: 'Mi capa' }, {
  convertToRGB: false,
  normalize: true,
});

const style = new IDEE.style.Raster({
  bands: [1, 2, 3],
  min: 0,
  max: 1,
  ramp: ['#000080', '#ff0000'],
});

mapjs.addGeoTIFF(layer);
layer.setStyle(style);   // llama internamente a applyStyle_ → style.apply(layer)
```

- `setStyle(null)` o `clearStyle()` elimina el estilo y restaura el anterior.
- También puedes pasar un objeto de opciones (`setStyle({ bands: 1, ... })`) o un estilo serializado (`String`).


**Capas compatibles:**
- `IDEE.layer.GeoTIFF`
- `IDEE.layer.GenericRaster` (si la capa OL subyacente es `WebGLTile` y expone `setStyle`)

---



### Leyenda en el visor: `layer.getLegendURL()`

Tras `layer.setStyle(rasterStyle)`, la capa `GeoTIFF` devuelve la imagen de la rampa mediante `getLegendURL()` (mismo patrón que `Vector` con estilos vectoriales):

```javascript
layerGeoTIFF.setStyle(rasterStyle);

const legendImg = document.getElementById('legend-img');
const legendUrl = layerGeoTIFF.getLegendURL();
if (legendUrl instanceof Promise) {
  legendUrl.then((url) => {
    legendImg.src = url;
  });
} else {
  legendImg.src = legendUrl;
}
```

Solo sustituye la URL por defecto de la capa cuando no se ha definido una leyenda personalizada (`setLegendURL`).

---

### `updateCanvas()` / `drawGeometryToCanvas()`

Actualizan el elemento `canvas` del estilo con una representación gráfica de la rampa (barra de colores + etiquetas `min` y `max`).

Útil si necesitas acceder al canvas del estilo directamente (p. ej. composiciones personalizadas):

```javascript
rasterStyle.updateCanvas();
const dataUrl = rasterStyle.toImage();
```

---

### `toJSON()` / `Raster.deserialize()`

Serialización para persistencia (p. ej. visores compartidos, plugins):

```javascript
const json = rasterStyle.toJSON();
// { parameters: [...], deserializedMethod: 'IDEE.style.Raster.deserialize' }

const restored = IDEE.style.Raster.deserialize(json.parameters);
```

---

## Métodos heredados de `IDEE.style`

| Método / propiedad | Descripción |
|--------------------|-------------|
| `canvas` | `HTMLCanvasElement` con la leyenda de la rampa |
| `getOptions()` | Devuelve el objeto de opciones |
| `get(attribute)` | Lee una opción por nombre (p. ej. `get('bands')`) |
| `set(property, value)` | Establece una opción y refresca |
| `refresh(layer?)` | Reaplica el estilo |
| `clone()` | Clona el estilo |
| `equals(style)` | Compara instancias |
| `toImage()` | Devuelve la leyenda como imagen base64 |

---

## Configuración recomendada de la capa GeoTIFF

El estilo ráster interactúa con las opciones de la capa. Configuración típica:

### Ráster multibanda RGB (Sentinel TCI)

```javascript
const layer = new IDEE.layer.GeoTIFF({
  url: 'https://.../TCI.tif',
  name: 'Sentinel TCI',
  legend: 'Sentinel-2 TCI',
}, {
  convertToRGB: false,   // imprescindible para aplicar rampa personalizada
  normalize: true,       // valores 0–1
  bands: [1, 2, 3],      // cargar las 3 bandas
});

const style = new IDEE.style.Raster({
  bands: [1, 2, 3],
  min: 0,
  max: 1,
  ramp: ['#000080', '#0080ff', '#00ff80', '#ffff00', '#ff0000'],
  interpolation: 'linear',
});
```

### Ráster monobanda (MDT, índice, etc.)

```javascript
const layer = new IDEE.layer.GeoTIFF({
  url: 'https://.../mdt.tif',
  name: 'MDT',
  legend: 'Elevación',
}, {
  convertToRGB: false,
  normalize: false,
  bands: [1],
  nodata: -9999,
});

const style = new IDEE.style.Raster({
  bands: 1,
  min: 0,
  max: 2000,
  nodata: -9999,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
});
```

---

## Relación `min` / `max` y `normalize`

| `normalize` en capa | Rango real de píxeles | `min` / `max` recomendados |
|---------------------|----------------------|----------------------------|
| `true` (por defecto) | 0 – 1 | `min: 0`, `max: 1` |
| `false` | Valores crudos del TIFF | Según el dato (p. ej. 0–255, 0–2000) |

Si `min`/`max` no coinciden con el rango real:
- Valores por debajo del rango efectivo → primer color de la rampa (p. ej. azul)
- Valores por encima → último color (p. ej. rojo)
- Con `normalize: true` y `max: 255`, casi todo se verá azul porque los datos están en 0–1

---

## Interpolación: ejemplos visuales

Misma rampa y rango, distinto tipo de interpolación:

```javascript
// Uniforme
new IDEE.style.Raster({
  min: 0, max: 1,
  ramp: contrastRamp,
  interpolation: 'linear',
});

// Predominan colores fríos; solo zonas muy brillantes llegan a rojo
new IDEE.style.Raster({
  min: 0, max: 1,
  ramp: contrastRamp,
  interpolation: 'exponential',
  interpolationBase: 0.05,
});
```

---

## Cuadrado mayor que la imagen

Es habitual en COG que el **bounding box del archivo es rectangular**, pero la escena no lo llena por completo. Las zonas sin dato suelen tener valor **0**, que con la rampa se pinta con el **primer color** (p. ej. azul oscuro).

Para ocultarlas:

```javascript
// Capa
{ nodata: 0 }

// Estilo
{ nodata: 0 }
```

---

## Flujo de uso completo

```javascript
const mapjs = IDEE.map({ container: 'map' });

const layer = new IDEE.layer.GeoTIFF({
  url: 'https://.../datos.tif',
  name: 'Mi ráster',
  legend: 'Simbología',
}, {
  convertToRGB: false,
  normalize: true,
  bands: [1, 2, 3],
});

const style = new IDEE.style.Raster({
  bands: [1, 2, 3],
  min: 0.05,
  max: 0.85,
  ramp: ['#000080', '#0000ff', '#00ff00', '#ffff00', '#ff0000'],
  interpolation: 'linear',
  gamma: 1,
  nodata: 0,
});

mapjs.addGeoTIFF(layer);
layer.setStyle(style);

// Ajuste dinámico
style.setMin(0.1);
style.setMax(0.9);
style.setRamp(['#2c003e', '#5a189a', '#9d4edd', '#c77dff', '#e0aaff']);
layer.setStyle(style);
```
