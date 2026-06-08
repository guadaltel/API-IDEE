import { map as Mmap } from 'IDEE/api-idee';
import Catalog from 'IDEE/stac/Catalog';
import GeoJSON from 'IDEE/layer/GeoJSON';
import GeoTIFF from 'IDEE/layer/GeoTIFF';

const STAC_FILTER_LANG = {
	STAC_QUERY: 'stac-query',
	CQL_JSON: 'cql-json',
	CQL2_JSON: 'cql2-json',
};

const resultsEl = document.getElementById('results');
const catalogUrlInput = document.getElementById('catalog-url');
const authUrlInput = document.getElementById('auth-url');
const publicInput = document.getElementById('public');
const collectionIdInput = document.getElementById('collection-id');
const itemIdInput = document.getElementById('item-id');
const tokenUserInput = document.getElementById('token-user');
const tokenPasswordInput = document.getElementById('token-password');
const queryFiltersInput = document.getElementById('query-filters');
const queryLimitInput = document.getElementById('query-limit');
const filterFormatSelect = document.getElementById('filter-format');
const filterBodyInput = document.getElementById('filter-body');

let catalog = null;
let layerCounter = 0;
let stacLayers = [];
let stacTiffs = [];

const log = (message, data) => {
	const timestamp = new Date().toLocaleTimeString();
	const line = data !== undefined
		? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}`
		: `[${timestamp}] ${message}`;
	resultsEl.textContent = resultsEl.textContent
		? `${resultsEl.textContent}\n\n${line}`
		: line;
	console.log(message, data !== undefined ? data : '');
};

const logError = (message, err) => {
	console.error(err);
	log(message, { message: err.message });
};

const resetResults = () => {
	resultsEl.textContent = '';
};

const toFeatureCollection = (result) => {
	if (!result) {
		return null;
	}

	if (result.type === 'FeatureCollection' && Array.isArray(result.features)) {
		return result;
	}

	if (result.type === 'Feature') {
		return {
			type: 'FeatureCollection',
			features: [result],
		};
	}

	return null;
};

const addItemsToMap = (label, result) => {
	const source = toFeatureCollection(result);
	if (!source || source.features.length === 0) {
		log('Sin geometrías para añadir al mapa');
		return null;
	}

	layerCounter += 1;
	const layerName = `${label} (${layerCounter})`;
	const layer = new GeoJSON({
		name: layerName,
		legend: layerName,
		source,
		extract: true,
	});
	layer.on('load', () => {
		mapa.setBbox(layer.getFeaturesExtent());
	});
	mapa.addLayers(layer);
	stacLayers.push(layer);
	addGeotiffToMap(source);
	return layer;
};

const addGeotiffToMap = (geojson) => {
	const features = geojson.features;
	const tiffs = [];
	for (let feature of features) {
		const assets = feature.assets;
		const tiffsKeys = Object.keys(assets);
		for (let key of tiffsKeys) {
			if (assets[key].href.endsWith('.tif')) {
				const geotiff = new GeoTIFF({
					url: assets[key].href,
				});
				tiffs.push(geotiff);
				stacTiffs.push(geotiff);
				break;
			}
		}
	}
	mapa.addLayers(tiffs);
}

const removeStacLayers = () => {
	if (stacLayers.length === 0) {
		return;
	}
	mapa.removeLayers(stacLayers);
	mapa.removeLayers(stacTiffs);
	stacLayers = [];
	stacTiffs = [];
	layerCounter = 0;
};

const clearResults = () => {
	resultsEl.textContent = 'Pulsa un botón para ejecutar una función de Catalog.';
	removeStacLayers();
};

const getCatalog = () => {
	const url = catalogUrlInput.value.trim();
	const authUrl = authUrlInput.value.trim();
	const publicCatalog = publicInput.checked;
	if (!url) {
		throw new Error('La URL del catálogo es obligatoria');
	}
	if (!catalog) {
		catalog = new Catalog({ url, authUrl, public: publicCatalog });
		window.catalog = catalog;
	} else if (catalog.getUrl() !== url) {		
		catalog.setUrl(url);
	} else if (catalog.public !== publicCatalog) {
		catalog.public = publicCatalog;
	}
	return catalog;
};

const getCollectionId = () => {
	const collectionId = collectionIdInput.value.trim();
	if (!collectionId) {
		throw new Error('collectionId es obligatorio para esta función');
	}
	return collectionId;
};

const getItemId = () => {
	const itemId = itemIdInput.value.trim();
	if (!itemId) {
		throw new Error('itemId es obligatorio para esta función');
	}
	return itemId;
};

const getQueryLimit = () => {
	const value = parseInt(queryLimitInput.value, 10);
	if (Number.isNaN(value) || value < 1) {
		throw new Error('limit debe ser un número mayor que 0');
	}
	return value;
};

const parseJsonInput = (value, fieldName) => {
	if (!value || !value.trim()) {
		return {};
	}
	try {
		return JSON.parse(value);
	} catch (err) {
		throw new Error(`${fieldName} no es un JSON válido`);
	}
};

const getFilterConfig = () => ({
	format: filterFormatSelect.value,
	filter: parseJsonInput(filterBodyInput.value, 'filtro POST'),
	limit: getQueryLimit(),
});

const runHandler = (label, handler, addsToMap = false) => async () => {
	resetResults();
	try {
		log(`>>> ${label}`);
		const result = await handler();
		log(`<<< ${label}`, result);
		if (addsToMap) {
			const layer = addItemsToMap(label, result);
			if (layer) {
				log('Capa GeoJSON añadida al mapa', { name: layer.name, features: layer.source?.features?.length });
			}
		}
	} catch (err) {
		logError(`<<< ${label} ERROR`, err);
	}
};

const mapa = Mmap({
	container: 'map',
	getfeatureinfo: 'plain',
	projection: 'EPSG:3857',
	layers: ['OSM'],
});

window.map = mapa;
window.STAC_FILTER_LANG = STAC_FILTER_LANG;
window.stacLayers = stacLayers;
window.clearStacResults = clearResults;

document.getElementById('btn-authenticate').addEventListener('click', runHandler('authenticate(user, password)', () => {
	const user = tokenUserInput.value.trim();
	const password = tokenPasswordInput.value;
	if (!user || !password) {
		throw new Error('usuario y password son obligatorios para authenticate()');
	}
	getCatalog().authenticate(user, password);
}));

document.getElementById('btn-getCollections').addEventListener('click', runHandler('getCollections()', () => {
	return getCatalog().getCollections(getQueryLimit());
}));

document.getElementById('btn-getItems').addEventListener('click', runHandler('getItems(collectionId)', () => {
	return getCatalog().getItems(getCollectionId(), getQueryLimit());
}, true));

document.getElementById('btn-getItem').addEventListener('click', runHandler('getItem(collectionId, itemId)', () => {
	return getCatalog().getItem(getCollectionId(), getItemId());
}, true));

document.getElementById('btn-getFilteredItems').addEventListener('click', runHandler('getFilteredItems(collectionId, filters)', () => {
	const filters = {
		...parseJsonInput(queryFiltersInput.value, 'filtros GET'),
		limit: getQueryLimit(),
	};
	return getCatalog().getFilteredItems(getCollectionId(), filters);
}, true));

document.getElementById('btn-getQueryableFields').addEventListener('click', runHandler('getQueryableFields(collectionId)', () => {
	return getCatalog().getQueryableFields(getCollectionId());
}));

document.getElementById('btn-getFilteredItemsAdvanced').addEventListener('click', runHandler('getFilteredItemsAdvanced(collectionId, filter)', () => {
	const filter = getFilterConfig();
	return getCatalog().getFilteredItemsAdvanced(getCollectionId(), filter);
}, true));

document.getElementById('btn-clear').addEventListener('click', clearResults);
