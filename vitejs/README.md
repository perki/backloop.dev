# backloop.dev plugin for viteJS

[![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using [backloop.dev](https://github.com/perki/backloop.dev-node) certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

> ## No longer a public service
>
> backloop.dev stopped publishing its certificate openly on 2026-09-04. A public
> certificate authority must revoke any certificate whose private key is published, and
> both of them did. <https://backloop.dev> explains it in full.
>
> This plugin still works, but the `backloop.dev` package it depends on now needs a
> secret to download the certificate, and **access is not open** — there is no way to
> request one.
>
> **It has also left npm.** Every published version is deprecated and no new one will be
> pushed there; the plugin is installed from this repository now.
>
> **On version 1 of this plugin, your dev server is quietly serving a revoked
> certificate.** The old `backloop.dev/pack.json` was left in place so that existing
> installs degrade instead of breaking, so nothing has visibly changed for you — but that
> certificate was revoked on 2026-07-31, it expires on 2026-10-29, and a client that
> checks revocation already rejects it. Nothing will replace it.
>
> **If you want HTTPS on your Vite dev server**, use
> [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) instead. It
> installs a local root into your trust store, which is the trade-off backloop.dev
> existed to avoid — and the only one a public authority is not obliged to break.

## Install

1. `npm install --save-dev github:perki/backloop.dev-vite#v2.0.0`

   Pin the tag. The plugin is no longer on npm, and it pulls `backloop.dev` from
   [its own repository](https://github.com/perki/backloop.dev-node) rather than from the registry, so an
   environment without access to GitHub cannot install it.
2. Edit `vite.config.js`
   - Add `import backloop from 'vite-plugin-backloop.dev'`
   - Add `backloop('myHostName')` to the plugins list

Example

```js
// vite.config.js
import { defineConfig } from 'vite';
import backloop from 'vite-plugin-backloop.dev';

export default defineConfig({
  plugins: [
    // ..
    backloop('myComputer')
  ],
  // ..
});
```

#### Run

Launch viteJs in dev model `npm run dev`

Open `https://myComputer.backloop.dev:<port>`

## Configuring the secret

The plugin takes no secret of its own — it uses whatever the `backloop.dev` package
finds. The simplest way in a Vite project is `BACKLOOPDEV` in your environment,
or a `backloop.dev.json` file in the project root:

```json
{ "secret": "<your secret>" }
```

**Add `backloop.dev.json` to `.gitignore`.**

If neither is set, `npm run dev` asks you once at the terminal and remembers a secret
that works, so you are not asked again. See
[backloop.dev's README](https://github.com/perki/backloop.dev-node#configuring-the-secret) for every option,
including `BACKLOOP_DEV_CERTS_DIR` for when you already hold the certificate files.

## CONTRIBUTING

\- Pull requests are welcome

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
