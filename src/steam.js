import {
	CACHE_TTL_SECONDS,
	SUPPORTED_COUNTRIES,
	UPSTREAM_TIMEOUT_MS,
	cachedJsonRoute,
	fetchSearchSuggestions,
	fetchStoreSearchItems,
	relayUpstream
} from "./shared.js";

async function fetchSearchItems(term, cc) {
	const deadline = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);
	let items = [];

	try {
		items = await fetchSearchSuggestions(term, cc, deadline);
	} catch (_) {
		items = [];
	}
	if (items.length === 0) {
		try {
			items = await fetchStoreSearchItems(term, cc, deadline);
		} catch (_) {
			// An empty list here would be cached as a genuine "no results".
			throw new Error("steam_search_unreachable");
		}
	}
	return { items };
}

export function search({ request, env, waitUntil }) {
	const url = new URL(request.url);
	const cc = SUPPORTED_COUNTRIES.has(url.searchParams.get("cc")) ? url.searchParams.get("cc") : "US";
	const term = url.searchParams.get("term") || "";
	const cacheKeyUrl = new URL(url.pathname, url.origin);

	cacheKeyUrl.searchParams.set("term", term);
	cacheKeyUrl.searchParams.set("cc", cc);

	return cachedJsonRoute(request, env, waitUntil, cacheKeyUrl, CACHE_TTL_SECONDS.steamSearch, () => fetchSearchItems(term, cc));
}

export function app({ request, env, waitUntil, param }) {
	if (!/^\d+$/.test(param)) {
		return new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const cc = SUPPORTED_COUNTRIES.has(url.searchParams.get("cc")) ? url.searchParams.get("cc") : "US";
	const upstreamUrl = new URL("https://store.steampowered.com/api/appdetails");

	upstreamUrl.searchParams.set("appids", param);
	upstreamUrl.searchParams.set("cc", cc);
	upstreamUrl.searchParams.set("l", "english");

	return relayUpstream(request, env, waitUntil, upstreamUrl, CACHE_TTL_SECONDS.steamApp);
}
