# backloop.dev

[![npm](https://img.shields.io/npm/v/backloop.dev)](https://www.npmjs.com/package/backloop.dev) [![License](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Loopback domain and SSL certificates:

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

**Exception:** `backloop.dev`, which points to a page where you can download the certificates.


## Why ?

To locally develop web applications that intensively use AJAX REST requests and need localhost https (SSL).

Browsers enforce the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin. This can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers.

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why backloop.dev provides an SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.


## Update: where are the certificates?

Certificates are not bundled with the npm package, but downloaded and updated from [backloop.dev](https://backloop.dev) at installation and runtime, or manually with `backloop.dev-update`.

Note: If the certificates are outdated and loaded synchronously with  `require('backloop.dev').httpsOptions()` (see usage below), they will be updated and the service stopped, so it can be rebooted manually.


## Usage

### Installation

```
npm install backloop.dev
```

### Command line

(Don't forget to prefix commands with `npx` if not installed globally.)

Start a webserver serving the contents of a directory on `https://l.backloop.dev:<port>/`:

```
backloop.dev <path> [<port>]
```

Start a proxy on `https://l.backloop.dev:<port>/`:

```
backloop.dev-proxy <target host>[:<target port>] [<port>]
```

Manually update the certificates:

```
backloop.dev-update
```

To specify in which directory the certificates are store set the environement var `BACKLOOP_DEV_CERTS_DIR`.

### Certificate files

You can also directly use the certificates files on [backloop.dev](https://backloop.dev):

### From a node app

#### Pure Node.js

```js
const https = require('https');
const options = require('backloop.dev').httpsOptions();

https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
}).listen(8443);
```

Or (check and update before):

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

#### Vue.js

Enable local HTTPS for development:

```js
const recLaOptions = require('backloop.dev').httpsOptions();
recLaOptions.https = true;
recLaOptions.host = 'l.backloop.dev';

module.exports = {
  // ...your options...
  devServer: recLaOptions
};
```

Now `vue-cli-service serve` will be served on `https://l.backloop.dev`


## Contributing

`npm run start` starts the webserver (see `backloop.dev` CLI command above)

`npm run proxy` starts the proxy (see `backloop.dev-proxy` CLI command above)

`npm run lint` lints the code with [Semi-Standard](https://github.com/standard/semistandard).

Pull requests are welcome.


## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
