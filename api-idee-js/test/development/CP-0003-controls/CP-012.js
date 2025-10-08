import { map as Mmap } from 'IDEE/api-idee';

const mapjs = Mmap({
  container: 'map',
  // controls: ['movement'],
  controls: ['movement**false'],
  // controls: ['movement*-47.232404252143944,12.669332411802236,38.21770136603959,51.13167021619439'],
  // controls: ['movement*-47.232404252143944,12.669332411802236,38.21770136603959,51.13167021619439*false'],
});
window.mapjs = mapjs;
