# backloop.dev

[![npm](https://img.shields.io/npm/v/backloop.dev)](https://www.npmjs.com/package/backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using a domain and SSL certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

**Exception:** `backloop.dev`, which points to a page where you can download the certificates.


## Why?

**backloop.dev** solves [mixed-content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) issues when developing a WebApp or Backend on local environment while accessing resources on remote HTTPS sources.

The issue is often raised by the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin unless this can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers.

Which anyway will fall back on the must-have "non-mixed-content" (no HTTP & HTTPS).

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why **backloop.dev** provides SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.

## Where are the certificates?

Certificates are not bundled with the npm package, but downloaded and updated from [backloop.dev](https://backloop.dev) at installation and runtime, or manually with `backloop.dev-update`. To specify in which directory the certificates should be stored, set the environment variable `BACKLOOP_DEV_CERTS_DIR`.

If the certificates are outdated, they are checked and updated at boot.

## Usage

### Installation

```
npm install backloop.dev [-g]
```
Add `-g` to use `backloop.dev` and `backloop.dev-proxy` globally.

### Command line

(Don't forget to prefix commands with `npx` if not installed globally.)

#### Static file server

Serve the contents of a directory on `https://whatever.backloop.dev:<port>/`:

```
backloop.dev <path> [<port>]
```

Example:
```bash
backloop.dev ./dist 4443
# Server started on port 4443 serving files in './dist'
# Open https://myapp.backloop.dev:4443/
```

#### Reverse proxy

Proxy requests from `https://whatever.backloop.dev:<port>/` to a backend.
Supports `http://` and `https://` targets, with optional base path.
Note: adds `x-forwarded-proto: https` to headers for express-session and similar services.

```
backloop.dev-proxy <target> [<port>]
```

Where `<target>` can be:
- `http://host[:port][/path]`
- `https://host[:port][/path]`
- `host[:port]` (legacy format, defaults to http)

Examples:
```bash
# Proxy to a local dev server
backloop.dev-proxy localhost:3000

# Proxy to an https backend with a base path
backloop.dev-proxy https://localhost:8443/api 4443
```

#### Multi-host config mode

Serve multiple hostnames from a single instance, each with its own static files or proxy target:

```
backloop.dev --config=<config.json>
```

Config file format:
```json
{
  "port": 7654,
  "hostnames": {
    "app": { "path": "./dist" },
    "api": { "proxy": "http://localhost:3000/v1" },
    "admin": { "proxy": "https://anotherwebsite.com:8443" }
  }
}
```

This starts a single server on port 7654 where:
- `https://app.backloop.dev:7654/` serves static files from `./dist`
- `https://api.backloop.dev:7654/` proxies to `http://localhost:3000/v1`
- `https://admin.backloop.dev:7654/` proxies to `https://anotherwebsite.com:8443`

Paths are resolved relative to the config file location.

**Path-based routing** is also supported. Use `hostname/path/` keys (trailing slash required) to route different URL prefixes to different handlers on the same hostname:

```json
{
  "port": 7654,
  "hostnames": {
    "tom/static/": { "path": "./public" },
    "tom/": { "proxy": "http://localhost:3000" }
  }
}
```

Here `https://tom.backloop.dev:7654/static/app.js` serves `./public/app.js`, while `https://tom.backloop.dev:7654/api/users` proxies to `http://localhost:3000/api/users`.

Routing rules:
- **Longest matching prefix wins**; `hostname/` (or the bare `hostname`) is the catch-all.
- **The matched prefix is stripped by default** before the request reaches the handler — `/static/app.js` is served as `/app.js`. Set `"strip": false` to forward the full path (see below).
- A **slash-less** request matches its prefix route: `/static` reaches the `tom/static/` route rather than falling through to the catch-all.
- Subdomain hostnames (`app`, `api`) and path hostnames (`tom/...`) can coexist in one config.

##### Per-route options

Each route entry accepts:

| Option | Applies to | Default | Effect |
|---|---|---|---|
| `strip` | path routes | `true` | `true` removes the matched prefix before forwarding (like Caddy `handle_path`); `false` keeps it (like Caddy `handle`). |
| `redirectToSlash` | path routes | `false` | `true` issues a `301` from the slash-less form (`/admin`) to the trailing-slash form (`/admin/`). |
| `transformRequest` | proxy routes | — | `(headers, req) => headers?` — mutate or replace the outgoing proxy headers. |
| `transformResponse` | proxy routes | — | `(res, req) => void` — inspect/mutate the upstream response before it is piped back. |

```json
{
  "port": 7654,
  "hostnames": {
    "rhi/admin/":   { "proxy": "https://localhost:7610", "strip": false },
    "rhi/patient/": { "proxy": "https://localhost:5620", "redirectToSlash": true },
    "rhi/":         { "proxy": "https://localhost:5640" }
  }
}
```

This mirrors a single-origin, path-routed edge (Caddy, nginx, an ingress) locally, so same-origin `fetch`, cookies and same-origin links behave as they do in production — with backloop's HTTPS certs and no second proxy.

#### JavaScript config and custom routing

`--config` also accepts `.js`, `.cjs` and `.mjs` files. Because JavaScript can hold functions, this unlocks custom handlers and hooks that JSON cannot express. A module exports a config object, or a `(helpers) => config` factory that receives the `staticDir`, `proxy` and `redirect` builders:

```js
// backloop.config.js
module.exports = ({ staticDir, proxy, redirect }) => ({
  port: 7655,
  hooks: {
    // Global pre-hook: return true to signal the response was fully handled.
    onRequest (req, res) {
      if (req.url === '/health') { res.end('ok'); return true; }
    },
    // Custom router: return a handler to bypass the table, or null to fall through.
    route (req) {
      if (req.headers['x-tenant']) return proxy(`https://localhost:${tenantPort(req)}`).handler;
      return null;
    }
  },
  hostnames: {
    'app':          staticDir('./dist'),
    'rhi/admin/':   proxy('https://localhost:7610', { strip: false }),
    'rhi/old/':     redirect('https://localhost:7610/new'),
    'rhi/':         { handler: (req, res) => { res.writeHead(200); res.end('custom'); } }
  }
});
```

A route entry may provide a vanilla `handler(req, res)` instead of `path` or `proxy`. Hooks are optional:
- `hooks.onRequest(req, res)` runs before matching; return `true` when it has answered the request.
- `hooks.route(req)` returns a handler to fully override the built-in routing, or `null`/`undefined` to fall through to the table.
- `use` is a middleware chain of `(req, res, next)` functions, accepted both globally (`hooks.use`) and per route (`entry.use`).

#### Programmatic multi-host server

The same engine is available as an API. `startServer(config)` resolves with the `https.Server` once it is listening:

```js
const { startServer, staticDir, proxy } = require('backloop.dev');

const server = await startServer({
  port: 7655,
  hostnames: {
    app:          staticDir('./dist'),
    'rhi/admin/': proxy('https://localhost:7610', { strip: false }),
    'rhi/':       proxy('https://localhost:5640')
  }
});
// server.address().port, server.close(), ...
```

`config` fields: `port` (default `4443`; `0` picks a free port), `hostnames`, `hooks`, `baseDir` (for relative static paths, default cwd), `httpsOptions` (reuse pre-loaded certs), and `silent` (suppress the startup banner).

#### Certificate update

Manually force update of the certificates:

```
backloop.dev-update
```

### Certificate files

You can download the certificate files on [backloop.dev](https://backloop.dev) for your own usage.

### From a node app

#### ES6 Module

```js
import httpsOptions from 'backloop.dev';
import https from 'https';

https.createServer(httpsOptions, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);

```

#### CommonJS

```js
const https = require('https');
const httpsOptionsAsync = require('backloop.dev').httpsOptionsAsync;

httpsOptionsAsync(function (err, httpsOptions) {
  https.createServer(httpsOptions, (req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(8443);
});
```

Or with promises:

```js
const https = require('https');
const httpsOptionsPromise = require('backloop.dev').httpsOptionsPromise;

(async () => {

  const httpsOptions = await httpsOptionsPromise();
  https.createServer(httpsOptions, (req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(8443);

})();
```

The following is not recommended as it will crash your app if the certificates are expired. It will however refresh them for your next boot ;).

```js
const https = require('https');
const options = require('backloop.dev').httpsOptions();

https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);
```

#### Express

```js
const https = require('https');
const httpsOptionsAsync = require('backloop.dev').httpsOptionsAsync;
const express = require('express');
const app = express();

// ...your code...

httpsOptionsAsync(function (err, httpsOptions) {
  https.createServer(httpsOptions, app).listen(8443);
});
```

#### VueJs

```js
// consider  `await require('backloop.dev').httpsOptionsPromise()`
const backloopHttpsOptions = require('backloop.dev').httpsOptions();
backloopHttpsOptions.https = true;
backloopHttpsOptions.host = 'whatever.backloop.dev';

module.exports = {
  // ...your options...
  devServer: backloopHttpsOptions
};
```

Now `vue-cli-service serve` will be served on `https://whatever.backloop.dev`

#### ViteJs

File: `vite.config.js`

```js
import { defineConfig } from 'vite';
import backloopHttpsOptions from 'backloop.dev';

export default defineConfig({
  server: {
    port: 4443,
    host: 'whatever.backloop.dev',
    https: backloopHttpsOptions
  },
  // ... //
});
```

Now `npm run dev` will be served on `https://whatever.backloop.dev`
There is also a ViteJS plugin that does the same: [vite-plugin-backloop.dev](https://www.npmjs.com/package/vite-plugin-backloop.dev).

## Security

What if `*.backloop.dev` DNS A and AAAA entries are not pointing to `127.0.0.1` and `::1` but to another IP (malicious ones)?
Then your HTTPS requests will not end up on your machine, but on these malicious servers.

Even if this is very unlikely to happen, you may want to be on the safe side by adding `<what you need>.backloop.dev` in your `/etc/hosts` file.

```
127.0.0.1 localhost whatever.backloop.dev ...
::1 localhost whatever.backloop.dev ...
```

## Testing

```
npm test
```

Uses Node.js built-in test runner (requires Node.js 18+).

## Contributing

`npm run lint` lints the code with [neostandard](https://github.com/neostandard/neostandard).

Pull requests are welcome.

The code to generate, publish and renew the certificates is [here on github](https://github.com/perki/backloop.dev/tree/main/renew)

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
