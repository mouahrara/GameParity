import { FEATURE_REGISTRY, FEATURE_GROUPS } from "./features.js";
import { STORES } from "./stores.js";


const MAX_CANDIDATES = 8;
const openFeatureGroups = new Set();
const openCandidatePickers = new Set();

function el(tag, className, text) {
	const node = document.createElement(tag);

	if (className) {
		node.className = className;
	}
	if (text !== undefined) {
		node.textContent = text;
	}
	return node;
}

function renderPlatforms(platforms) {
	const wrap = el("div", "platforms");
	const entries = [
		["windows", "Win"],
		["mac", "Mac"],
		["linux", "Linux"]
	];

	for (const [key, label] of entries) {
		const badge = el("span", "platform-badge" + (platforms?.[key] ? " is-active" : ""), label);

		wrap.appendChild(badge);
	}
	return wrap;
}

function renderPrice(price, strings) {
	if (!price) {
		return el("div", "price price-unavailable", strings.priceUnavailable);
	}
	if (price.notYetReleased) {
		return el("div", "price price-unavailable", strings.priceNotYetReleased);
	}
	if (price.isFree) {
		return el("div", "price price-free", strings.free);
	}

	const wrap = el("div", "price");

	wrap.appendChild(el("span", "price-value", price.finalFormatted));
	if (price.discountPercent) {
		wrap.appendChild(el("span", "price-discount", `-${price.discountPercent}%`));
	}
	return wrap;
}

function renderCandidateList(ranked, onSelect, unavailableIds, strings, currentId) {
	const list = el("ul", "candidate-list");

	for (const { candidate } of ranked.slice(0, MAX_CANDIDATES)) {
		const isFailed = unavailableIds.has(String(candidate.id));
		const isCurrent = currentId != null && String(candidate.id) === String(currentId);
		const isDisabled = isFailed || isCurrent;
		const item = el("li", "candidate-item");
		const button = el("button", `candidate-button${isDisabled ? " candidate-button-disabled" : ""}`);

		button.type = "button";
		if (isDisabled) {
			button.disabled = true;
			button.title = isFailed ? strings.unavailableTag : strings.currentTag;
		} else {
			button.addEventListener("click", () => onSelect(candidate));
		}
		if (candidate.__image) {
			const img = el("img", "candidate-button-image");

			img.src = candidate.__image;
			img.alt = "";
			button.appendChild(img);
		}
		button.appendChild(el("span", "candidate-button-title", candidate.__title));
		if (isFailed) {
			button.appendChild(el("span", "candidate-button-tag candidate-button-tag-unavailable", strings.unavailableTag));
		} else if (isCurrent) {
			button.appendChild(el("span", "candidate-button-tag", strings.currentTag));
		}
		item.appendChild(button);
		list.appendChild(item);
	}
	return list;
}

function buildSearchLink(searchUrl, storeLabel, strings) {
	if (!searchUrl) {
		return document.createDocumentFragment();
	}

	const link = el("a", "check-store-link", strings.checkOnStore(storeLabel));

	link.href = searchUrl;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	return link;
}

function renderStoreCard(store, entry, options, strings) {
	const storeLabel = strings.featureTableStore[store];
	const card = el("div", `store-card store-card-${store}`);

	card.appendChild(el("div", "store-card-label", storeLabel));
	if (options.status === "loading") {
		card.appendChild(el("div", "store-card-state", strings.searching));
		return card;
	}
	if (options.status === "error") {
		const state = el("div", "store-card-state store-card-state-error", strings.unreachable(storeLabel));
		const retry = el("button", "retry-button", strings.retry);

		retry.type = "button";
		retry.addEventListener("click", options.onRetry);
		card.appendChild(state);
		card.appendChild(retry);
		return card;
	}
	if (!entry || !entry.available) {
		const message = entry?.reason === "unavailable_in_region" ? strings.unavailableInRegion(storeLabel) : strings.notFoundOn(storeLabel);

		card.appendChild(el("div", "store-card-state", message));
		if (options.ranked && options.ranked.length > 0) {
			card.appendChild(renderCandidateList(options.ranked, options.onSelectCandidate, options.unavailableIds, strings));
		}
		card.appendChild(buildSearchLink(options.searchUrl, storeLabel, strings));
		return card;
	}
	if (entry.image) {
		const imageLink = el("a");

		imageLink.href = entry.url;
		imageLink.target = "_blank";
		imageLink.rel = "noopener noreferrer";

		const img = el("img", "store-card-image");

		img.src = entry.image;
		img.alt = entry.name;
		imageLink.appendChild(img);
		card.appendChild(imageLink);
	}

	const titleLink = el("a", "store-card-title", entry.name);

	titleLink.href = entry.url;
	titleLink.target = "_blank";
	titleLink.rel = "noopener noreferrer";
	card.appendChild(titleLink);
	card.appendChild(renderPrice(entry.price, strings));
	card.appendChild(renderPlatforms(entry.platforms));

	const changeLink = el("button", "change-match-link", strings.changeMatch);

	changeLink.type = "button";

	const candidatesHolder = el("div", "candidate-holder");

	candidatesHolder.hidden = !openCandidatePickers.has(store);
	changeLink.addEventListener("click", () => {
		candidatesHolder.hidden = !candidatesHolder.hidden;
		if (candidatesHolder.hidden) {
			openCandidatePickers.delete(store);
		} else {
			openCandidatePickers.add(store);
		}
	});
	card.appendChild(changeLink);

	if (options.ranked) {
		candidatesHolder.appendChild(
			renderCandidateList(options.ranked, options.onSelectCandidate, options.unavailableIds, strings, entry.id)
		);
	}
	candidatesHolder.appendChild(buildSearchLink(options.searchUrl, storeLabel, strings));
	card.appendChild(candidatesHolder);
	return card;
}

function featureCell(value, strings) {
	if (value === undefined) {
		const cell = el("span", "feature-cell feature-cell-unknown", "—");

		cell.title = strings.noDataTooltip;
		return cell;
	}
	return el("span", `feature-cell ${value ? "feature-cell-yes" : "feature-cell-no"}`, value ? "✓" : "✕");
}

// Level is "full", "none", or a qualifier like "usbOnly"/"partial". Label at
// strings[level+"Tag"], tooltip at strings[level+"Tooltip"].
function peripheralCell(level, strings) {
	if (level === undefined) {
		const cell = el("span", "feature-cell feature-cell-unknown", "—");

		cell.title = strings.noDataTooltip;
		return cell;
	}
	if (level === "full") {
		return el("span", "feature-cell feature-cell-yes", "✓");
	}
	if (level === "none") {
		return el("span", "feature-cell feature-cell-no", "✕");
	}

	const cell = el("span", "feature-cell");

	cell.appendChild(el("span", "feature-cell-yes", "✓"));
	cell.appendChild(document.createTextNode(" "));
	cell.appendChild(el("span", "feature-cell-qualifier", strings[`${level}Tag`]));

	const tooltip = strings[`${level}Tooltip`];

	if (tooltip) {
		cell.title = tooltip;
	}
	return cell;
}

function tableHead(strings) {
	const head = el("thead");
	const headRow = el("tr");

	headRow.appendChild(el("th", "feature-table-corner"));
	for (const config of STORES) {
		headRow.appendChild(el("th", "feature-table-store", strings.featureTableStore[config.id]));
	}
	head.appendChild(headRow);
	return head;
}

// A level other than "none" still renders a ✓, only qualified, so it counts as having the feature.
function hasFeature(value) {
	return typeof value === "string" ? value !== "none" : value;
}

function buildFeatureRow(label, values, cellFn, strings) {
	const tr = el("tr");
	const knownValues = values.filter((value) => value !== undefined).map(hasFeature);
	const isMismatch = knownValues.length > 1 && knownValues.some((value) => value !== knownValues[0]);

	if (isMismatch) {
		tr.classList.add("feature-row-mismatch");
	}
	tr.appendChild(el("th", "feature-row-label", label));
	for (const value of values) {
		const td = el("td", "feature-row-cell");

		td.appendChild(cellFn(value, strings));
		tr.appendChild(td);
	}
	return tr;
}

function buildSubgroupRow(label) {
	const tr = el("tr", "feature-subgroup-row");
	const th = el("th", "feature-subgroup-row-label", label);

	th.colSpan = STORES.length + 1;
	tr.appendChild(th);
	return tr;
}

function buildEntryRow(entry, entries, strings) {
	if (entry.customLevel) {
		const values = entries.map((e) => (e?.available ? e[`${entry.key}Level`] : undefined));

		return buildFeatureRow(strings.features[entry.key], values, peripheralCell, strings);
	}

	const values = entries.map((e) => (e?.available ? e.features?.[entry.key] : undefined));

	return buildFeatureRow(strings.features[entry.key], values, featureCell, strings);
}

function buildFeatureTableBody(registryEntries, entries, strings) {
	const body = el("tbody");
	let lastSubgroup = null;

	for (const entry of registryEntries) {
		if (entry.subgroup && entry.subgroup !== lastSubgroup) {
			body.appendChild(buildSubgroupRow(strings.subgroups[entry.subgroup]));
			lastSubgroup = entry.subgroup;
		}
		body.appendChild(buildEntryRow(entry, entries, strings));
	}
	return body;
}

function buildFeatureTable(registryEntries, entries, strings) {
	const table = el("table", "feature-table");

	table.appendChild(tableHead(strings));
	table.appendChild(buildFeatureTableBody(registryEntries, entries, strings));
	return table;
}

function buildOverviewTable(entries, strings) {
	const overviewEntries = FEATURE_REGISTRY.filter((entry) => entry.group === "overview");
	const table = el("table", "feature-table");

	table.appendChild(tableHead(strings));

	const body = buildFeatureTableBody(overviewEntries, entries, strings);
	const controllerValues = entries.map((e) => (e?.available ? e.controllerLevel : undefined));

	body.appendChild(buildFeatureRow(strings.features.controllerSupport, controllerValues, peripheralCell, strings));
	table.appendChild(body);
	return table;
}

function renderFeatureGroups(entries, strings) {
	const container = el("div", "feature-groups");

	container.appendChild(el("div", "feature-groups-label", strings.groups.overview));
	container.appendChild(buildOverviewTable(entries, strings));
	for (const group of FEATURE_GROUPS) {
		if (group === "overview") {
			continue;
		}

		const registryEntries = FEATURE_REGISTRY.filter((entry) => entry.group === group);
		const table = buildFeatureTable(registryEntries, entries, strings);
		const details = el("details", "feature-group");
		const summary = el("summary", "feature-group-summary", strings.groups[group]);

		details.open = openFeatureGroups.has(group);
		details.addEventListener("toggle", () => {
			if (details.open) {
				openFeatureGroups.add(group);
			} else {
				openFeatureGroups.delete(group);
			}
		});
		details.appendChild(summary);
		details.appendChild(table);
		container.appendChild(details);
	}
	return container;
}

export function renderComparison(root, state, handlers, strings) {
	const grid = el("div", "comparison-grid");

	grid.style.setProperty("--store-count", STORES.length);
	root.innerHTML = "";
	for (const config of STORES) {
		const storeState = state.stores[config.id];

		grid.appendChild(
			renderStoreCard(
				config.id,
				storeState.detail,
				{
					status: storeState.status,
					ranked: storeState.ranked,
					unavailableIds: storeState.unavailableIds || new Set(),
					onSelectCandidate: handlers.onSelectCandidate[config.id],
					onRetry: handlers.onRetry[config.id],
					searchUrl: state.query ? config.searchUrl(state.query) : null
				},
				strings
			)
		);
	}
	root.appendChild(grid);

	const statuses = STORES.map((config) => state.stores[config.id].status);

	if (!statuses.includes("loading")) {
		const entries = STORES.map((config) => state.stores[config.id].detail);

		root.appendChild(renderFeatureGroups(entries, strings));
	}
	if (statuses.every((status) => status === "ok") && STORES.every((config) => !state.stores[config.id].detail?.available)) {
		root.appendChild(el("p", "empty-hint", strings.emptyHint));
	}
}
