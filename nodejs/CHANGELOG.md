# Changelog

## 3.1.0

### New features
- **Multi-host config mode**: Serve multiple hostnames from a single instance using `backloop.dev --config=<file>`. Each hostname can independently serve static files or proxy to a backend.
- **HTTPS proxy support**: Proxy can now target `https://` backends in addition to `http://`.
- **Proxy path support**: Proxy targets can include a base path (e.g. `http://localhost:3000/api`), which is prepended to all proxied requests.
- **Programmatic API**: `startServer(config)` starts a multi-host server and resolves with the `https.Server`, for embedding backloop routing in your own scripts.
- **JavaScript config files**: `--config` now accepts `.js`, `.cjs` and `.mjs` in addition to `.json`. A module may export a config object or a `(helpers) => config` factory.
- **Custom handlers**: a hostname/path entry may provide a vanilla `handler(req, res)` function instead of `path` or `proxy`.
- **Routing hooks**: `hooks.onRequest` (global pre-hook / short-circuit), `hooks.route` (fully custom router), and `use` middleware chains (global and per-route).
- **Per-route `strip`**: keep or drop the matched path prefix before forwarding (`strip: false` mirrors Caddy `handle`; the default `true` mirrors `handle_path`).
- **Per-route `redirectToSlash`**: 301-redirect a slash-less request (`/patient`) to the trailing-slash form (`/patient/`).
- **Proxy transform hooks**: `transformRequest(headers, req)` and `transformResponse(res, req)` on proxy entries.
- **Route-entry helpers**: `staticDir()`, `proxy()` and `redirect()` builders, exported from the package and injected into config factories.

### Changes
- `backloop.dev-proxy` now accepts full URL format: `backloop.dev-proxy https://host:port/path [port]` (legacy `host:port` format still supported).
- Refactored static server and proxy into reusable handler factories (`createStaticHandler`, `createProxyHandler`); routing split into a pure `router.js` dispatcher and a `server.js` entry point.
- Documented that path routing strips the matched prefix by default, and that a slash-less path still matches its prefix route.
- Added test suite using Node.js built-in test runner.

### Config file format
```json
{
  "port": 6667,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "secure": { "proxy": "https://backend:8443" }
  }
}
```

## 3.0.3
- Added `AGENTS.md` (guidance for AI coding agents), shipped with the package
- Added `files` field to package.json: tarball no longer includes `test/`, `eslint.config.js` and the example `config.json`

## 3.0.1
- Package version update

## 3.0.0
- Removed Express dependency
- Pure Node.js HTTPS server and proxy
- Added TypeScript definitions
- Added ES Module support
