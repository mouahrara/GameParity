import { CACHE_TTL_SECONDS, SUPPORTED_COUNTRIES, relayUpstream } from "./shared.js";

export function search({ request, env, waitUntil }) {
	const url = new URL(request.url);
	const query = url.searchParams.get("query") || "";
	const upstreamUrl = new URL("https://catalog.gog.com/v1/catalog");

	upstreamUrl.searchParams.set("query", `like:${query}`);
	upstreamUrl.searchParams.set("order", "desc:score");
	upstreamUrl.searchParams.set("limit", "20");
	return relayUpstream(request, env, waitUntil, upstreamUrl, CACHE_TTL_SECONDS.gogSearch);
}

export function prices({ request, env, waitUntil, param }) {
	if (!/^\d+$/.test(param)) {
		return new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const countryCode = SUPPORTED_COUNTRIES.has(url.searchParams.get("countryCode")) ? url.searchParams.get("countryCode") : "US";
	const upstreamUrl = new URL(`https://api.gog.com/products/${param}/prices`);

	// No currency asked for: GOG bills each country in one it supports, and rejects the others.
	upstreamUrl.searchParams.set("countryCode", countryCode);
	return relayUpstream(request, env, waitUntil, upstreamUrl, CACHE_TTL_SECONDS.gogPrices);
}
