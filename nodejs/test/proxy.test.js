const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const https = require('https');
const { createProxyHandler, parseTarget } = require('../src/webserver/proxy');
const { httpsOptionsPromise } = require('../src');

// -- parseTarget tests

describe('parseTarget', function () {
  it('should parse legacy host:port format', function () {
    const result = parseTarget('localhost:3000');
    assert.strictEqual(result.protocol, 'http');
    assert.strictEqual(result.hostname, 'localhost');
    assert.strictEqual(result.port, '3000');
    assert.strictEqual(result.basePath, '');
  });

  it('should parse legacy host-only format with default port', function () {
    const result = parseTarget('localhost');
    assert.strictEqual(result.protocol, 'http');
    assert.strictEqual(result.hostname, 'localhost');
    assert.strictEqual(result.port, 80);
    assert.strictEqual(result.basePath, '');
  });

  it('should parse http:// URL', function () {
    const result = parseTarget('http://myhost:8080/api');
    assert.strictEqual(result.protocol, 'http');
    assert.strictEqual(result.hostname, 'myhost');
    assert.strictEqual(result.port, '8080');
    assert.strictEqual(result.basePath, '/api');
  });

  it('should parse https:// URL', function () {
    const result = parseTarget('https://secure.host:9443/v2');
    assert.strictEqual(result.protocol, 'https');
    assert.strictEqual(result.hostname, 'secure.host');
    assert.strictEqual(result.port, '9443');
    assert.strictEqual(result.basePath, '/v2');
  });

  it('should default http port to 80', function () {
    const result = parseTarget('http://myhost/path');
    assert.strictEqual(result.port, 80);
  });

  it('should default https port to 443', function () {
    const result = parseTarget('https://myhost/path');
    assert.strictEqual(result.port, 443);
  });

  it('should strip trailing slash from basePath', function () {
    const result = parseTarget('http://localhost:3000/');
    assert.strictEqual(result.basePath, '');
  });

  it('should handle nested paths', function () {
    const result = parseTarget('http://localhost:3000/api/v1');
    assert.strictEqual(result.basePath, '/api/v1');
  });
});

// -- createProxyHandler integration tests (http backend)

describe('createProxyHandler with http backend', function () {
  let backend;
  let backendPort;
  let proxyServer;
  let proxyPort;

  before(async function () {
    // Start a simple http backend
    backend = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: req.url, method: req.method }));
    });
    await new Promise(function (resolve) {
      backend.listen(0, function () {
        backendPort = backend.address().port;
        resolve();
      });
    });

    // Start proxy in front of it
    const handler = createProxyHandler(`http://localhost:${backendPort}/base`);
    const opts = await httpsOptionsPromise();
    proxyServer = https.createServer(opts, handler);
    await new Promise(function (resolve) {
      proxyServer.listen(0, function () {
        proxyPort = proxyServer.address().port;
        resolve();
      });
    });
  });

  after(function () {
    proxyServer.close();
    backend.close();
  });

  function fetch (urlPath) {
    return new Promise(function (resolve, reject) {
      https.get({
        hostname: 'localhost',
        port: proxyPort,
        path: urlPath,
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

  it('should proxy requests to backend', async function () {
    const res = await fetch('/hello');
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.method, 'GET');
  });

  it('should prepend basePath to proxied URL', async function () {
    const res = await fetch('/hello?q=1');
    const body = JSON.parse(res.body);
    assert.strictEqual(body.path, '/base/hello?q=1');
  });

  it('should proxy root path', async function () {
    const res = await fetch('/');
    const body = JSON.parse(res.body);
    assert.strictEqual(body.path, '/base/');
  });
});

// -- createProxyHandler with https backend

describe('createProxyHandler with https backend', function () {
  let backend;
  let backendPort;
  let proxyServer;
  let proxyPort;

  before(async function () {
    const opts = await httpsOptionsPromise();

    // Start an https backend
    backend = https.createServer(opts, function (req, res) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ path: req.url, secure: true }));
    });
    await new Promise(function (resolve) {
      backend.listen(0, function () {
        backendPort = backend.address().port;
        resolve();
      });
    });

    // Proxy targeting https backend
    const handler = createProxyHandler(`https://localhost:${backendPort}`);
    proxyServer = https.createServer(opts, handler);
    await new Promise(function (resolve) {
      proxyServer.listen(0, function () {
        proxyPort = proxyServer.address().port;
        resolve();
      });
    });
  });

  after(function () {
    proxyServer.close();
    backend.close();
  });

  it('should proxy to https backend', async function () {
    const res = await new Promise(function (resolve, reject) {
      https.get({
        hostname: 'localhost',
        port: proxyPort,
        path: '/test',
        rejectUnauthorized: false
      }, function (res) {
        let data = '';
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function () {
          resolve({ statusCode: res.statusCode, body: data });
        });
      }).on('error', reject);
    });
    assert.strictEqual(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.strictEqual(body.secure, true);
    assert.strictEqual(body.path, '/test');
  });
});
