/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const check = require('./check');

function httpsOptions () {
  const actual = check.loadFromLocalDirectory('=> run `./bin/update` to `backloop.dev-update` to update');
  if (actual == null || actual.expirationDays < 0) {
    // lazyly try to update
    console.log('** Lazyly trying to update the certificate on my own ...');
    httpsOptionsAsync({ interactive: false }, function (err, res) {
      if (err) {
        console.log('** Failed with error', err);
      } else if (res) {
        console.log('** Did it!! Killing your service... Just restart your service');
      }
      process.exit(1);
    });
    return { key: '', cert: '', ca: '' };
  }
  return {
    key: actual.key1 + actual.key2,
    cert: actual.cert,
    ca: actual.ca
  };
}

/**
 * @callback requestCallback
 * @param {error} error
 * @param {res} httpsOptions
 */

/**
 * @param {object|requestCallback} [options] - { secret, interactive }, or the callback itself
 * @param {requestCallback} [done]
 */
function httpsOptionsAsync (options, done) {
  if (typeof options === 'function') {
    done = options;
    options = {};
  }
  httpsOptionsPromise(options).then((res) => { done(null, res); }, done);
}

/**
 * Asynchronous start-up is the one moment where asking for the secret makes
 * sense: there is a terminal, and someone is waiting at it. Pass
 * `interactive: false` for a service that starts unattended.
 *
 * @param {object} [options]
 * @param {string} [options.secret] - overrides every configured source
 * @param {boolean} [options.interactive] - ask at the terminal when no secret is
 *   configured and stdin is a TTY. Default true.
 * @returns Promise<httpsOptions>
 */
async function httpsOptionsPromise (options = {}) {
  const actual = await check.updateAndLoad(false, { interactive: true, ...options });
  if (actual == null) throw (new Error('Failed loading backloop.dev certificate'));
  return {
    key: actual.key1 + actual.key2,
    cert: actual.cert,
    ca: actual.ca
  };
}

module.exports = {
  httpsOptions,
  httpsOptionsAsync,
  httpsOptionsPromise
};
