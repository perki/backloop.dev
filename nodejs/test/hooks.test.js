const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const https = require('https');
const http = require('http');
const { startServer } = require('../src/webserver/server');
const { httpsOptionsPromise } = require('../src');

function fetchFrom (port, hostname, urlPath, headers) {
  return new Promise(function (resolve, reject) {
    https.get({
      hostname: 'localhost',
      port,
      path: urlPath,
      headers: Object.assign({ host: hostname + '.backloop.dev:' + port }, headers || {}),
      rejectUnauthorized: false
    }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () { resolve({ statusCode: res.statusCode, headers: res.headers, body: data }); });
    }).on('error', reject);
  });
}

describe('server hooks and routing options', function () {
  let backend;
  let backendPort;
  let httpsOptions;
  let server;
  let port;

  before(async function () {
    httpsOptions = await httpsOptionsPromise();

    backend = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: req.url }));
    });
    await new Promise(function (resolve) { backend.listen(0, function () { backendPort = backend.address().port; resolve(); }); });

    server = await startServer({
      port: 0,
      silent: true,
      httpsOptions,
      hooks: {
        onRequest: function (req, res) {
          if (req.url === '/health') { res.writeHead(200); res.end('ok'); return true; }
        },
        route: function (req) {
          if ((req.headers.host || '').startsWith('custom.')) {
            return function (req, res) { res.writeHead(200); res.end('custom-routed'); };
          }
          return null;
        }
      },
      hostnames: {
        app: { handler: function (req, res) { res.writeHead(200); res.end('handler:' + req.url); } },
        'rhi/admin/': { proxy: `http://localhost:${backendPort}`, strip: false },
        'rhi/patient/': { proxy: `http://localhost:${backendPort}`, redirectToSlash: true },
        'rhi/': { proxy: `http://localhost:${backendPort}` }
      }
    });
    port = server.address().port;
  });

  after(function () {
    server.close();
    backend.close();
  });

  it('runs the onRequest hook and short-circuits', async function () {
    const res = await fetchFrom(port, 'app', '/health');
    assert.strictEqual(res.body, 'ok');
  });

  it('uses the custom route hook to override matching', async function () {
    const res = await fetchFrom(port, 'custom', '/anything');
    assert.strictEqual(res.body, 'custom-routed');
  });

  it('serves a vanilla js handler route', async function () {
    const res = await fetchFrom(port, 'app', '/x');
    assert.strictEqual(res.body, 'handler:/x');
  });

  it('keeps the prefix when strip is false', async function () {
    const res = await fetchFrom(port, 'rhi', '/admin/thing');
    assert.strictEqual(JSON.parse(res.body).path, '/admin/thing');
  });

  it('strips the prefix by default', async function () {
    const res = await fetchFrom(port, 'rhi', '/patient/42');
    assert.strictEqual(JSON.parse(res.body).path, '/42');
  });

  it('redirects a slash-less path when redirectToSlash is set', async function () {
    const res = await fetchFrom(port, 'rhi', '/patient');
    assert.strictEqual(res.statusCode, 301);
    assert.strictEqual(res.headers.location, '/patient/');
  });

  it('preserves the query string on a redirectToSlash redirect', async function () {
    const res = await fetchFrom(port, 'rhi', '/patient?a=1');
    assert.strictEqual(res.statusCode, 301);
    assert.strictEqual(res.headers.location, '/patient/?a=1');
  });

  it('falls through to the catch-all proxy', async function () {
    const res = await fetchFrom(port, 'rhi', '/other');
    assert.strictEqual(JSON.parse(res.body).path, '/other');
  });
});
