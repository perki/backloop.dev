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
    httpsOptionsAsync(function (err, res) {
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
 * @param {requestCallback} done
 */
function httpsOptionsAsync (done) {
  httpsOptionsPromise().then((res) => { done(null, res); }, done);
}

/**
 * @returns Promise<httpsOptions>
 */
async function httpsOptionsPromise() {
  const actual = await check.updateAndLoad();
  if (actual == null) throw(new Error('Failed loading backloop.dev certificate'));
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
