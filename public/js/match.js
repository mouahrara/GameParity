// Longer phrases first so a shorter one inside them isn't stripped first.
// Apostrophes are already spaces (hence "collector s edition").
const EDITION_SUFFIXES = [
	"digital deluxe edition",
	"deluxe edition",
	"game of the year edition",
	"definitive edition",
	"definitive collection",
	"complete edition",
	"complete collection",
	"complete",
	"ultimate edition",
	"gold edition",
	"special edition",
	"enhanced edition",
	"anniversary edition",
	"premium edition",
	"collector s edition",
	"director s cut",
	"extended edition",
	"legendary edition",
	"standard edition",
	"final cut",
	"redux",
	"remastered",
	"remaster",
	"hd edition",
	"vr edition",
	"expanded edition",
	"platinum edition",
	"classic edition",
	"remake",
	"goty edition",
	"goty"
];

const TITLE_PREFIXES = ["tom clancy s", "sid meier s", "marvel s", "disney s", "clive barker s", "the"];

function normalizeTitle(title) {
	let value = title.toLowerCase().replace(/[™®]/g, "").replace(/[:\-'’]/g, " ").replace(/\s+/g, " ").trim();

	for (const prefix of TITLE_PREFIXES) {
		if (value.startsWith(`${prefix} `)) {
			value = value.slice(prefix.length).trim();
		}
	}
	for (const suffix of EDITION_SUFFIXES) {
		const cut = value.length - suffix.length;

		// Require a word boundary so a title merely ending in the same letters isn't truncated.
		if (cut >= 0 && value.endsWith(suffix) && (cut === 0 || value[cut - 1] === " ")) {
			value = value.slice(0, cut).trim();
		}
	}
	return value;
}

function bigrams(value) {
	const result = [];

	for (let i = 0; i < value.length - 1; i++) {
		result.push(value.slice(i, i + 2));
	}
	return result;
}

// Dice coefficient: 2×shared bigrams / total bigrams.
function diceCoefficient(a, b) {
	if (a === b) {
		return 1;
	}
	if (a.length < 2 || b.length < 2) {
		return 0;
	}

	const bigramsA = bigrams(a);
	const bigramsB = bigrams(b);
	const counts = new Map();

	for (const gram of bigramsA) {
		counts.set(gram, (counts.get(gram) || 0) + 1);
	}

	let matches = 0;

	for (const gram of bigramsB) {
		const count = counts.get(gram) || 0;

		if (count > 0) {
			counts.set(gram, count - 1);
			matches++;
		}
	}
	return (2 * matches) / (bigramsA.length + bigramsB.length);
}

// Below 1.0 so a prefix match never outscores an exact one.
const PREFIX_BOOSTED_SCORE = 0.9;

function scoreOf(normalizedQuery, normalizedTitle) {
	if (normalizedTitle === normalizedQuery) {
		return 1;
	}

	const base = diceCoefficient(normalizedQuery, normalizedTitle);
	const isPrefixRelated = normalizedQuery.length >= 3 && normalizedTitle.length >= 3 && (normalizedTitle.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedTitle));

	return isPrefixRelated ? Math.max(base, PREFIX_BOOSTED_SCORE) : base;
}

// Below this, a game is treated as not found rather than shown as a guess.
export const MATCH_FOUND_THRESHOLD = 0.7;

export function rankCandidates(query, candidates, titleOf) {
	const normalizedQuery = normalizeTitle(query);

	return candidates
		.map((candidate) => ({
			candidate,
			score: scoreOf(normalizedQuery, normalizeTitle(titleOf(candidate)))
		}))
		.sort((a, b) => b.score - a.score);
}

export function pickBestMatch(query, candidates, titleOf) {
	if (candidates.length === 0) {
		return { best: null, ranked: [], found: false };
	}

	const ranked = rankCandidates(query, candidates, titleOf);
	const best = ranked[0];
	const found = best.score >= MATCH_FOUND_THRESHOLD;

	return {
		best: found ? best.candidate : null,
		ranked,
		found
	};
}
