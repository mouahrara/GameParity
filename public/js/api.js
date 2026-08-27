const REQUEST_TIMEOUT_MS = 10000;

async function getJson(path, params) {
	const url = new URL(path, location.origin);

	for (const [key, value] of Object.entries(params || {})) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url.toString(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

	if (!response.ok) {
		throw new Error(`request_failed:${response.status}`);
	}
	return response.json();
}

export function steamSearch(term, currency) {
	return getJson("/api/steam/search", { term, cc: currency.regions[0] });
}

export function steamApp(appid, currency) {
	return getJson(`/api/steam/app/${appid}`, { cc: currency.regions[0] });
}

export function epicSearch(term, currency) {
	return getJson("/api/epic/search", { term, countryCode: currency.regions[0] });
}

export function epicApp(compositeId, currency) {
	return getJson(`/api/epic/app/${compositeId}`, { countryCode: currency.regions[0] });
}

export function gogSearch(query) {
	return getJson("/api/gog/search", { query });
}

export function gogPrices(productId, currency) {
	return getJson(`/api/gog/prices/${productId}`, { countryCode: currency.regions[0] });
}
