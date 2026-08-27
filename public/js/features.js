// steamIds, epicTags and gogSlugs hold each store's own vocabulary for the same row. Leaving one
// empty means that store has no such concept, so its cell reads "—" rather than a false "✕".
export const FEATURE_REGISTRY = [
	{ key: "singleplayer", group: "overview", steamIds: [2], epicTags: ["1370"], gogSlugs: ["single"] },
	{ key: "coop", group: "overview", steamIds: [9], epicTags: ["1264"], gogSlugs: ["coop"] },
	{ key: "multiplayer", group: "overview", steamIds: [1], epicTags: ["1203"], gogSlugs: ["multi", "galaxy_multiplayer"] },
	{ key: "achievements", group: "overview", steamIds: [22], epicTags: ["19847"], gogSlugs: ["achievements"] },
	{ key: "cloudSave", group: "overview", steamIds: [23], epicTags: ["21894"], gogSlugs: ["cloud_saves"] },

	// Coop
	{ key: "coop", group: "coopMultiplayer", subgroup: "coop", steamIds: [9], epicTags: ["1264"], gogSlugs: ["coop"] },
	{ key: "coopSplitScreen", group: "coopMultiplayer", subgroup: "coop", steamIds: [39, 24], gogSlugs: [], customLevel: true },
	{ key: "coopLan", group: "coopMultiplayer", subgroup: "coop", steamIds: [48], gogSlugs: [] },
	{ key: "coopOnline", group: "coopMultiplayer", subgroup: "coop", steamIds: [38], gogSlugs: [] },
	// PvP
	{ key: "pvpGeneric", group: "coopMultiplayer", subgroup: "pvp", steamIds: [49], gogSlugs: [] },
	{ key: "pvpSplitScreen", group: "coopMultiplayer", subgroup: "pvp", steamIds: [37, 24], gogSlugs: [], customLevel: true },
	{ key: "pvpLan", group: "coopMultiplayer", subgroup: "pvp", steamIds: [47], gogSlugs: [] },
	{ key: "pvpOnline", group: "coopMultiplayer", subgroup: "pvp", steamIds: [36], gogSlugs: [] },
	// Multiplayer (generic)
	{ key: "multiplayer", group: "coopMultiplayer", subgroup: "multiplayer", steamIds: [1], epicTags: ["1203"], gogSlugs: ["multi", "galaxy_multiplayer"] },
	{ key: "crossPlatformMp", group: "coopMultiplayer", subgroup: "multiplayer", steamIds: [27], epicTags: ["22776"], gogSlugs: [] },
	{ key: "mmo", group: "coopMultiplayer", subgroup: "multiplayer", steamIds: [20], epicTags: ["22775"], gogSlugs: [] },
	{ key: "competitive", group: "coopMultiplayer", subgroup: "multiplayer", steamIds: [], epicTags: ["1299"], gogSlugs: [] },
	{ key: "leaderboards", group: "coopMultiplayer", subgroup: "multiplayer", steamIds: [25], gogSlugs: ["leaderboards"] },
	// Remote Play
	{ key: "remotePlayTogether", group: "coopMultiplayer", subgroup: "remotePlay", steamIds: [44], gogSlugs: [] },
	{ key: "remotePlayPhone", group: "coopMultiplayer", subgroup: "remotePlay", steamIds: [41], gogSlugs: [] },
	{ key: "remotePlayTablet", group: "coopMultiplayer", subgroup: "remotePlay", steamIds: [42], gogSlugs: [] },
	{ key: "remotePlayTV", group: "coopMultiplayer", subgroup: "remotePlay", steamIds: [43], gogSlugs: [] },

	// Controllers
	// Plain boolean here. Full/partial nuance lives on overview's controllerSupport row (see controllerLevel).
	{ key: "controllerXbox", group: "controllersVr", subgroup: "controllers", steamIds: [18, 28], gogSlugs: [] },
	// customLevel: computed in normalizeSteam, not a plain boolean. Full vs USB-only isn't in the public API.
	{ key: "dualshock", group: "controllersVr", subgroup: "controllers", steamIds: [55, 56], gogSlugs: [], customLevel: true },
	{ key: "dualsense", group: "controllersVr", subgroup: "controllers", steamIds: [57, 58], gogSlugs: [], customLevel: true },
	{ key: "steamInputApi", group: "controllersVr", subgroup: "controllers", steamIds: [59], gogSlugs: [] },
	{ key: "gamepadRecommended", group: "controllersVr", subgroup: "controllers", steamIds: [60], gogSlugs: [] },
	// VR
	// id 53 = current VR tag, id 31 = legacy duplicate (e.g. Half-Life: Alyx), id 54 = VR-exclusive titles
	// (included since they don't always also carry 53).
	{ key: "vrSupported", group: "controllersVr", subgroup: "vr", steamIds: [53, 31, 54], epicTags: ["1179"], gogSlugs: [] },
	{ key: "vrOnly", group: "controllersVr", subgroup: "vr", steamIds: [54], gogSlugs: [] },
	{ key: "vrTrackedController", group: "controllersVr", subgroup: "vr", steamIds: [52], gogSlugs: [] },
	{ key: "vrCollectibles", group: "controllersVr", subgroup: "vr", steamIds: [40], gogSlugs: [] },
	// Other
	{ key: "alexaGameControl", group: "controllersVr", subgroup: "other", steamIds: [], epicTags: ["27343"], gogSlugs: [] },

	// Purchases & community
	{ key: "inAppPurchases", group: "platformFeatures", subgroup: "purchasesCommunity", steamIds: [35], gogSlugs: [] },
	{ key: "tradingCards", group: "platformFeatures", subgroup: "purchasesCommunity", steamIds: [29], gogSlugs: [] },
	{ key: "workshop", group: "platformFeatures", subgroup: "purchasesCommunity", steamIds: [30, 51], gogSlugs: [] },
	{ key: "familySharing", group: "platformFeatures", subgroup: "purchasesCommunity", steamIds: [62], gogSlugs: [] },
	// Display & captions
	{ key: "captions", group: "platformFeatures", subgroup: "displayCaptions", steamIds: [13], gogSlugs: [] },
	{ key: "hdr", group: "platformFeatures", subgroup: "displayCaptions", steamIds: [61], gogSlugs: [] },
	// Steam platform
	{ key: "turnNotifications", group: "platformFeatures", subgroup: "steamPlatform", steamIds: [32], gogSlugs: [] },
	{ key: "steamTimeline", group: "platformFeatures", subgroup: "steamPlatform", steamIds: [63], gogSlugs: [] },
	{ key: "antiCheat", group: "platformFeatures", subgroup: "steamPlatform", steamIds: [8], gogSlugs: [] },
	{ key: "stats", group: "platformFeatures", subgroup: "steamPlatform", steamIds: [15], gogSlugs: [] },
	// GOG platform
	{ key: "galaxyOverlay", group: "platformFeatures", subgroup: "gogPlatform", steamIds: [], gogSlugs: ["overlay"] },
	// Developer tools
	{ key: "sourceSdk", group: "platformFeatures", subgroup: "developerTools", steamIds: [16], gogSlugs: [] },
	{ key: "levelEditor", group: "platformFeatures", subgroup: "developerTools", steamIds: [17], gogSlugs: [] },

	// Reading & text
	{ key: "adjustableTextSize", group: "accessibility", subgroup: "readingText", steamIds: [64], epicTags: ["20151"], gogSlugs: [] },
	{ key: "subtitleOptions", group: "accessibility", subgroup: "readingText", steamIds: [65], gogSlugs: [] },
	{ key: "chatSpeechToText", group: "accessibility", subgroup: "readingText", steamIds: [72], gogSlugs: [] },
	{ key: "chatTextToSpeech", group: "accessibility", subgroup: "readingText", steamIds: [73], gogSlugs: [] },
	{ key: "commentary", group: "accessibility", subgroup: "readingText", steamIds: [14], gogSlugs: [] },
	// Visual
	{ key: "playableWithoutVision", group: "accessibility", subgroup: "visual", steamIds: [81], gogSlugs: [] },
	{ key: "cameraComfort", group: "accessibility", subgroup: "visual", steamIds: [67], gogSlugs: [] },
	{ key: "colorAlternatives", group: "accessibility", subgroup: "visual", steamIds: [66], epicTags: ["20155"], gogSlugs: [] },
	{ key: "contrastControls", group: "accessibility", subgroup: "visual", steamIds: [82], gogSlugs: [] },
	{ key: "brightnessAdjustments", group: "accessibility", subgroup: "visual", steamIds: [], epicTags: ["20152"], gogSlugs: [] },
	// Audio
	{ key: "narratedMenus", group: "accessibility", subgroup: "audio", steamIds: [71], gogSlugs: [] },
	{ key: "customVolume", group: "accessibility", subgroup: "audio", steamIds: [68], gogSlugs: [] },
	{ key: "stereoSound", group: "accessibility", subgroup: "audio", steamIds: [69], gogSlugs: [] },
	{ key: "surroundSound", group: "accessibility", subgroup: "audio", steamIds: [70], gogSlugs: [] },
	// Controls & pacing
	{ key: "keyboardOnly", group: "accessibility", subgroup: "controlsPacing", steamIds: [75], gogSlugs: [] },
	{ key: "mouseOnly", group: "accessibility", subgroup: "controlsPacing", steamIds: [76], gogSlugs: [] },
	{ key: "touchOnly", group: "accessibility", subgroup: "controlsPacing", steamIds: [77], gogSlugs: [] },
	{ key: "selfPaced", group: "accessibility", subgroup: "controlsPacing", steamIds: [80], gogSlugs: [] },
	{ key: "playableWithoutTimedInput", group: "accessibility", subgroup: "controlsPacing", steamIds: [74], gogSlugs: [] },
	// Gameplay
	{ key: "adjustableDifficulty", group: "accessibility", subgroup: "gameplay", steamIds: [78], gogSlugs: [] },
	{ key: "saveAnytime", group: "accessibility", subgroup: "gameplay", steamIds: [79], gogSlugs: [] }
];
export const FEATURE_GROUPS = ["overview", "coopMultiplayer", "platformFeatures", "controllersVr", "accessibility"];
