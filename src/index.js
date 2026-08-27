import * as epic from "./epic.js";
import * as gog from "./gog.js";
import * as steam from "./steam.js";

const ROUTES = {
	"steam/search": steam.search,
	"steam/app": steam.app,
	"epic/search": epic.search,
	"epic/app": epic.app,
	"gog/search": gog.search,
	"gog/prices": gog.prices
};

export default {
	async fetch(request, env, ctx) {
		const [, prefix, store, action, param, ...rest] = new URL(request.url).pathname.split("/");

		// Only /api/* reaches the Worker, see run_worker_first in wrangler.toml.
		if (prefix !== "api") {
			return env.ASSETS.fetch(request);
		}
		if (request.method !== "GET") {
			return new Response("Method Not Allowed", { status: 405 });
		}
		// The browser sets Sec-Fetch-Site itself on every fetch() call, so a same-origin call from
		// the website's own JS always carries "same-origin".
		if (request.headers.get("Sec-Fetch-Site") !== "same-origin") {
			return new Response("Forbidden", { status: 403 });
		}

		const handler = ROUTES[`${store}/${action}`];

		if (!handler || rest.length > 0) {
			return new Response("Not Found", { status: 404 });
		}
		try {
			return await handler({ request, env, waitUntil: ctx.waitUntil.bind(ctx), param });
		} catch (error) {
			console.error(error);

			return new Response(JSON.stringify({ error: "upstream_failure" }), {
				status: 502,
				headers: { "Content-Type": "application/json" }
			});
		}
	}
};
