const check = require('./check');

function httpsOptions () {
  const actual = check.load('=> run `./bin/update` to `backloop.dev-update` to update');
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

    if (actual == null) {
      return {
        key: '',
        cert: '',
        ca: ''
      };
    }
  }
  return {
    key: actual.key,
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
  check.updateAndLoad(function (err, actual) {
    if (err) return done(err);
    if (actual == null) return done(new Error('Failed loading backloop.dev certificate'));
    done(null, {
      key: actual.key,
      cert: actual.cert,
      ca: actual.ca
    });
  });
}

module.exports = {
  httpsOptions: httpsOptions,
  httpsOptionsAsync: httpsOptionsAsync
};
