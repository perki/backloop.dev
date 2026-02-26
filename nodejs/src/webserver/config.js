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

  // Build routing map: hostname -> handler
  const routes = {};
  const configDir = path.dirname(resolvedPath);

  for (const [name, entry] of Object.entries(config.hostnames)) {
    if (entry.path) {
      const dirPath = path.resolve(configDir, entry.path);
      if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
        console.error(`Error: '${dirPath}' (for hostname '${name}') is not existing or not a directory`);
        process.exit(1);
      }
      routes[name] = { handler: createStaticHandler(dirPath), type: 'static', target: dirPath };
    } else if (entry.proxy) {
      routes[name] = { handler: createProxyHandler(entry.proxy), type: 'proxy', target: entry.proxy };
    } else {
      console.error(`Error: hostname '${name}' must have either "path" or "proxy" property`);
      process.exit(1);
    }
  }

  const hostnames = Object.keys(routes);
  if (hostnames.length === 0) {
    console.error('Error: no hostnames configured');
    process.exit(1);
  }

  // Start the server
  const options = await httpsOptionsPromise();
  const server = https.createServer(options, function (req, res) {
    // Extract hostname from Host header: "tom.backloop.dev:6667" -> "tom"
    const hostHeader = req.headers.host || '';
    const hostPart = hostHeader.split(':')[0]; // remove port
    const name = hostPart.replace(/\.backloop\.dev$/, '');

    const route = routes[name];
    if (!route) {
      console.log(`${req.method} ${hostHeader}${req.url} 404 (unknown host)`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n\nConfigured hostnames:\n' +
        hostnames.map(h => `  https://${h}.backloop.dev:${port}/`).join('\n') + '\n');
      return;
    }

    route.handler(req, res);
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
    for (const [name, route] of Object.entries(routes)) {
      const label = route.type === 'static' ? `files in '${route.target}'` : `proxy to ${route.target}`;
      console.log(`  https://${name}.backloop.dev:${port}/ -> ${label}`);
    }
  });
}

module.exports = { startFromConfig };
