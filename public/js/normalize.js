import { formatPrice } from "./currency.js";
import { FEATURE_REGISTRY } from "./features.js";

// Maps Steam/Epic/GOG responses into the shared shape used by render.js.
function featuresFromSteamCategoryIds(idSet) {
	const features = {};

	for (const entry of FEATURE_REGISTRY) {
		if (entry.steamIds.length === 0 || entry.customLevel) {
			continue;
		}
		features[entry.key] = entry.steamIds.some((id) => idSet.has(id));
	}
	return features;
}

function featuresFromEpicTags(tagIdSet) {
	const features = {};

	for (const entry of FEATURE_REGISTRY) {
		const epicTags = entry.epicTags || [];

		if (epicTags.length === 0 || entry.customLevel) {
			continue;
		}
		features[entry.key] = epicTags.some((id) => tagIdSet.has(id));
	}
	return features;
}

function featuresFromGogSlugs(slugSet) {
	const features = {};

	for (const entry of FEATURE_REGISTRY) {
		if (entry.gogSlugs.length === 0 || entry.customLevel) {
			continue;
		}
		features[entry.key] = entry.gogSlugs.some((slug) => slugSet.has(slug));
	}
	return features;
}

export function normalizeSteam(appid, appdetails) {
	if (!appdetails) {
		return { store: "steam", available: false };
	}
	if (appdetails.success !== true || !appdetails.data) {
		return { store: "steam", available: false, reason: "unavailable_in_region" };
	}

	const data = appdetails.data;
	const categoryIds = new Set((data.categories || []).map((c) => c.id));
	const features = featuresFromSteamCategoryIds(categoryIds);

	if (data.achievements && typeof data.achievements.total === "number") {
		features.achievements = data.achievements.total > 0;
	}

	// ids 18/28 are Xbox controller support despite the generic name. Doubles as the overview's
	// controller summary since Xbox is Steam's reference controller.
	const controllerLevel = categoryIds.has(28) ? "full" : categoryIds.has(18) ? "partial" : "none";

	// ids 56/58 mean wireless works. 55/57 alone means USB only.
	const dualshockLevel = categoryIds.has(56) ? "full" : categoryIds.has(55) ? "usbOnly" : "none";
	const dualsenseLevel = categoryIds.has(58) ? "full" : categoryIds.has(57) ? "usbOnly" : "none";

	// id 24 alone means split screen is confirmed but not whether co-op or PvP. Marked "generic" on
	// both rather than guessing.
	const genericSplitScreen = categoryIds.has(24) && !categoryIds.has(37) && !categoryIds.has(39);
	const coopSplitScreenLevel = categoryIds.has(39) ? "full" : genericSplitScreen ? "generic" : "none";
	const pvpSplitScreenLevel = categoryIds.has(37) ? "full" : genericSplitScreen ? "generic" : "none";

	let price = null;

	if (data.is_free) {
		price = { isFree: true, currency: null, finalFormatted: null, discountPercent: null };
	} else if (data.price_overview) {
		const finalAmount = data.price_overview.final / 100;

		price = {
			isFree: false,
			currency: data.price_overview.currency,
			finalFormatted: formatPrice(finalAmount, data.price_overview.currency),
			discountPercent: data.price_overview.discount_percent || null
		};
	} else if (data.release_date?.coming_soon) {
		price = { notYetReleased: true };
	}

	return {
		store: "steam",
		available: true,
		id: String(appid),
		name: data.name,
		url: `https://store.steampowered.com/app/${appid}/`,
		image: data.header_image || null,
		price,
		controllerLevel,
		dualshockLevel,
		dualsenseLevel,
		coopSplitScreenLevel,
		pvpSplitScreenLevel,
		platforms: {
			windows: !!data.platforms?.windows,
			mac: !!data.platforms?.mac,
			linux: !!data.platforms?.linux
		},
		features
	};
}

// Epic's search results and its single-offer lookup both return this same shape,
// unlike Steam/GOG which need a second call for full detail.
export function epicImageUrl(keyImages) {
	const preferredTypes = ["DieselStoreFrontWide", "OfferImageWide", "Thumbnail"];

	for (const type of preferredTypes) {
		const match = keyImages?.find((image) => image.type === type);

		if (match) {
			return match.url;
		}
	}
	return null;
}

export function normalizeEpic(offer) {
	if (!offer) {
		return { store: "epic", available: false };
	}

	const tagIds = new Set((offer.tags || []).map((tag) => String(tag.id)));
	const features = featuresFromEpicTags(tagIds);
	const controllerLevel = tagIds.has("9549") ? "full" : "none";
	const slug = offer.offerMappings?.[0]?.pageSlug || offer.productSlug || offer.urlSlug;
	const totalPrice = offer.price?.totalPrice;
	const notYetEffective = Date.parse(offer.effectiveDate) > Date.now();
	let price = null;

	if (totalPrice?.discountPrice === 0 && notYetEffective) {
		price = { notYetReleased: true };
	} else if (totalPrice) {
		// Epic reports amounts using the billing currency's actual decimal count
		// (0 for JPY/KRW/VND), unlike Steam/GOG which always use a fixed 2.
		const divisor = 10 ** (totalPrice.currencyInfo?.decimals ?? 2);
		const finalAmount = totalPrice.discountPrice / divisor;
		const baseAmount = totalPrice.originalPrice / divisor;
		const isFree = totalPrice.discountPrice === 0;

		price = {
			isFree,
			currency: totalPrice.currencyCode,
			finalFormatted: isFree ? null : formatPrice(finalAmount, totalPrice.currencyCode),
			discountPercent: !isFree && baseAmount > finalAmount ? Math.round((1 - finalAmount / baseAmount) * 100) : null
		};
	}

	return {
		store: "epic",
		available: true,
		id: `${offer.namespace}:${offer.id}`,
		name: offer.title,
		url: slug ? `https://store.epicgames.com/p/${slug}` : `https://store.epicgames.com/browse?q=${encodeURIComponent(offer.title)}&sortBy=relevancy&sortDir=DESC`,
		image: epicImageUrl(offer.keyImages),
		price,
		controllerLevel,
		platforms: {
			windows: tagIds.has("9547"),
			mac: tagIds.has("10719"),
			linux: false
		},
		features
	};
}

// Catalog search's price field is always mistagged as USD, unlike /products/{id}/prices.
export function normalizeGogPrice(pricesResponse) {
	const entry = pricesResponse?._embedded?.prices?.[0];

	if (!entry) {
		return null;
	}

	const parseMinorUnits = (value) => parseInt(value.split(" ")[0], 10) / 100;
	const finalAmount = parseMinorUnits(entry.finalPrice);
	const baseAmount = parseMinorUnits(entry.basePrice);

	if (Number.isNaN(finalAmount) || Number.isNaN(baseAmount)) {
		return null;
	}

	const code = entry.currency?.code;

	if (!code) {
		return null;
	}

	const isFree = finalAmount === 0;
	let discountPercent = null;

	if (!isFree && baseAmount > 0 && finalAmount < baseAmount) {
		discountPercent = Math.round((1 - finalAmount / baseAmount) * 100);
	}
	return {
		isFree,
		currency: code,
		finalFormatted: isFree ? null : formatPrice(finalAmount, code),
		discountPercent
	};
}

export function normalizeGog(product) {
	if (!product) {
		return { store: "gog", available: false };
	}

	const slugs = new Set((product.features || []).map((f) => f.slug));
	const features = featuresFromGogSlugs(slugs);
	const controllerLevel = slugs.has("controller_support") ? "full" : "none";
	const operatingSystems = product.operatingSystems || [];
	const referenceAmount = product.price?.finalMoney?.amount;
	let price = null;

	if (referenceAmount === undefined) {
		price = { notYetReleased: true };
	} else if (Number(referenceAmount) === 0) {
		price = { isFree: true, currency: null, finalFormatted: null, discountPercent: null };
	}

	return {
		store: "gog",
		available: true,
		id: String(product.id),
		name: product.title,
		url: product.storeLink ? product.storeLink.replace("/en/game/", "/game/") : `https://www.gog.com/game/${product.slug}`,
		image: product.coverHorizontal || null,
		price,
		controllerLevel,
		platforms: {
			windows: operatingSystems.includes("windows"),
			mac: operatingSystems.includes("osx"),
			linux: operatingSystems.includes("linux")
		},
		features
	};
}
