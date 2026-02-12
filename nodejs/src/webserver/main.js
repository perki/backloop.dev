/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const path = require('path');
const fs = require('fs');

const { httpsOptionsPromise } = require('..');

// -- read the arguments
if (process.argv.length < 3) {
  exitWithTip('missing arguments');
}
const dirPath = path.resolve(path.normalize(process.argv[2]));
if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
  exitWithTip(`'${dirPath}' is not existing or not a directory`);
}

let port = 4443;
if (process.argv[3]) {
  port = parseInt(process.argv[3], 10);
  if ((isNaN(process.argv[3])) || (port < 1 || port > 65535)) {
    exitWithTip(`'${process.argv[3]}' is not a valid port number`);
  }
}

// -- MIME types for common web files
const MIME_TYPES = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wasm': 'application/wasm'
};

function send404 (res) {
  const custom404 = path.join(dirPath, '404.html');
  fs.readFile(custom404, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
}

// -- request handler
function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const origWriteHead = res.writeHead;
  res.writeHead = function (statusCode) {
    console.log(`${req.method} ${req.url} ${statusCode}`);
    return origWriteHead.apply(this, arguments);
  };

  // base URL is only needed for the URL constructor to parse the relative req.url
  const parsed = new URL(req.url, 'https://localhost');
  const reqPath = decodeURIComponent(parsed.pathname);
  const filePath = path.join(dirPath, reqPath);
  const resolved = path.resolve(filePath);

  // Block directory traversal
  if (!resolved.startsWith(dirPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(resolved, function (err, stats) {
    if (err) {
      send404(res);
      return;
    }

    // Serve index.html for directories
    let target = resolved;
    if (stats.isDirectory()) {
      target = path.join(resolved, 'index.html');
    }

    fs.readFile(target, function (err, data) {
      if (err) {
        send404(res);
        return;
      }
      const ext = path.extname(target).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

// -- launch server
(async () => {
  const options = await httpsOptionsPromise();
  const server = https.createServer(options, handler);
  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      exitWithTip(`port ${port} is already in use`);
    } else {
      exitWithTip(err.message);
    }
  });
  server.listen(port, function () {
    console.log(`Server started on port ${port} serving files in '${dirPath}'\n` +
      `You can open https://whatever.backloop.dev:${port}/`);
  });
})();

function exitWithTip (tip) {
  console.error(`Error: ${tip}\n` +
    `Usage: ${path.basename(process.argv[1])} <path> [<port>]`);
  process.exit(0);
}
