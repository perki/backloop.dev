# AGENTS.md — backloop.dev (npm package)

Quick reference for AI agents using or modifying this package.

## What it does

HTTPS on localhost without self-signed certificates:

- Any subdomain of `*.backloop.dev` resolves to `127.0.0.1` / `::1` (public DNS).
- This package downloads a publicly shared, Let's Encrypt-signed wildcard certificate for `*.backloop.dev` and exposes it as ready-to-use `{ key, cert, ca }` options for `https.createServer()`.

So `https://anything.backloop.dev:<port>/` reaches your local server with a valid certificate — no browser warnings, no mixed-content/CORS friction.

## API (CommonJS and ESM)

```js
import httpsOptions from 'backloop.dev';                  // ESM default: sync, see caveat below
const { httpsOptions, httpsOptionsAsync, httpsOptionsPromise } = require('backloop.dev');
```

- `httpsOptionsPromise(): Promise<{key, cert, ca}>` — **preferred**; refreshes the certificate if needed.
- `httpsOptionsAsync(cb)` — callback flavor of the same.
- `httpsOptions(): {key, cert, ca}` — sync; if the certificate is missing/expired it triggers an update and **exits the process** (works on next start). Avoid in long-running tooling.

Multi-host server API (same engine as `--config`):

- `startServer(config): Promise<https.Server>` — resolves once listening. `config`: `{ port, hostnames, hooks?, baseDir?, httpsOptions?, silent? }`.
- `staticDir(dir, opts?)`, `proxy(target, opts?)`, `redirect(location, status?)` — route-entry builders.

Types are in `src/index.d.ts`.

## CLI (npx or global install)

```bash
backloop.dev <path> [<port>]              # static file server on https://<any>.backloop.dev:<port>/
backloop.dev-proxy <target> [<port>]      # reverse proxy to http(s)://host[:port][/path]
backloop.dev --config=<config>            # multi-host: route hostnames/paths to static dirs, proxies or handlers
backloop.dev-update                       # force certificate refresh
```

Multi-host config format (paths resolved relative to the config file):

```json
{
  "port": 7654,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "tom/static/": { "path": "./public" }
  }
}
```

Routing:
- Keys with a trailing `/` are path prefixes on a hostname; longest prefix wins; `hostname/` (or bare `hostname`) is the catch-all.
- The matched prefix is **stripped by default**; set `"strip": false` to keep it. A slash-less path still matches its prefix route; `"redirectToSlash": true` 301s `/x` to `/x/`.
- Proxy entries accept `transformRequest(headers, req)` / `transformResponse(res, req)`.

`--config` also accepts `.js`/`.cjs`/`.mjs`, which additionally allow: a vanilla `{ handler: (req, res) => {} }` route; `hooks.onRequest` (return `true` to short-circuit), `hooks.route(req)` (custom router), and `use` middleware chains. A JS module exports the config object or a `(helpers) => config` factory.

## Certificates: where and when

- Certificates are **not bundled**. `postinstall` and the runtime fetch them from `https://backloop.dev/pack.json` (also browsable on https://backloop.dev).
- Stored in `<package>/certs/` by default; override with the env var `BACKLOOP_DEV_CERTS_DIR` (the directory must exist).
- The private key comes split in two parts (`key1` + `key2` in `pack.json`); the package concatenates them. This is intentional — the certificate is public by design and only secures loopback traffic.
- **Offline/sandboxed environments**: `npm install` fails without network because of the postinstall script. Use `npm install --ignore-scripts` and pre-seed `BACKLOOP_DEV_CERTS_DIR` with a valid `pack.json`.
- Trust note: if you want to guard against DNS tampering, add `<name>.backloop.dev` to `/etc/hosts` pointing to `127.0.0.1`.

## Developing this package

```bash
npm install
npm test        # Node.js built-in test runner, Node 18+
npm run lint    # eslint + neostandard
```

Layout: `src/index.js|mjs|d.ts` (API), `src/check.js` (download/refresh logic), `src/webserver/` (CLI server, proxy, multi-host config), `bin/` (CLI entry points), `test/`.

See the [repository AGENTS.md](https://github.com/perki/backloop.dev/blob/main/AGENTS.md) for monorepo-wide conventions. Full documentation: [README.md](./README.md).
