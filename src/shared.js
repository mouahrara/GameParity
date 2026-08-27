import pkg from "../package.json";

// Identifies the relay to the stores, with a contact point.
export const USER_AGENT = `GameParity/${pkg.version} (+https://github.com/mouahrara/GameParity)`;
export const UPSTREAM_TIMEOUT_MS = 8000;
export const CACHE_TTL_SECONDS = {
	steamSearch: 600, // 10 min
	steamApp: 1800, // 30 min
	epicSearch: 600, // 10 min
	epicApp: 1800, // 30 min
	gogSearch: 600, // 10 min
	gogPrices: 1800 // 30 min
};

// Uppercase because Epic's GraphQL rejects anything else, while Steam and GOG accept both.
export const SUPPORTED_COUNTRIES = new Set([
	"AE", "AU", "BR", "CA", "CH", "CL", "CN", "CO", "CR", "CZ", "DK", "FR", "GB", "HK", "HU",
	"IL", "ID", "IN", "JP", "KR", "KW", "KZ", "MX", "MY", "NO", "NZ", "PE", "PH", "PL", "QA",
	"RO", "RU", "SA", "SE", "SG", "TH", "TR", "TW", "UA", "US", "UY", "VN", "ZA"
]);

// Enforced by the RATE_LIMITER binding (see wrangler.toml).
export async function isRateLimited(request, env) {
	const ip = request.headers.get("CF-Connecting-IP") || "unknown";
	const { success } = await env.RATE_LIMITER.limit({ key: ip });

	return !success;
}

// Rate limit only applies on a cache miss.
export async function relayUpstream(request, env, waitUntil, upstreamUrl, ttl) {
	const cache = caches.default;
	const cacheKey = new Request(upstreamUrl.toString(), { method: "GET" });
	let upstreamResponse = await cache.match(cacheKey);

	if (!upstreamResponse) {
		if (await isRateLimited(request, env)) {
			return new Response("Too Many Requests", { status: 429 });
		}

		upstreamResponse = await fetch(upstreamUrl.toString(), {
			headers: { "User-Agent": USER_AGENT },
			signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
		});

		if (upstreamResponse.ok && ttl > 0) {
			const cacheable = new Response(upstreamResponse.body, upstreamResponse);

			// The Cache API silently stores nothing when Set-Cookie is present.
			cacheable.headers.delete("Set-Cookie");
			cacheable.headers.set("Cache-Control", `public, max-age=${ttl}`);
			waitUntil(cache.put(cacheKey, cacheable.clone()));
			upstreamResponse = cacheable;
		}
	}

	const body = await upstreamResponse.text();
	const response = new Response(body, { status: upstreamResponse.status });

	response.headers.set("Content-Type", upstreamResponse.headers.get("Content-Type") || "application/json");
	return response;
}

// Same cache-then-rate-limit shape as relayUpstream, for a route whose fresh data doesn't come
// from a single relayable URL.
export async function cachedJsonRoute(request, env, waitUntil, cacheKeyUrl, ttl, fetchBody) {
	const cache = caches.default;
	const cacheKey = new Request(cacheKeyUrl.toString(), { method: "GET" });
	const cached = await cache.match(cacheKey);

	if (cached) {
		return new Response(await cached.text(), { headers: { "Content-Type": "application/json" } });
	}
	if (await isRateLimited(request, env)) {
		return new Response("Too Many Requests", { status: 429 });
	}

	const body = JSON.stringify(await fetchBody());
	const cacheable = new Response(body, {
		headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttl}` }
	});

	waitUntil(cache.put(cacheKey, cacheable));
	return new Response(body, { headers: { "Content-Type": "application/json" } });
}

// Steam search: SearchSuggestions first, storesearch as fallback.
const SEARCH_SUGGESTIONS_COUNT = 15;

function encodeVarint(value) {
	const bytes = [];

	while (value > 0x7f) {
		bytes.push((value & 0x7f) | 0x80);
		value >>>= 7;
	}
	bytes.push(value);
	return bytes;
}

function protoTag(fieldNumber, wireType) {
	return encodeVarint((fieldNumber << 3) | wireType);
}

function protoString(fieldNumber, text) {
	const textBytes = [...new TextEncoder().encode(text)];

	return [...protoTag(fieldNumber, 2), ...encodeVarint(textBytes.length), ...textBytes];
}

function protoVarint(fieldNumber, value) {
	return [...protoTag(fieldNumber, 0), ...encodeVarint(value)];
}

function protoMessage(fieldNumber, innerBytes) {
	return [...protoTag(fieldNumber, 2), ...encodeVarint(innerBytes.length), ...innerBytes];
}

function base64Encode(bytes) {
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function buildSearchSuggestionsPayload(term, countryCode) {
	const context = [...protoString(1, "english"), ...protoString(3, countryCode)];
	const contentFlags = [...protoVarint(16, 4), ...protoVarint(16, 3)];
	const options = [...protoVarint(1, 1), ...protoVarint(16, 1)];
	const message = [
		...protoMessage(2, context),
		...protoString(3, term),
		...protoVarint(4, SEARCH_SUGGESTIONS_COUNT),
		...protoMessage(5, contentFlags),
		...protoMessage(6, options),
		...protoVarint(7, 1),
		...protoVarint(8, 1),
		...protoVarint(9, 1)
	];

	return base64Encode(message);
}

function buildSteamImageUrl(item) {
	const assets = item.assets;

	if (!assets || !assets.asset_url_format || !assets.asset_url_format.includes("${FILENAME}")) {
		return null;
	}

	const filename = assets.small_capsule || assets.header;

	if (!filename) {
		return null;
	}

	const path = assets.asset_url_format.replace("${FILENAME}", filename);

	return `https://shared.fastly.steamstatic.com/store_item_assets/${path}`;
}

// Signal defaults to this call's own deadline. steam/search.js passes a shared one instead, so
// the suggestions call and its storesearch fallback together stay within a single budget.
export async function fetchSearchSuggestions(term, cc, signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)) {
	const url = new URL("https://api.steampowered.com/IStoreQueryService/SearchSuggestions/v1");

	url.searchParams.set("format", "json");
	url.searchParams.set("origin", "https://store.steampowered.com");
	url.searchParams.set("input_protobuf_encoded", buildSearchSuggestionsPayload(term, cc));

	const response = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal });

	if (!response.ok) {
		throw new Error(`search_suggestions_failed:${response.status}`);
	}

	const data = await response.json();
	const storeItems = data.response?.store_items || [];

	return storeItems
		.filter((item) => item.item_type === 0)
		.map((item) => ({
			id: item.appid,
			name: item.name,
			tiny_image: buildSteamImageUrl(item)
		}));
}

export async function fetchStoreSearchItems(term, cc, signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)) {
	const url = new URL("https://store.steampowered.com/api/storesearch");

	url.searchParams.set("term", term);
	url.searchParams.set("cc", cc);
	url.searchParams.set("l", "english");

	const response = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT }, signal });

	if (!response.ok) {
		throw new Error(`storesearch_failed:${response.status}`);
	}

	const data = await response.json();

	return data.items || [];
}

// Epic Games Store: unofficial GraphQL endpoint used by the storefront itself.
// It sits behind a bot check that only passes with a real browser User-Agent.
const EPIC_GRAPHQL_URL = "https://store.epicgames.com/graphql";
const EPIC_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fetchEpicGraphQL(query, variables) {
	const response = await fetch(EPIC_GRAPHQL_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json", "User-Agent": EPIC_USER_AGENT },
		body: JSON.stringify({ query, variables }),
		signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`epic_graphql_failed:${response.status}`);
	}

	const data = await response.json();

	// Epic reports failures as HTTP 200 with an errors array. Only 404 is a real absence.
	const failure = (data.errors || []).find((error) => error.status !== 404);

	if (failure) {
		throw new Error(`epic_graphql_failed:${failure.status}`);
	}
	return data;
}
