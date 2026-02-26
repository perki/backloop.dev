const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { startFromConfig } = require('../src/webserver/config');

// Helper: build a multi-host server manually (mirrors config.js routing logic)
// so we can get a server reference for testing without process.exit issues.
async function buildTestServer (routes) {
  const { httpsOptionsPromise } = require('../src');
  const { createStaticHandler } = require('../src/webserver/main');
  const { createProxyHandler } = require('../src/webserver/proxy');

  // Parse keys into grouped routes (same logic as config.js)
  const routeMap = {};
  for (const [key, entry] of Object.entries(routes)) {
    const slashIdx = key.indexOf('/');
    let hostname, pathPrefix;
    if (slashIdx === -1) {
      hostname = key;
      pathPrefix = '/';
    } else {
      hostname = key.substring(0, slashIdx);
      pathPrefix = key.substring(slashIdx);
    }

    let handler;
    if (entry.path) {
      handler = createStaticHandler(entry.path);
    } else {
      handler = createProxyHandler(entry.proxy);
    }

    if (!routeMap[hostname]) routeMap[hostname] = [];
    routeMap[hostname].push({ pathPrefix, handler });
  }

  // Sort longest prefix first
  for (const hostname of Object.keys(routeMap)) {
    routeMap[hostname].sort(function (a, b) { return b.pathPrefix.length - a.pathPrefix.length; });
  }

  function stripPrefix (prefix, handler) {
    if (prefix === '/') return handler;
    return function (req, res) {
      req.url = req.url.slice(prefix.length - 1) || '/';
      handler(req, res);
    };
  }

  const knownHostnames = Object.keys(routeMap);
  const opts = await httpsOptionsPromise();
  const server = https.createServer(opts, function (req, res) {
    const hostHeader = req.headers.host || '';
    const hostPart = hostHeader.split(':')[0];
    const hostname = hostPart.replace(/\.backloop\.dev$/, '');

    const hostRoutes = routeMap[hostname];
    if (!hostRoutes) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n\nConfigured hostnames:\n' +
        knownHostnames.map(function (h) { return '  https://' + h + '.backloop.dev/'; }).join('\n') + '\n');
      return;
    }

    const reqPath = req.url.split('?')[0];
    for (const route of hostRoutes) {
      if (route.pathPrefix === '/' || reqPath.startsWith(route.pathPrefix) || reqPath + '/' === route.pathPrefix) {
        stripPrefix(route.pathPrefix, route.handler)(req, res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  const port = await new Promise(function (resolve) {
    server.listen(0, function () { resolve(server.address().port); });
  });

  return { server, port };
}

function fetchFrom (port, hostname, urlPath) {
  return new Promise(function (resolve, reject) {
    https.get({
      hostname: 'localhost',
      port,
      path: urlPath,
      headers: { host: hostname + '.backloop.dev:' + port },
      rejectUnauthorized: false
    }, function (res) {
      let data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    }).on('error', reject);
  });
}

describe('config multi-host server', function () {
  let tmpDir;
  let staticDir;
  let backend;
  let backendPort;
  let server;
  let port;

  before(async function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-config-test-'));
    staticDir = path.join(tmpDir, 'public');
    fs.mkdirSync(staticDir);
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<h1>Static</h1>');

    backend = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ proxied: true, path: req.url }));
    });
    await new Promise(function (resolve) {
      backend.listen(0, function () {
        backendPort = backend.address().port;
        resolve();
      });
    });

    const result = await buildTestServer({
      tom: { path: staticDir },
      joe: { proxy: `http://localhost:${backendPort}/api` }
    });
    server = result.server;
    port = result.port;
  });

  after(function () {
    server.close();
    backend.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should route to static handler based on hostname', async function () {
    const res = await fetchFrom(port, 'tom', '/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '<h1>Static</h1>');
  });

  it('should route to proxy handler based on hostname', async function () {
    const res = await fetchFrom(port, 'joe', '/users');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.proxied, true);
    assert.strictEqual(body.path, '/api/users');
  });

  it('should return 404 for unknown hostname', async function () {
    const res = await fetchFrom(port, 'unknown', '/');
    assert.strictEqual(res.statusCode, 404);
    assert.match(res.body, /Configured hostnames/);
    assert.match(res.body, /tom\.backloop\.dev/);
    assert.match(res.body, /joe\.backloop\.dev/);
  });
});

describe('config path-based routing', function () {
  let tmpDir;
  let staticDir;
  let backend;
  let backendPort;
  let server;
  let port;

  before(async function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-path-test-'));
    staticDir = path.join(tmpDir, 'static');
    fs.mkdirSync(staticDir);
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<h1>Static Root</h1>');
    fs.writeFileSync(path.join(staticDir, 'app.js'), 'console.log("app")');

    backend = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ proxied: true, path: req.url }));
    });
    await new Promise(function (resolve) {
      backend.listen(0, function () {
        backendPort = backend.address().port;
        resolve();
      });
    });

    // "tom/static/" serves files, "tom/" proxies everything else
    const result = await buildTestServer({
      'tom/static/': { path: staticDir },
      'tom/': { proxy: `http://localhost:${backendPort}` }
    });
    server = result.server;
    port = result.port;
  });

  after(function () {
    server.close();
    backend.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should match longest prefix first (static files)', async function () {
    const res = await fetchFrom(port, 'tom', '/static/index.html');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '<h1>Static Root</h1>');
  });

  it('should strip path prefix before serving static files', async function () {
    const res = await fetchFrom(port, 'tom', '/static/app.js');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'console.log("app")');
  });

  it('should serve static index.html for prefix root', async function () {
    const res = await fetchFrom(port, 'tom', '/static/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '<h1>Static Root</h1>');
  });

  it('should fall through to catch-all proxy for non-matching paths', async function () {
    const res = await fetchFrom(port, 'tom', '/api/users');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.proxied, true);
    assert.strictEqual(body.path, '/api/users');
  });

  it('should proxy root path via catch-all', async function () {
    const res = await fetchFrom(port, 'tom', '/');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.proxied, true);
    assert.strictEqual(body.path, '/');
  });

  it('should return 404 for unknown hostname with path routing', async function () {
    const res = await fetchFrom(port, 'unknown', '/');
    assert.strictEqual(res.statusCode, 404);
  });
});

describe('startFromConfig validation', function () {
  it('should export startFromConfig function', function () {
    assert.strictEqual(typeof startFromConfig, 'function');
  });
});
