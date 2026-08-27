GameParity compares game availability, client features, and pricing between Steam, the Epic Games Store, and GOG. It's a static website paired with a [Cloudflare Worker](https://developers.cloudflare.com/workers/static-assets) that relays the requests these stores block via CORS, with no database and no server-side state.

![](https://raw.githubusercontent.com/wiki/mouahrara/GameParity/images/main.jpg)

> [!IMPORTANT]
> GameParity is an independent project, not affiliated with Steam, Epic Games Store, or GOG.

## Local development
This project requires [Node.js](https://nodejs.org).
```bash
npm install
npm run dev
```

This runs the website locally via [Wrangler](https://developers.cloudflare.com/workers/wrangler) on `http://localhost:8787`. Stop it by pressing `x`.

## Deployment
Create a [Cloudflare Workers](https://developers.cloudflare.com/workers/ci-cd/builds) project connected to this repo, leaving the default `npx wrangler deploy` deploy command. No build command is needed, since the website is already static and Cloudflare reads `wrangler.toml`, at the repo root, for the static assets and the `RATE_LIMITER` binding.

Once the project is connected, later deploys only need a push to the branch Cloudflare watches.

> [!NOTE]
> The Epic Games Store has no official public API. GameParity calls the unofficial GraphQL endpoint the storefront itself uses, behind a bot check that only passes with a real browser User-Agent. It could change or get blocked without notice.

## Accessibility
English and French translations are included, and contributions are welcome. To add a language, add its code to `LOCALES` in `public/js/i18n.js` and a matching `public/js/i18n/<code>.js` module.

## See also
- [Live website](https://gameparity.mouahrara.workers.dev)
