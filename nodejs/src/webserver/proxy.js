/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const http = require('http');
const path = require('path');

/**
 * Parse a target string into { protocol, hostname, port, basePath }
 * Accepts:
 *   - Full URL: https://host:port/path or http://host:port/path
 *   - Legacy:   host:port (defaults to http, path /)
 *   - Legacy:   host (defaults to http, port 80, path /)
 */
function parseTarget (target) {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    const parsed = new URL(target);
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      basePath: parsed.pathname.replace(/\/$/, '') // strip trailing slash
    };
  }
  // legacy format: host[:port]
  const parts = target.split(':');
  const hostname = parts[0];
  const port = parts[1] || 80;
  return { protocol: 'http', hostname, port, basePath: '' };
}

/**
 * Create a proxy request handler for the given target URL string.
 * @param {string} targetUrl - e.g. "http://localhost:3000/api" or "localhost:3000"
 * @returns {function} (req, res) request handler
 */
function createProxyHandler (targetUrl) {
  const target = parseTarget(targetUrl);
  const requestFn = target.protocol === 'https' ? https.request : http.request;

  return function onRequest (clientReq, clientRes) {
    console.log('serve: ' + clientReq.url);

    function writeError (str) {
      clientRes.statusCode = 500;
      clientRes.write(str);
      clientRes.end();
      console.log('failed: ' + clientReq.url + ' > ' + str);
    }

    // adding forward proto for express-session or other services
    // replace host header with target hostname so remote servers respond correctly
    const newHeaders = Object.assign({ 'x-forwarded-proto': 'https' }, clientReq.headers, {
      host: target.hostname + (target.port === 80 || target.port === 443 ? '' : ':' + target.port)
    });

    try {
      const options = {
        hostname: target.hostname,
        port: target.port,
        path: target.basePath + clientReq.url,
        method: clientReq.method,
        headers: newHeaders,
        rejectUnauthorized: false
      };

      const proxy = requestFn(options, function (res) {
        clientRes.writeHead(res.statusCode, res.headers);
        res.pipe(clientRes, { end: true });
      });

      proxy.on('error', function (e) {
        writeError(e.message);
      });

      proxy.on('timeout', function () {
        writeError('timeout');
      });

      clientReq.pipe(proxy, { end: true });
    } catch (e) {
      writeError(e.message);
    }
  };
}

module.exports = { createProxyHandler, parseTarget };

// -- CLI entry point
function runCLI () {
  const httpsOptionsAsync = require('..').httpsOptionsAsync;

  if (process.argv.length < 3) {
    exitWithTip('missing arguments');
  }

  let port = 4443;
  if (process.argv[3]) {
    port = parseInt(process.argv[3], 10);
    if (isNaN(port) || (port < 1 || port > 65535)) {
      exitWithTip(`'${process.argv[3]}' is not a valid port number`);
    }
  }

  const targetArg = process.argv[2];
  const target = parseTarget(targetArg);
  if (isNaN(target.port) || (target.port < 1 || target.port > 65535)) {
    exitWithTip(`'${target.port}' is not a valid port number`);
  }

  const targetDisplay = `${target.protocol}://${target.hostname}:${target.port}${target.basePath}`;

  httpsOptionsAsync(function (err, httpsOptions) {
    if (err) { console.error(err); return; }
    https.createServer(httpsOptions, createProxyHandler(targetArg)).listen(port);
    console.log(`Proxy started on port ${port} serving ${targetDisplay}\n` +
      `You can open https://whatever.backloop.dev:${port}/`);
  });
}

module.exports.runCLI = runCLI;

function exitWithTip (tip) {
  console.error(`Error: ${tip}\n` +
    `Usage: ${path.basename(process.argv[1])} <target> [<port>]\n` +
    '  target: http://host[:port][/path] or https://host[:port][/path] or host[:port]');
  process.exit(0);
}
