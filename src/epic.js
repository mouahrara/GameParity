import { CACHE_TTL_SECONDS, SUPPORTED_COUNTRIES, cachedJsonRoute, fetchEpicGraphQL } from "./shared.js";

const SEARCH_COUNT = 20;
const OFFER_FIELDS = `
	title
	id
	namespace
	productSlug
	urlSlug
	effectiveDate
	offerMappings { pageSlug }
	keyImages { type url }
	tags { id groupName }
	price(country: $country) {
		totalPrice { discountPrice originalPrice currencyCode currencyInfo { decimals } }
	}
`;
const SEARCH_QUERY = `
	query searchStoreQuery($keywords: String, $country: String!, $locale: String, $count: Int) {
		Catalog {
			searchStore(keywords: $keywords, country: $country, locale: $locale, count: $count) {
				elements {${OFFER_FIELDS}}
			}
		}
	}
`;
const OFFER_QUERY = `
	query getOffer($namespace: String!, $id: String!, $country: String!, $locale: String) {
		Catalog {
			catalogOffer(namespace: $namespace, id: $id, locale: $locale) {${OFFER_FIELDS}}
		}
	}
`;

async function fetchSearchItems(term, countryCode) {
	const data = await fetchEpicGraphQL(SEARCH_QUERY, {
		keywords: term,
		country: countryCode,
		locale: "en-US",
		count: SEARCH_COUNT
	});

	return { items: data?.data?.Catalog?.searchStore?.elements || [] };
}

async function fetchOffer(namespace, id, countryCode) {
	const data = await fetchEpicGraphQL(OFFER_QUERY, { namespace, id, country: countryCode, locale: "en-US" });

	return { offer: data?.data?.Catalog?.catalogOffer || null };
}

export function search({ request, env, waitUntil }) {
	const url = new URL(request.url);
	const term = url.searchParams.get("term") || "";
	const countryCode = SUPPORTED_COUNTRIES.has(url.searchParams.get("countryCode")) ? url.searchParams.get("countryCode") : "US";
	const cacheKeyUrl = new URL(url.pathname, url.origin);

	cacheKeyUrl.searchParams.set("term", term);
	cacheKeyUrl.searchParams.set("countryCode", countryCode);

	return cachedJsonRoute(request, env, waitUntil, cacheKeyUrl, CACHE_TTL_SECONDS.epicSearch, () => fetchSearchItems(term, countryCode));
}

// A GameParity candidate id for Epic is "namespace:id" since, unlike Steam/GOG,
// an Epic offer isn't identified by a single id.
export function app({ request, env, waitUntil, param }) {
	const [namespace, id] = param.split(":");

	if (!namespace || !id) {
		return new Response("Not Found", { status: 404 });
	}

	const url = new URL(request.url);
	const countryCode = SUPPORTED_COUNTRIES.has(url.searchParams.get("countryCode")) ? url.searchParams.get("countryCode") : "US";
	const cacheKeyUrl = new URL(url.pathname, url.origin);

	cacheKeyUrl.searchParams.set("countryCode", countryCode);

	return cachedJsonRoute(request, env, waitUntil, cacheKeyUrl, CACHE_TTL_SECONDS.epicApp, () => fetchOffer(namespace, id, countryCode));
}
