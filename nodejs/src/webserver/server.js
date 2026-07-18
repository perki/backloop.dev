/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const https = require('https');
const path = require('path');
const fs = require('fs');

const { createStaticHandler } = require('./main');
const { createProxyHandler } = require('./proxy');
const { createDispatcher } = require('./router');

// Turn one hostnames entry into a route descriptor; throws on invalid config.
function resolveEntry (key, entry, baseDir) {
  const slashIdx = key.indexOf('/');
  let hostname, pathPrefix;
  if (slashIdx === -1) {
    hostname = key;
    pathPrefix = '/';
  } else {
    hostname = key.substring(0, slashIdx);
    pathPrefix = key.substring(slashIdx);
    if (!pathPrefix.endsWith('/')) throw new Error(`path prefix for '${key}' must end with '/' (got '${pathPrefix}')`);
  }

  let handler, type, target;
  if (typeof entry.handler === 'function') {
    handler = entry.handler;
    type = 'handler';
    target = 'custom handler';
  } else if (entry.path) {
    const dirPath = path.resolve(baseDir, entry.path);
    if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
      throw new Error(`'${dirPath}' (for '${key}') is not existing or not a directory`);
    }
    handler = createStaticHandler(dirPath);
    type = 'static';
    target = dirPath;
  } else if (entry.proxy) {
    handler = createProxyHandler(entry.proxy, entry);
    type = 'proxy';
    target = entry.proxy;
  } else {
    throw new Error(`'${key}' must have a "path", "proxy" or "handler" property`);
  }

  return {
    hostname,
    pathPrefix,
    handler,
    type,
    target,
    strip: entry.strip,
    redirectToSlash: entry.redirectToSlash,
    use: Array.isArray(entry.use) ? entry.use : null
  };
}

// One startup-banner line per route.
function describeRoute (d, port) {
  let label;
  if (d.type === 'static') label = `files in '${d.target}'`;
  else if (d.type === 'proxy') label = `proxy to ${d.target}${d.strip === false ? ' (keep prefix)' : ''}`;
  else label = 'custom handler';
  return `  https://${d.hostname}.backloop.dev:${port}${d.pathPrefix} -> ${label}`;
}

/**
 * Start a multi-host HTTPS server. Resolves with the https.Server once listening.
 * @param {object} config - { port, hostnames, hooks?, baseDir?, httpsOptions?, silent? }
 * @returns {Promise<import('https').Server>}
 */
async function startServer (config) {
  if (!config || !config.hostnames || typeof config.hostnames !== 'object') {
    throw new Error('config must contain a "hostnames" object');
  }

  const port = config.port == null ? 4443 : config.port;
  if (isNaN(port) || port < 0 || port > 65535) {
    throw new Error(`'${config.port}' is not a valid port number`);
  }

  const baseDir = config.baseDir || process.cwd();
  const descriptors = [];
  for (const [key, entry] of Object.entries(config.hostnames)) {
    descriptors.push(resolveEntry(key, entry, baseDir));
  }
  if (descriptors.length === 0) throw new Error('no hostnames configured');

  const { httpsOptionsPromise } = require('..');
  const options = config.httpsOptions || await httpsOptionsPromise();
  const dispatcher = createDispatcher(descriptors, { port, hooks: config.hooks });
  const server = https.createServer(options, dispatcher);

  return await new Promise(function (resolve, reject) {
    server.on('error', function (err) {
      if (err.code === 'EADDRINUSE') reject(new Error(`port ${port} is already in use`));
      else reject(err);
    });
    server.listen(port, function () {
      if (!config.silent) {
        const bound = server.address().port;
        console.log(`Multi-host server started on port ${bound}\nRoutes:`);
        descriptors.forEach(function (d) { console.log(describeRoute(d, bound)); });
      }
      resolve(server);
    });
  });
}

module.exports = { startServer, resolveEntry };
