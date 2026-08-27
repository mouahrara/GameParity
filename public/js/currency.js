// The first region of each is what the stores are queried with, their APIs taking a country and
// not a currency. The rest only turn a browser region into a default currency.
export const CURRENCIES = [
	{ code: "AED", regions: ["AE"] },
	{ code: "AUD", regions: ["AU", "CC", "CX", "KI", "NF", "NR", "TV"] },
	{ code: "BRL", regions: ["BR"] },
	{ code: "CAD", regions: ["CA"] },
	{ code: "CHF", regions: ["CH", "LI"] },
	{ code: "CLP", regions: ["CL"] },
	{ code: "CNY", regions: ["CN"] },
	{ code: "COP", regions: ["CO"] },
	{ code: "CRC", regions: ["CR"] },
	{ code: "CZK", regions: ["CZ"] },
	{ code: "DKK", regions: ["DK", "FO", "GL"] },
	{ code: "EUR", regions: [
		"FR", "AD", "AT", "AX", "BE", "BG", "BL", "CY", "DE", "EE", "ES", "FI", "GF", "GP", "GR", "HR", "IE",
		"IT", "LT", "LU", "LV", "MC", "ME", "MF", "MQ", "MT", "NL", "PM", "PT", "RE", "SI", "SK", "SM", "VA",
		"XK", "YT"
	] },
	{ code: "GBP", regions: ["GB", "GG", "IM", "JE"] },
	{ code: "HKD", regions: ["HK"] },
	{ code: "HUF", regions: ["HU"] },
	{ code: "ILS", regions: ["IL", "PS"] },
	{ code: "IDR", regions: ["ID"] },
	{ code: "INR", regions: ["IN", "BT"] },
	{ code: "JPY", regions: ["JP"] },
	{ code: "KRW", regions: ["KR"] },
	{ code: "KWD", regions: ["KW"] },
	{ code: "KZT", regions: ["KZ"] },
	{ code: "MXN", regions: ["MX"] },
	{ code: "MYR", regions: ["MY"] },
	{ code: "NOK", regions: ["NO", "BV", "SJ"] },
	{ code: "NZD", regions: ["NZ", "CK", "NU", "PN", "TK"] },
	{ code: "PEN", regions: ["PE"] },
	{ code: "PHP", regions: ["PH"] },
	{ code: "PLN", regions: ["PL"] },
	{ code: "QAR", regions: ["QA"] },
	{ code: "RON", regions: ["RO"] },
	{ code: "RUB", regions: ["RU"] },
	{ code: "SAR", regions: ["SA"] },
	{ code: "SEK", regions: ["SE"] },
	{ code: "SGD", regions: ["SG", "BN"] },
	{ code: "THB", regions: ["TH"] },
	{ code: "TRY", regions: ["TR"] },
	{ code: "TWD", regions: ["TW"] },
	{ code: "UAH", regions: ["UA"] },
	{ code: "USD", regions: ["US"] },
	{ code: "UYU", regions: ["UY"] },
	{ code: "VND", regions: ["VN"] },
	{ code: "ZAR", regions: ["ZA", "LS", "NA", "SZ"] }
];

// The reader's own locale, so numbers follow what they already read and Intl qualifies a foreign
// symbol on its own.
export function formatPrice(amountMajorUnits, currencyCode) {
	return new Intl.NumberFormat(navigator.language || undefined, {
		style: "currency",
		currency: currencyCode
	}).format(amountMajorUnits);
}

const STORAGE_KEY = "gameparity:currency";

// Intl exposes no region to currency mapping, so this reverses the regions listed above.
const REGION_CURRENCY = new Map(CURRENCIES.flatMap((c) => c.regions.map((region) => [region, c.code])));

// Intl.Locale().maximize() resolves a bare tag like "fr" to its likely region ("FR") via CLDR data.
function regionFromLocale(lang) {
	try {
		return new Intl.Locale(lang).maximize().region || null;
	} catch (_) {
		return null;
	}
}

function detectDefaultCurrency() {
	const region = regionFromLocale(navigator.language || "en");
	const currency = region ? REGION_CURRENCY.get(region) : null;

	return currency || "USD";
}

export function getCurrency() {
	let saved = null;

	try {
		saved = localStorage.getItem(STORAGE_KEY);
	} catch (_) {
		saved = null;
	}

	const match = CURRENCIES.find((c) => c.code === saved);

	if (match) {
		return match;
	}

	const detected = detectDefaultCurrency();

	return CURRENCIES.find((c) => c.code === detected) || CURRENCIES.find((c) => c.code === "USD");
}

export function setCurrency(code) {
	try {
		localStorage.setItem(STORAGE_KEY, code);
	} catch (_) {
	}
}
