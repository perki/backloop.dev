/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

// Run an array of (req, res, next) middlewares, then the final handler.
function runChain (chain, final, req, res) {
  let i = 0;
  function next () {
    const fn = chain[i++];
    if (fn) fn(req, res, next);
    else final(req, res);
  }
  next();
}

// Remove a matched path prefix from a url, keeping any query string.
function stripPrefix (prefix, url) {
  return url.slice(prefix.length - 1) || '/';
}

// Build the HTTPS request dispatcher from resolved route descriptors.
// descriptors: [{ hostname, pathPrefix, handler, strip, redirectToSlash, use }]
// options: { port, hooks: { onRequest, route, use } }
function createDispatcher (descriptors, options) {
  options = options || {};
  const port = options.port || 4443;
  const hooks = options.hooks || {};
  const globalUse = Array.isArray(hooks.use) ? hooks.use : [];

  // Group by hostname, longest prefix first.
  const routes = {};
  for (const d of descriptors) {
    if (!routes[d.hostname]) routes[d.hostname] = [];
    routes[d.hostname].push(d);
  }
  for (const h of Object.keys(routes)) {
    routes[h].sort(function (a, b) { return b.pathPrefix.length - a.pathPrefix.length; });
  }
  const knownHostnames = Object.keys(routes);

  return function dispatch (req, res) {
    // Global pre-hook: returning true means the hook fully handled the response.
    if (typeof hooks.onRequest === 'function' && hooks.onRequest(req, res) === true) return;

    // Custom router hook: returning a handler bypasses the built-in table.
    if (typeof hooks.route === 'function') {
      const custom = hooks.route(req);
      if (custom) { runChain(globalUse, custom, req, res); return; }
    }

    const hostHeader = req.headers.host || '';
    const hostname = hostHeader.split(':')[0].replace(/\.backloop\.dev$/, '');
    const hostRoutes = routes[hostname];
    if (!hostRoutes) {
      console.log(`${req.method} ${hostHeader}${req.url} 404 (unknown host)`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found\n\nConfigured hostnames:\n' +
        knownHostnames.map(h => `  https://${h}.backloop.dev:${port}/`).join('\n') + '\n');
      return;
    }

    const qIdx = req.url.indexOf('?');
    const reqPath = qIdx === -1 ? req.url : req.url.slice(0, qIdx);
    const query = qIdx === -1 ? '' : req.url.slice(qIdx);

    for (const route of hostRoutes) {
      const prefix = route.pathPrefix;
      const isCatchAll = prefix === '/';
      // A prefix like "/patient/" also matches the slash-less form "/patient".
      const bare = prefix.slice(0, -1);
      const matchesBare = !isCatchAll && reqPath === bare;
      if (!(isCatchAll || reqPath.startsWith(prefix) || matchesBare)) continue;

      if (matchesBare && route.redirectToSlash) {
        res.writeHead(301, { Location: prefix + query });
        res.end();
        return;
      }

      // strip defaults to true (the prefix is removed before forwarding).
      if (route.strip !== false && !isCatchAll) req.url = stripPrefix(prefix, req.url);

      const chain = route.use ? globalUse.concat(route.use) : globalUse;
      runChain(chain, route.handler, req, res);
      return;
    }

    console.log(`${req.method} ${hostHeader}${req.url} 404 (no matching path)`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  };
}

module.exports = { createDispatcher };
