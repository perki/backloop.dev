# Changelog

## 3.1.0

### New features
- **Multi-host config mode**: Serve multiple hostnames from a single instance using `backloop.dev --config=<file>`. Each hostname can independently serve static files or proxy to a backend.
- **HTTPS proxy support**: Proxy can now target `https://` backends in addition to `http://`.
- **Proxy path support**: Proxy targets can include a base path (e.g. `http://localhost:3000/api`), which is prepended to all proxied requests.

### Changes
- `backloop.dev-proxy` now accepts full URL format: `backloop.dev-proxy https://host:port/path [port]` (legacy `host:port` format still supported).
- Refactored static server and proxy into reusable handler factories (`createStaticHandler`, `createProxyHandler`).
- Added test suite using Node.js built-in test runner (24 tests).

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

## 3.0.1
- Package version update

## 3.0.0
- Removed Express dependency
- Pure Node.js HTTPS server and proxy
- Added TypeScript definitions
- Added ES Module support
