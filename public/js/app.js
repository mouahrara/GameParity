import { steamSearch, steamApp, epicSearch, epicApp, gogSearch, gogPrices } from "./api.js";
import { normalizeSteam, normalizeEpic, epicImageUrl, normalizeGog, normalizeGogPrice } from "./normalize.js";
import { pickBestMatch } from "./match.js";
import { renderComparison } from "./render.js";
import { getLocale, setLocale, loadStrings, LOCALES, DEFAULT_LOCALE } from "./i18n.js";
import { getCurrency, setCurrency, CURRENCIES } from "./currency.js";
import { getUnavailableIds, addUnavailableId } from "./unavailableIds.js";
import { STORES } from "./stores.js";


const state = {
	query: "",
	locale: getLocale(),
	currency: getCurrency(),
	pins: { steam: null, epic: null, gog: null },
	stores: {
		steam: { status: "idle", ranked: [], detail: null },
		epic: { status: "idle", ranked: [], detail: null },
		gog: { status: "idle", ranked: [], detail: null }
	}
};

let comparisonRoot;
let searchForm;
let searchInput;
let comparisonSection;
let emptyHero;
let topbarLeft;
let wordmarkEl;
let taglineEl;
let langSwitch;
let langButtons;
let currencySelect;

// Guards against a stale fetch overwriting a newer one's result.
let steamToken = 0;
let epicToken = 0;
let gogToken = 0;

// Falls back to DEFAULT_LOCALE, correcting state.locale so the language buttons stay truthful.
async function strings() {
	try {
		return await loadStrings(state.locale);
	} catch (_) {
		state.locale = DEFAULT_LOCALE;
		setLocale(DEFAULT_LOCALE);
		return loadStrings(DEFAULT_LOCALE);
	}
}

async function render() {
	// Read fresh so unavailable ids stay scoped to the current currency.
	state.stores.steam.unavailableIds = getUnavailableIds("steam", state.currency.code);
	state.stores.epic.unavailableIds = getUnavailableIds("epic", state.currency.code);

	const currentStrings = await strings();

	renderComparison(
		comparisonRoot,
		state,
		{
			onSelectCandidate: {
				steam: (candidate) => selectSteamCandidate(candidate, state.stores.steam.ranked, true),
				epic: (candidate) => selectEpicCandidate(candidate, state.stores.epic.ranked, true),
				gog: (candidate) => selectGogCandidate(candidate, state.stores.gog.ranked, true)
			},
			onRetry: {
				steam: () => loadSteam(state.query),
				epic: () => loadEpic(state.query),
				gog: () => loadGog(state.query)
			}
		},
		currentStrings
	);
	updateDocumentTitle();
}

function computeTitle() {
	if (!state.query) {
		return "GameParity";
	}

	const named = STORES.map(({ id, label }) => (state.stores[id].detail?.available ? { name: state.stores[id].detail.name, label } : null)).filter(Boolean);

	if (named.length === 0) {
		return `GameParity - "${state.query}"`;
	}
	if (named.length === 1) {
		return `GameParity - ${named[0].name} (${named[0].label})`;
	}
	if (named.every((entry) => entry.name === named[0].name)) {
		return `GameParity - ${named[0].name}`;
	}
	return `GameParity - ${named.map((entry) => `${entry.name} (${entry.label})`).join(" vs ")}`;
}

function updateDocumentTitle() {
	document.title = computeTitle();
}

// The empty-state hero and the results only ever show one at a time.
function setResultsVisible(visible) {
	comparisonSection.hidden = !visible;
	emptyHero.hidden = visible;
	taglineEl.hidden = visible;

	const container = visible ? topbarLeft : emptyHero;

	if (visible) {
		container.appendChild(wordmarkEl);
		container.appendChild(searchForm);
	} else {
		container.insertBefore(wordmarkEl, taglineEl);
		container.appendChild(searchForm);
	}
}

// Query and store ids live in the URL for shareable links and back/forward nav.
// push = new search, replace = refinement of the same search.
function currentUrlParams() {
	const params = new URLSearchParams();

	if (state.query) {
		params.set("q", state.query);
	}
	for (const { id: store } of STORES) {
		const id = state.stores[store].detail?.available ? state.stores[store].detail.id : state.pins[store];

		if (id) {
			params.set(store, id);
		}
	}
	return params;
}

function syncUrl(push) {
	const params = currentUrlParams();
	const url = params.toString() ? `?${params.toString()}` : location.pathname;

	if (push) {
		history.pushState({ query: state.query }, "", url);
	} else {
		history.replaceState({ query: state.query }, "", url);
	}
}

async function selectSteamCandidate(candidate, ranked, push = false, token) {
	const activeToken = token ?? ++steamToken;

	// Held across the await, since a currency switch would otherwise file the result under the new one.
	const currency = state.currency;

	state.pins.steam = String(candidate.id);
	state.stores.steam = { status: "loading", ranked, detail: null };
	await render();
	try {
		const detailRes = await steamApp(candidate.id, currency);
		const normalized = normalizeSteam(candidate.id, detailRes[String(candidate.id)]);

		// Steam answers success:false both for a region-blocked game and for an id that doesn't
		// exist. Only claim a region block when the id came from the search results. Otherwise
		// the id is hand-edited or stale, so it is simply not found, as Epic and GOG report it.
		if (normalized.reason === "unavailable_in_region" && !ranked.some((entry) => String(entry.candidate.id) === String(candidate.id))) {
			normalized.reason = undefined;
		}
		if (!normalized.available) {
			addUnavailableId("steam", currency.code, candidate.id);
		}
		if (activeToken !== steamToken) {
			return;
		}
		state.stores.steam = { status: "ok", ranked, detail: normalized };
	} catch (_) {
		if (activeToken !== steamToken) {
			return;
		}
		state.stores.steam = { status: "error", ranked, detail: null };
	}
	await render();
	syncUrl(push);
}

async function loadSteam(query, pinnedId) {
	const token = ++steamToken;

	state.stores.steam = { status: "loading", ranked: [], detail: null };
	await render();
	try {
		const searchRes = await steamSearch(query, state.currency);
		const items = searchRes.items || [];
		const candidates = items.map((item) => ({ ...item, __title: item.name, __image: item.tiny_image }));
		const { best, ranked, found } = pickBestMatch(query, candidates, (c) => c.__title);

		if (token !== steamToken) {
			return;
		}
		if (pinnedId) {
			await selectSteamCandidate({ id: pinnedId }, ranked, false, token);
		} else if (found) {
			await selectSteamCandidate(best, ranked, false, token);
		} else {
			state.stores.steam = { status: "ok", ranked, detail: { available: false } };
			await render();
		}
	} catch (_) {
		if (token !== steamToken) {
			return;
		}
		state.stores.steam = { status: "error", ranked: [], detail: null };
		await render();
	}
}

async function selectEpicCandidate(candidate, ranked, push = false, token) {
	const activeToken = token ?? ++epicToken;
	const currency = state.currency;

	state.pins.epic = String(candidate.id);
	state.stores.epic = { status: "loading", ranked, detail: null };
	await render();
	try {
		const offerRes = await epicApp(candidate.id, currency);
		const normalized = normalizeEpic(offerRes.offer);

		if (!normalized.available) {
			addUnavailableId("epic", currency.code, candidate.id);
		}
		if (activeToken !== epicToken) {
			return;
		}
		state.stores.epic = { status: "ok", ranked, detail: normalized };
	} catch (_) {
		if (activeToken !== epicToken) {
			return;
		}
		state.stores.epic = { status: "error", ranked, detail: null };
	}
	await render();
	syncUrl(push);
}

async function loadEpic(query, pinnedId) {
	const token = ++epicToken;

	state.stores.epic = { status: "loading", ranked: [], detail: null };
	await render();
	try {
		const searchRes = await epicSearch(query, state.currency);
		const items = searchRes.items || [];
		const candidates = items.map((item) => ({
			...item,
			id: `${item.namespace}:${item.id}`,
			__title: item.title,
			__image: epicImageUrl(item.keyImages)
		}));
		const { best, ranked, found } = pickBestMatch(query, candidates, (c) => c.__title);

		if (token !== epicToken) {
			return;
		}
		if (pinnedId) {
			await selectEpicCandidate({ id: pinnedId }, ranked, false, token);
		} else if (found) {
			await selectEpicCandidate(best, ranked, false, token);
		} else {
			state.stores.epic = { status: "ok", ranked, detail: { available: false } };
			await render();
		}
	} catch (_) {
		if (token !== epicToken) {
			return;
		}
		state.stores.epic = { status: "error", ranked: [], detail: null };
		await render();
	}
}

async function selectGogCandidate(candidate, ranked, push = false, token) {
	const activeToken = token ?? ++gogToken;
	const currency = state.currency;

	state.pins.gog = String(candidate.id);
	state.stores.gog = { status: "loading", ranked, detail: null };
	await render();

	const normalized = normalizeGog(candidate);

	if (normalized.price === null) {
		try {
			const pricesRes = await gogPrices(candidate.id, currency);

			normalized.price = normalizeGogPrice(pricesRes);
		} catch (_) {
		}
	}
	if (activeToken !== gogToken) {
		return;
	}
	state.stores.gog = { status: "ok", ranked, detail: normalized };
	await render();
	syncUrl(push);
}

async function loadGog(query, pinnedId) {
	const token = ++gogToken;

	state.stores.gog = { status: "loading", ranked: [], detail: null };
	await render();
	try {
		const searchRes = await gogSearch(query);
		const products = searchRes.searchAlgo === "default" ? searchRes.products || [] : [];
		const candidates = products.map((product) => ({
			...product,
			__title: product.title,
			__image: product.coverHorizontal
		}));
		const { best, ranked, found } = pickBestMatch(query, candidates, (c) => c.__title);
		let chosen = null;

		if (pinnedId) {
			chosen = candidates.find((c) => String(c.id) === String(pinnedId)) || null;
		} else if (found) {
			chosen = best;
		}
		if (token !== gogToken) {
			return;
		}
		if (chosen) {
			await selectGogCandidate(chosen, ranked, false, token);
		} else {
			state.stores.gog = { status: "ok", ranked, detail: { available: false } };
			await render();
		}
	} catch (_) {
		if (token !== gogToken) {
			return;
		}
		state.stores.gog = { status: "error", ranked: [], detail: null };
		await render();
	}
}

// Reuses the current match so a manual correction survives the currency change, and retries the
// pinned id when nothing resolved, since another currency may lift a region block.
async function refetchSteamForCurrency() {
	if (state.stores.steam.detail?.available) {
		const id = state.stores.steam.detail.id;

		await selectSteamCandidate({ id }, state.stores.steam.ranked);
	} else if (state.query) {
		await loadSteam(state.query, state.pins.steam);
	}
}

async function refetchEpicForCurrency() {
	if (state.stores.epic.detail?.available) {
		const id = state.stores.epic.detail.id;

		await selectEpicCandidate({ id }, state.stores.epic.ranked);
	} else if (state.query) {
		await loadEpic(state.query, state.pins.epic);
	}
}

async function refetchGogForCurrency() {
	if (!state.stores.gog.detail?.available) {
		return;
	}
	if (state.stores.gog.detail.price?.isFree || state.stores.gog.detail.price?.notYetReleased) {
		return;
	}

	const id = state.stores.gog.detail.id;
	const currency = state.currency;
	const token = ++gogToken;
	let price = null;

	try {
		const pricesRes = await gogPrices(id, currency);

		price = normalizeGogPrice(pricesRes);
	} catch (_) {
		price = null;
	}
	if (token !== gogToken) {
		return;
	}
	state.stores.gog.detail = { ...state.stores.gog.detail, price };
	await render();
}

async function refetchForCurrency() {
	await Promise.all([refetchSteamForCurrency(), refetchEpicForCurrency(), refetchGogForCurrency()]);
}

function runSearch(query) {
	state.query = query;
	state.pins = { steam: null, epic: null, gog: null };
	setResultsVisible(true);
	loadSteam(query);
	loadEpic(query);
	loadGog(query);
	syncUrl(true);
}

function restoreFromUrl() {
	const params = new URLSearchParams(location.search);
	const query = params.get("q");

	if (!query) {
		// Discards in-flight loads, which would otherwise apply and rewrite the URL.
		steamToken++;
		epicToken++;
		gogToken++;
		setResultsVisible(false);
		state.query = "";
		state.pins = { steam: null, epic: null, gog: null };
		state.stores.steam = { status: "idle", ranked: [], detail: null };
		state.stores.epic = { status: "idle", ranked: [], detail: null };
		state.stores.gog = { status: "idle", ranked: [], detail: null };
		updateDocumentTitle();
		return;
	}
	searchInput.value = query;
	state.query = query;
	state.pins = { steam: params.get("steam"), epic: params.get("epic"), gog: params.get("gog") };
	setResultsVisible(true);
	loadSteam(query, state.pins.steam);
	loadEpic(query, state.pins.epic);
	loadGog(query, state.pins.gog);
}

function onSubmit(event) {
	event.preventDefault();

	const query = searchInput.value.trim();

	if (!query) {
		return;
	}
	runSearch(query);
}

async function applyStaticStrings() {
	const s = await strings();

	document.querySelector(".tagline").textContent = s.tagline;
	searchInput.placeholder = s.searchPlaceholder;
	document.querySelector(".search-button").textContent = s.searchButton;
	document.querySelector(".footer-note").textContent = s.footerNote;
	for (const button of langButtons) {
		const isActive = button.dataset.lang === state.locale;

		button.classList.toggle("is-active", isActive);
		button.setAttribute("aria-pressed", String(isActive));
	}
}

async function onLangClick(event) {
	const locale = event.currentTarget.dataset.lang;

	if (locale === state.locale) {
		return;
	}

	const previousLocale = state.locale;

	state.locale = locale;
	setLocale(locale);
	try {
		await applyStaticStrings();
	} catch (_) {
		// Only reached when DEFAULT_LOCALE itself fails, strings() having handled every other case.
		state.locale = previousLocale;
		setLocale(previousLocale);
		return;
	}
	if (state.query) {
		await render();
	}
}

function onCurrencyChange(event) {
	const currency = CURRENCIES.find((c) => c.code === event.target.value);

	if (!currency || currency.code === state.currency.code) {
		return;
	}
	state.currency = currency;
	setCurrency(currency.code);
	if (state.query) {
		refetchForCurrency();
	}
}

// Hardcoded text: runs when i18n itself failed to load.
function showLoadError() {
	const page = document.querySelector(".page");

	page.textContent = "";

	const container = document.createElement("div");

	container.className = "load-error";

	const title = document.createElement("p");

	title.className = "load-error-title";
	title.textContent = "Something went wrong";

	const message = document.createElement("p");

	message.className = "load-error-message";
	message.textContent = "Please reload the page.";
	container.appendChild(title);
	container.appendChild(message);
	page.appendChild(container);
}

export async function initApp() {
	comparisonRoot = document.getElementById("comparison-root");
	searchForm = document.getElementById("search-form");
	searchInput = document.getElementById("search-input");
	comparisonSection = document.getElementById("comparison-view");
	emptyHero = document.getElementById("empty-hero");
	topbarLeft = document.getElementById("topbar-left");
	wordmarkEl = document.querySelector(".wordmark");
	taglineEl = document.querySelector(".tagline");
	langSwitch = document.getElementById("lang-switch");
	currencySelect = document.getElementById("currency-select");
	for (const locale of LOCALES) {
		const button = document.createElement("button");

		button.type = "button";
		button.className = "lang-button";
		button.dataset.lang = locale;
		button.textContent = locale.toUpperCase();
		button.addEventListener("click", onLangClick);
		langSwitch.appendChild(button);
	}
	langButtons = langSwitch.querySelectorAll(".lang-button");
	for (const option of CURRENCIES) {
		const opt = document.createElement("option");

		opt.value = option.code;
		opt.textContent = option.code;
		currencySelect.appendChild(opt);
	}
	currencySelect.value = state.currency.code;
	searchForm.addEventListener("submit", onSubmit);
	currencySelect.addEventListener("change", onCurrencyChange);
	window.addEventListener("popstate", restoreFromUrl);
	try {
		await applyStaticStrings();
	} catch (_) {
		showLoadError();
		return;
	}
	restoreFromUrl();
}

document.addEventListener("DOMContentLoaded", initApp);
