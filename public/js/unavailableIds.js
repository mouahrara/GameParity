// Per-store, per-currency set of unavailable ids, in sessionStorage so it survives a reload.
const PREFIX = "gameparity:unavailable:";

function keyFor(store, currencyCode) {
	return `${PREFIX}${store}:${currencyCode}`;
}

export function getUnavailableIds(store, currencyCode) {
	try {
		const raw = sessionStorage.getItem(keyFor(store, currencyCode));

		return new Set(raw ? JSON.parse(raw) : []);
	} catch (_) {
		return new Set();
	}
}

export function addUnavailableId(store, currencyCode, id) {
	try {
		const ids = getUnavailableIds(store, currencyCode);

		ids.add(String(id));
		sessionStorage.setItem(keyFor(store, currencyCode), JSON.stringify([...ids]));
	} catch (_) {
	}
}
