export const STORES = [
	{ id: "steam", label: "Steam", searchUrl: (q) => `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}` },
	{ id: "epic", label: "Epic Games Store", searchUrl: (q) => `https://store.epicgames.com/browse?q=${encodeURIComponent(q)}&sortBy=relevancy` },
	{ id: "gog", label: "GOG", searchUrl: (q) => `https://www.gog.com/games?query=${encodeURIComponent(q)}` }
];
