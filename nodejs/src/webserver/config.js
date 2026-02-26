/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const path = require('path');
const fs = require('fs');

const { httpsOptionsPromise } = require('..');
const { createStaticHandler } = require('./main');
const { createProxyHandler } = require('./proxy');

/**
 * Load and start the multi-host server from a config file.
 * @param {string} configPath - Path to the JSON config file
 */
async function startFromConfig (configPath) {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: config file not found: ${resolvedPath}`);
    process.exit(1);
  }

  let config;
  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    config = JSON.parse(content);
  } catch (e) {
    console.error(`Error: failed to parse config file: ${e.message}`);
    process.exit(1);
  }

  // Validate config
  if (!config.hostnames || typeof config.hostnames !== 'object') {
    console.error('Error: config file must contain a "hostnames" object');
    process.exit(1);
  }

  const port = config.port || 4443;
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`Error: '${config.port}' is not a valid port number`);
    process.exit(1);
  }

  // Build routing map: hostname -> [ { pathPrefix, handler, type, target } ]
  // Keys can be "hostname" (same as "hostname/") or "hostname/path/"
  const routes = {};
  const configDir = path.dirname(resolvedPath);
  const routeDisplayLines = [];

  for (const [key, entry] of Object.entries(config.hostnames)) {
    // Split key into hostname and pathPrefix
    const slashIdx = key.indexOf('/');
    let hostname, pathPrefix;
    if (slashIdx === -1) {
      hostname = key;
      pathPrefix = '/';
    } else {
      hostname = key.substring(0, slashIdx);
      pathPrefix = key.substring(slashIdx);
      // Enforce trailing slash
      if (!pathPrefix.endsWith('/')) {
        console.error(`Error: path prefix for '${key}' must end with '/' (got '${pathPrefix}')`);
        process.exit(1);
      }
    }

    let handler, type, target;
    if (entry.path) {
      const dirPath = path.resolve(configDir, entry.path);
      if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
        console.error(`Error: '${dirPath}' (for '${key}') is not existing or not a directory`);
        process.exit(1);
      }
      handler = createStaticHandler(dirPath);
      type = 'static';
      target = dirPath;
    } else if (entry.proxy) {
      handler = createProxyHandler(entry.proxy);
      type = 'proxy';
      target = entry.proxy;
    } else {
      console.error(`Error: '${key}' must have either "path" or "proxy" property`);
      process.exit(1);
    }

    if (!routes[hostname]) routes[hostname] = [];
    routes[hostname].push({ pathPrefix, handler, type, target });
  }

  // Sort each hostname's routes by pathPrefix length descending (longest first)
  for (const hostname of Object.keys(routes)) {
    routes[hostname].sort(function (a, b) { return b.pathPrefix.length - a.pathPrefix.length; });
    for (const r of routes[hostname]) {
      const label = r.type === 'static' ? `files in '${r.target}'` : `proxy to ${r.target}`;
      routeDisplayLines.push(`  https://${hostname}.backloop.dev:${port}${r.pathPrefix} -> ${label}`);
    }
  }

  const knownHostnames = Object.keys(routes);
  if (knownHostnames.length === 0) {
    console.error('Error: no hostnames configured');
    process.exit(1);
  }

  // Strip pathPrefix from req.url before passing to handler
  function stripPrefix (prefix, handler) {
    if (prefix === '/') return handler;
    return function (req, res) {
      req.url = req.url.slice(prefix.length - 1) || '/';
      handler(req, res);
    };
  }

  // Start the server
  const options = await httpsOptionsPromise();
  const server = https.createServer(options, function (req, res) {
    // Extract hostname from Host header: "tom.backloop.dev:6667" -> "tom"
    const hostHeader = req.headers.host || '';
    const hostPart = hostHeader.split(':')[0]; // remove port
    const hostname = hostPart.replace(/\.backloop\.dev$/, '');

    const hostRoutes = routes[hostname];
    if (!hostRoutes) {
      console.log(`${req.method} ${hostHeader}${req.url} 404 (unknown host)`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n\nConfigured hostnames:\n' +
        knownHostnames.map(h => `  https://${h}.backloop.dev:${port}/`).join('\n') + '\n');
      return;
    }

    // Find the longest matching pathPrefix
    const reqPath = req.url.split('?')[0];
    for (const route of hostRoutes) {
      if (route.pathPrefix === '/' || reqPath.startsWith(route.pathPrefix) || reqPath + '/' === route.pathPrefix) {
        stripPrefix(route.pathPrefix, route.handler)(req, res);
        return;
      }
    }

    // No matching path prefix
    console.log(`${req.method} ${hostHeader}${req.url} 404 (no matching path)`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.on('error', function (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: port ${port} is already in use`);
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  });

  server.listen(port, function () {
    console.log(`Multi-host server started on port ${port}\nRoutes:`);
    routeDisplayLines.forEach(function (line) { console.log(line); });
  });
}

module.exports = { startFromConfig };
