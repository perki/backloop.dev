# backloop.dev plugin for viteJS

[![npm](https://img.shields.io/npm/v/vite-plugin-backloop.dev)](https://www.npmjs.com/package/vite-plugin-backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using [backloop.dev](https://www.npmjs.com/package/backloop.dev) certificates pointing to your local environment.

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
> **If you want HTTPS on your Vite dev server**, use
> [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) instead. It
> installs a local root into your trust store, which is the trade-off backloop.dev
> existed to avoid — and the only one a public authority is not obliged to break.

## Install

1. `npm install vite-plugin-backloop.dev --save-dev`
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
finds. The simplest way in a Vite project is `BACKLOOP_DEV_SECRET` in your environment,
or a `backloop.dev.json` file in the project root:

```json
{ "secret": "<your secret>" }
```

**Add `backloop.dev.json` to `.gitignore`.** See
[backloop.dev's README](../nodejs/README.md#configuring-the-secret) for every option,
including `BACKLOOP_DEV_CERTS_DIR` for when you already hold the certificate files.

## CONTRIBUTING

\- Pull requests are welcome

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
