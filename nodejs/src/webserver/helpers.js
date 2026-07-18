/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

// Build a static-files route entry, optionally with { strip, use, redirectToSlash }.
function staticDir (dir, opts) {
  return Object.assign({ path: dir }, opts);
}

// Build a reverse-proxy route entry, optionally with { strip, redirectToSlash, use, transformRequest, transformResponse }.
function proxy (target, opts) {
  return Object.assign({ proxy: target }, opts);
}

// Build a route entry that redirects every request to a fixed location.
function redirect (location, status) {
  return {
    handler: function (req, res) {
      res.writeHead(status || 302, { Location: location });
      res.end();
    }
  };
}

module.exports = { staticDir, proxy, redirect };
