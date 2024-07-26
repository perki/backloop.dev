# backloop.dev

[![npm](https://img.shields.io/npm/v/backloop.dev)](https://www.npmjs.com/package/backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Do SSL HTTPS requests on **Localhost** using a domain and SSL certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

**Exception:** `backloop.dev`, which points to a page where you can download the certificates.


## Why ?

**backloop.dev** solves [mixed-content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) issues when developing a WebApp or Backend on local environement while accessing ressources on remote HTTPS sources. 

The issue is often raised by the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin unless this can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers. 

Which anyway will fall-back on the must-have "non-mixed-content" (No HTTP & HTTPS) 

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why **backloop.dev** provides SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.

## Where are the certificates?

Certificates are not bundled with the npm package, but downloaded and updated from [backloop.dev](https://backloop.dev) at installation and runtime, or manually with `backloop.dev-update`. To specify in which directory the certificates should be stored set the environement var `BACKLOOP_DEV_CERTS_DIR`.

If the certificates are outdated they are checked and updated at boot.

## Usage

### Installation

```
npm install backloop.dev [-g]
```
Add `-g` to use `backloop.dev` and `backloop.dev-proxy` globally.

### Command line

(Don't forget to prefix commands with `npx` if not installed globally.)

Start a webserver serving the contents of a directory on `https://whatever.backloop.dev:<port>/`:

```
backloop.dev <path> [<port>]
```

Start a proxy on `https://whatever.backloop.dev:<port>/`  
Note: proxy will add `x-forwarded-proto: https` to headers. This is to support express-session and other services and advertise it was served in https. 

```
backloop.dev-proxy <target host>[:<target port>] [<port>]
```

Manually update the certificates:

```
backloop.dev-update
```

### Certificate files

You can download the certificates files on [backloop.dev](https://backloop.dev) for your own usage.

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

Or with promises.

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

The following is not recommended as it will crash your app if certificates are expired. Thus it will refresh them for your next boot ;). 

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
There is a ViteJS plugin that does the very same [vite-plugin-backloop.dev](https://www.npmjs.com/package/vite-plugin-backloop.dev).

## Security 

What if `*.backloop.dev` DNS A and AAAA entries are not pointing to `127.0.0.1` and `::1` but to another IP (malicious ones)?
Then your HTTPS requests will not end-up on your machine, but on this malicious servers. 

Even, if this is very unlikely to happend, you may want to be on the safe side by adding `<what you need>.backloop.dev` in your `/etc/hosts` file.

```
127.0.0.1 localhost whatever.backloop.dev ... 
::1 localhost whatever.backloop.dev ... 
```

## Contributing

`npm run lint` lints the code with [Semi-Standard](https://github.com/standard/semistandard).

Pull requests are welcome.

The code to generate, publish and renew the certificates is [here on github](https://github.com/perki/backloop.dev/tree/main/renew)

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
