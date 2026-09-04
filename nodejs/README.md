# backloop.dev

[![npm](https://img.shields.io/npm/v/backloop.dev)](https://www.npmjs.com/package/backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using a domain and SSL certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

> ## No longer a public service
>
> Until 2026-09-04 this package downloaded a browser-trusted wildcard certificate that
> <https://backloop.dev> published openly. That is over. A public certificate authority
> is obliged to revoke any certificate whose private key is published — CA/Browser Forum
> Baseline Requirements §4.9.1.1 — and both authorities did: Let's Encrypt within about
> nine hours, then Sectigo within about two days. <https://backloop.dev> tells the whole
> story.
>
> The project continues as a private setup used by its author. The package still works,
> but the certificate now lives behind a path you need a secret to reach, and **access
> is not open** — there is no way to request a secret.
>
> **If you came here for HTTPS on localhost**, use a local certificate authority
> instead: [mkcert](https://github.com/FiloSottile/mkcert),
> [Caddy's internal CA](https://caddyserver.com/docs/automatic-https#local-https), or
> [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert). All of them
> install a root certificate into your trust store, which is the trade-off backloop.dev
> existed to avoid — and the only trade-off a public authority is not obliged to break.

## Why it exists

**backloop.dev** solves [mixed-content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) issues when developing a WebApp or Backend on local environment while accessing resources on remote HTTPS sources.

The issue is often raised by the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin unless this can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers.

Which anyway will fall back on the must-have "non-mixed-content" (no HTTP & HTTPS).

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why **backloop.dev** provides SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.

## Installation

```
npm install backloop.dev [-g]
```

The package is published with a deprecation warning: npm will tell you on install that
this is no longer a public service. That is deliberate, and the package works.

Add `-g`, or use `npx`, for the `backloop.dev`, `backloop.dev-proxy` and
`backloop.dev-update` commands.

## Where are the certificates?

Certificates are not bundled with the package. They are downloaded at installation
(postinstall) and refreshed at runtime when close to expiry, or manually with
`backloop.dev-update`. `BACKLOOP_DEV_CERTS_DIR` chooses where they are stored; the
directory must already exist.

They are no longer published at a public URL. Downloading them needs a secret, which
becomes a path segment on the download URL.

### Configuring the secret

Provide it in any one of these ways. The first one that is set wins:

| | How |
|---|---|
| 1 | `httpsOptionsPromise({ secret })` or `httpsOptionsAsync({ secret }, done)` — in code |
| 2 | `BACKLOOP_DEV_SECRET=<secret>` — environment variable, works in CI and at postinstall |
| 3 | `./backloop.dev.json` in your project root — `{ "secret": "<secret>" }` |
| 4 | `~/.backloop.dev.json` — one secret for every local project |

A secret is 8 to 128 characters of `A-Z`, `a-z`, `0-9`, `_` and `-`. A malformed one is
reported rather than skipped, because it is far likelier to be a typo than an
invitation to fall back to the next source.

**Never commit a secret.** Add `backloop.dev.json` to your `.gitignore`; a secret in a
public repository, a CI log or a pasted stack trace is a secret that is gone.

Without a secret, installation still succeeds: the postinstall step prints a notice and
exits cleanly. It is only at runtime, where a missing certificate cannot be worked
around, that the package fails.

### Skipping the download entirely

If you already hold the certificate files, point `BACKLOOP_DEV_CERTS_DIR` at a
directory containing a valid `pack.json` and no secret is needed at all. This is also
how to install in an offline or sandboxed environment:

```bash
npm install --ignore-scripts backloop.dev
export BACKLOOP_DEV_CERTS_DIR=/path/to/certs
```

## Command line

(Don't forget to prefix commands with `npx` if not installed globally.)

### Static file server

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

### Reverse proxy

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

### Multi-host config mode

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

Here `https://tom.backloop.dev:7654/static/app.js` serves `./public/app.js`, while `https://tom.backloop.dev:7654/api/users` proxies to `http://localhost:3000/api/users`. The longest matching prefix wins.

### Certificate update

Manually force update of the certificates:

```
backloop.dev-update
```

Unlike the postinstall step, this fails loudly when there is no secret or the download
does not work — you asked for it deliberately, so a silent success would be a lie.

## From a node app

### ES6 Module

```js
import httpsOptions from 'backloop.dev';
import https from 'https';

https.createServer(httpsOptions, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);

```

### CommonJS

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

Both take an optional options object to pass the secret directly, overriding every
configured source:

```js
const httpsOptions = await httpsOptionsPromise({ secret: process.env.MY_OWN_VAR });

httpsOptionsAsync({ secret: process.env.MY_OWN_VAR }, function (err, httpsOptions) { /* ... */ });
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

### Express

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

### VueJs

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

### ViteJs

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
There is also a ViteJS plugin that does the same: [vite-plugin-backloop.dev](../vitejs).

## Security

What if `*.backloop.dev` DNS A and AAAA entries are not pointing to `127.0.0.1` and `::1` but to another IP (malicious ones)?
Then your HTTPS requests will not end up on your machine, but on these malicious servers.

Even if this is very unlikely to happen, you may want to be on the safe side by adding `<what you need>.backloop.dev` in your `/etc/hosts` file.

```
127.0.0.1 localhost whatever.backloop.dev ...
::1 localhost whatever.backloop.dev ...
```

Note also that the secret only keeps the certificate from being *discovered*. It does
not make the certificate private: everyone holding a secret holds the same key, and a
certificate authority that learns of it must still revoke. Expect rotation, and expect
the certificate to be replaced without notice.

## Testing

```
npm test
```

Uses Node.js built-in test runner (requires Node.js 18+).

## Contributing

`npm run lint` lints the code with [neostandard](https://github.com/neostandard/neostandard).

Pull requests are welcome.

The code that used to generate, publish and renew the certificates is
[in `renew/`](https://github.com/perki/backloop.dev/tree/main/renew). It can no longer
complete: Let's Encrypt has blocklisted the domain.

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
