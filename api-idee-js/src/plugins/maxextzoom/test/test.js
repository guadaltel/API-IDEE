import MaxExtZoom from 'facade/maxextzoom';

const map = IDEE.map({
  container: 'mapjs',
});

const mp = new MaxExtZoom();


map.addPlugin(mp);
