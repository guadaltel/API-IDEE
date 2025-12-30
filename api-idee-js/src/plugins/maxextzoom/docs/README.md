# IDEE.plugin.MaxExtZoom

Plugin que va a la extensión y posición original del mapa base.

![Imagen1](../img/maxExtZoom_1.png)

## Dependencias

- maxextzoom.ol.min.js
- maxextzoom.ol.min.css


```html
 <link href="../../plugins/maxextzoom/maxextzoom.ol.min.css" rel="stylesheet" />
 <script type="text/javascript" src="../../plugins/maxextzoom/maxextzoom.ol.min.js"></script>
```

## Parámetros

- El constructor se inicializa con un JSON de _options_ con los siguientes atributos:

- **position**. Indica la posición donde se mostrará el plugin
  - 'TL':top left (por defecto)
  - 'TR':top right 
  - 'BL':bottom left
  - 'BR':bottom right

## Ejemplos de uso

### Ejemplo 1
```javascript
  const map = IDEE.map({
    container: 'map'
  });

  const mp = new IDEE.plugin.MaxExtZoom({
    position: 'TL',
  });

  map.addPlugin(mp);
```

```javascript
  const map = IDEE.map({
    container: 'map'
  }); 

  const mp = new IDEE.plugin.MaxExtZoom();

  map.addPlugin(mp);
```