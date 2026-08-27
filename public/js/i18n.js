// Add a language: append its code here and add public/js/i18n/<code>.js with the same keys.
export const LOCALES = ["fr", "en"];

export const DEFAULT_LOCALE = "en";
const STORAGE_KEY = "gameparity:lang";
const cache = new Map();

function isSupportedLocale(locale) {
	return LOCALES.includes(locale);
}

function detectDefaultLocale() {
	const lang = (navigator.language || navigator.userLanguage || DEFAULT_LOCALE).toLowerCase();
	const code = lang.slice(0, 2);

	return isSupportedLocale(code) ? code : DEFAULT_LOCALE;
}

export function getLocale() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);

		if (isSupportedLocale(saved)) {
			return saved;
		}
	} catch (_) {
	}
	return detectDefaultLocale();
}

export function setLocale(locale) {
	try {
		localStorage.setItem(STORAGE_KEY, locale);
	} catch (_) {
	}
}

export async function loadStrings(locale) {
	if (cache.has(locale)) {
		return cache.get(locale);
	}

	const module = await import(`./i18n/${locale}.js`);

	cache.set(locale, module.default);
	return module.default;
}
