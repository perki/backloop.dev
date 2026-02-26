const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createStaticHandler } = require('../src/webserver/main');
const { httpsOptionsPromise } = require('../src');

describe('createStaticHandler', function () {
  let server;
  let port;
  let tmpDir;

  before(async function () {
    // Create temp directory with test files
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-test-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<h1>Home</h1>');
    fs.writeFileSync(path.join(tmpDir, 'style.css'), 'body { color: red; }');
    fs.writeFileSync(path.join(tmpDir, 'data.json'), '{"ok":true}');
    fs.writeFileSync(path.join(tmpDir, '404.html'), '<h1>Custom 404</h1>');
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'index.html'), '<h1>Sub</h1>');

    const handler = createStaticHandler(tmpDir);
    const opts = await httpsOptionsPromise();
    server = https.createServer(opts, handler);
    await new Promise(function (resolve) {
      server.listen(0, function () {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(function () {
    server.close();
    fs.rmSync(tmpDir, { recursive: true });
  });

  function fetch (urlPath) {
    return new Promise(function (resolve, reject) {
      https.get({
        hostname: 'localhost',
        port,
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

  it('should serve index.html for root path', async function () {
    const res = await fetch('/');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.strictEqual(res.body, '<h1>Home</h1>');
  });

  it('should serve CSS with correct MIME type', async function () {
    const res = await fetch('/style.css');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/css/);
  });

  it('should serve JSON with correct MIME type', async function () {
    const res = await fetch('/data.json');
    assert.strictEqual(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
    assert.strictEqual(res.body, '{"ok":true}');
  });

  it('should serve subdirectory index.html', async function () {
    const res = await fetch('/sub/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, '<h1>Sub</h1>');
  });

  it('should return custom 404 for missing files', async function () {
    const res = await fetch('/nonexistent.txt');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body, '<h1>Custom 404</h1>');
  });

  it('should block directory traversal', async function () {
    // path.join normalizes /../.. so the traversal doesn't escape the dir
    // The handler returns 403 if resolved path escapes dirPath, otherwise 404
    const res = await fetch('/../../../etc/passwd');
    assert.ok(res.statusCode === 403 || res.statusCode === 404);
  });

  it('should set CORS header', async function () {
    const res = await fetch('/index.html');
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
  });

  it('should handle URL-encoded paths', async function () {
    fs.writeFileSync(path.join(tmpDir, 'hello world.txt'), 'hi');
    const res = await fetch('/hello%20world.txt');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body, 'hi');
  });
});
