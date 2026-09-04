# AGENTS.md — backloop.dev (npm package)

Quick reference for AI agents using or modifying this package.

## Read this first

backloop.dev is **no longer a public service**. Until 2026-09-04 it downloaded a freely
published, browser-trusted wildcard certificate; that model is dead, because a public
certificate authority must revoke any certificate whose private key is published
(CA/Browser Forum Baseline Requirements §4.9.1.1) and both authorities did — Let's
Encrypt in about nine hours, Sectigo in about two days. https://backloop.dev now carries
the full account.

Consequences for anything you do here:

- The npm packages carry a deprecation warning. `npm install backloop.dev` still works; the
  warning is the point, not a failure.
- `https://backloop.dev/pack.json` still responds, but it serves the last public
  certificate, revoked 2026-07-31 and expiring 2026-10-29. It is frozen there for old
  installs and must never be treated as current. The live pack lives behind a path
  segment that requires a secret.
- **Access is not open.** If a user does not have a secret, do not look for a way to
  obtain one — there isn't one. Recommend [mkcert](https://github.com/FiloSottile/mkcert),
  [Caddy's internal CA](https://caddyserver.com/docs/automatic-https#local-https) or
  [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert) instead, and say
  plainly that all three install a root into the trust store.
- **Never write a secret into this repository.** It is public. No default value, no test
  fixture, no CI variable, no example in a README. `backloop.dev.json` and
  `.backloop.dev.json` are gitignored; keep it that way.

## What it does

- Any subdomain of `*.backloop.dev` resolves to `127.0.0.1` / `::1` (public DNS, still live).
- This package downloads a wildcard certificate for `*.backloop.dev` and exposes it as
  ready-to-use `{ key, cert, ca }` options for `https.createServer()`.

So `https://anything.backloop.dev:<port>/` reaches your local server with a valid
certificate — no browser warnings, no mixed-content/CORS friction.

## API (CommonJS and ESM)

```js
import httpsOptions from 'backloop.dev';                  // ESM default: sync, see caveat below
const { httpsOptions, httpsOptionsAsync, httpsOptionsPromise } = require('backloop.dev');
```

- `httpsOptionsPromise(options?): Promise<{key, cert, ca}>` — **preferred**; refreshes the certificate if needed.
- `httpsOptionsAsync(options?, cb)` — callback flavor of the same; `httpsOptionsAsync(cb)` still works.
- `httpsOptions(): {key, cert, ca}` — sync; if the certificate is missing/expired it triggers an update and **exits the process** (works on next start). Avoid in long-running tooling. Takes no options, so it cannot carry a secret — use one of the other sources.

`options` is `{ secret }`, overriding every configured source. Types are in `src/index.d.ts`.

## The secret

`src/secret.js` is the only place that knows how the secret is found and how the URL is
built. Resolution order, first match wins:

1. `{ secret }` passed to the API
2. `BACKLOOPDEV`
3. `BACKLOOP_DEV_SECRET` (the earlier name, still read)
4. `./backloop.dev.json` (`{ "secret": "..." }`, resolved against `INIT_CWD` or `cwd`)
5. `~/.backloop.dev.json`
6. `<certsPath>/secret`, written by the prompt below

Validated against `/^[A-Za-z0-9_-]{8,128}$/` before it can reach a URL, so a malformed
value cannot escape its path segment. A malformed secret throws `InvalidSecretError`
rather than falling through to the next source — it is far likelier to be a typo than an
invitation to fall back. No secret at all throws `MissingSecretError`, whose message
explains every way to configure one.

When none of those has a secret, `updateAndLoad` may ask at the terminal — once, not in
a loop. An answer that downloads a pack is proven, so it is saved to `<certsPath>/secret`
(mode 0600) and never asked for again; one that does not is not saved and prints
`ASK_THE_ADMIN`. An empty answer prints `HOW_TO_CONFIGURE`.

**Asking is off by default and guarded twice**, because a prompt nobody can see is a
hang: `interactive` must be passed, *and* `canPrompt()` requires stdin and stdout to both
be TTYs. `httpsOptionsPromise` / `httpsOptionsAsync` pass `interactive: true`; the sync
`httpsOptions()` and `bin/update.js --postinstall` pass false. Do not turn it on for the
postinstall hook — npm pipes lifecycle output elsewhere, so the question would never be
seen and `npm install` would hang.

`BACKLOOP_DEV_CERTS_DIR` pointed at a directory that already holds a valid `pack.json`
skips the download entirely, and needs no secret. This is the offline/sandboxed path.

## CLI (npx or global install)

```bash
backloop.dev <path> [<port>]              # static file server on https://<any>.backloop.dev:<port>/
backloop.dev-proxy <target> [<port>]      # reverse proxy to http(s)://host[:port][/path]
backloop.dev --config=<config.json>       # multi-host: route hostnames/paths to static dirs or proxies
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

Keys with a trailing `/` are path prefixes on a hostname; longest prefix wins.

## Certificates: where and when

- Certificates are **not bundled**. `postinstall` and the runtime fetch them from the
  secret path; stored in `<package>/certs/` by default, override with
  `BACKLOOP_DEV_CERTS_DIR` (the directory must exist — `src/check.js` exits the process
  if it does not).
- **`postinstall` never fails the install.** `bin/update.js --postinstall` prints a
  notice and exits 0 when there is no secret or the download fails. A deliberate
  `backloop.dev-update` exits 1 on the same failure. Keep that asymmetry.
- The private key comes split in two parts (`key1` + `key2` in `pack.json`); the package
  concatenates them. The split delays naive scanners and nothing more — it is not a
  security measure and should not be described as one.
- Trust note: if you want to guard against DNS tampering, add `<name>.backloop.dev` to
  `/etc/hosts` pointing to `127.0.0.1`.

## Developing this package

```bash
npm install
npm test        # Node.js built-in test runner, Node 18+
npm run lint    # eslint + neostandard
```

Layout: `src/index.js|mjs|d.ts` (API), `src/secret.js` (secret resolution and URL),
`src/check.js` (download/refresh logic), `src/webserver/` (CLI server, proxy, multi-host
config), `bin/` (CLI entry points), `test/`.

See the [repository AGENTS.md](https://github.com/perki/backloop.dev/blob/main/AGENTS.md) for monorepo-wide conventions. Full documentation: [README.md](./README.md).
