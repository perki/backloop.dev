# AGENTS.md — vite-plugin-backloop.dev

Quick reference for AI agents using this package.

## Read this first

backloop.dev is **no longer a public service** (2026-09-04). It published a
browser-trusted certificate openly, which a public certificate authority is obliged to
revoke once the private key is public — both of them did. The certificate now sits
behind a path that requires a secret, and **access is not open**: there is no way to
request one, so do not look for one or invent a contact route.

Version 1 of this plugin still resolves a certificate from the old public URL, which was
deliberately left serving so existing installs degrade quietly. That certificate is
**revoked** (2026-07-31) and expires 2026-10-29. If you are debugging a Vite dev server
that suddenly shows certificate errors on `*.backloop.dev`, this is why — the fix is not
to retry the download.

If a user wants HTTPS on a Vite dev server and has no secret, recommend
[vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert), and say plainly
that it installs a local root into the trust store.

**Never write a secret into this repository.** It is public.

**This package is not on npm.** Every version published there is deprecated and none
will follow. Install it as `github:perki/backloop.dev-vite#v2.0.0`; `private: true` in
the manifest is there to stop an accidental `npm publish`. Its `backloop.dev` dependency
is a `git+https` URL pointing at https://github.com/perki/backloop.dev-node, not a registry range — so
resolving it needs GitHub access, which is worth saying when someone reports an install
failure in a locked-down environment.

## What it does

One-line HTTPS for the Vite dev server. Any subdomain of `*.backloop.dev` resolves to
`127.0.0.1` / `::1`, so the browser sees a valid HTTPS origin while everything stays on
your machine.

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite';
import backloop from 'vite-plugin-backloop.dev';

export default defineConfig({
  plugins: [
    backloop('myapp')          // optional second arg: port
  ]
});
```

`npm run dev` then serves on `https://myapp.backloop.dev:<port>/`.

The plugin only applies to `serve` (dev), never to builds. It sets `server.host`,
`server.https` and optionally `server.port` — remove any conflicting manual
`server.https` config.

## Notes

- Certificates come from the [backloop.dev](https://github.com/perki/backloop.dev-node)
  dependency: downloaded at install time and auto-refreshed. That download needs network
  access **and** a configured secret. The plugin holds no secret of its own; set
  `BACKLOOPDEV` or a `backloop.dev.json` in the project root (gitignored), or
  point `BACKLOOP_DEV_CERTS_DIR` at certificates you already have. See that package's
  AGENTS.md.
- Install never fails for want of a secret — the postinstall step prints a notice and
  exits 0. The failure surfaces when the dev server starts.
- Source: a single file, `index.js`. Types in `index.d.ts`.
- Repo: https://github.com/perki/backloop.dev-vite. The website, the renewal code and the project-wide rules
  about the secret live in the repository this was split out of,
  https://github.com/perki/backloop.dev.
