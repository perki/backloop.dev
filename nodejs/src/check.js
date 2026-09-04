/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  resolveSecret, packUrl, certsPath, savedSecretPath, canPrompt, promptForSecret, saveSecret,
  SECRET_PATTERN, MissingSecretError, ASK_THE_ADMIN
} = require('./secret');

const versionNum = 1;

if (!fs.existsSync(certsPath)) {
  if (process.env.BACKLOOP_DEV_CERTS_DIR) {
    console.error(`Error! env var BACKLOOP_DEV_CERTS_DIR is defined with value: [${process.env.BACKLOOP_DEV_CERTS_DIR}] but directory does not exists`);
  } else {
    console.error(`Error! directory ${certsPath} does not exists`);
  }
  process.exit(1);
}

const packPath = path.resolve(certsPath, 'pack.json');

/**
 * @param {boolean} [force] - download even when the local certificate is still valid
 * @param {object} [options]
 * @param {string} [options.secret] - overrides every configured source
 * @param {boolean} [options.interactive] - may ask for the secret at the terminal
 *   when none is configured. Off by default, because a prompt nobody can see is
 *   a hang: only callers that know a person is waiting should turn it on.
 */
async function updateAndLoad (force = false, { secret, interactive = false } = {}) {
  const actual = loadFromLocalDirectory(' Auto updating ');

  if (actual?.version?.num != null) {
    if (actual.version.num > versionNum) {
      console.error('Current package version is not compatible with certification file format.\nUpdate backloop.dev to latest version.\n' + actual.version.message);
      process.exit(1);
    }
  }

  if (!force) {
    if (actual != null && actual.expirationDays > 0) {
      return actual;
    }
  } else {
    console.log('Force update of backloop.dev certificate');
  }

  const res = await fetchPackWithSecret(secret, interactive);

  const expDays = expirationDays(res.info.notAfter);
  if (expDays < 0) {
    console.log('Downloaded backloop.dev certificate expired -- open an issue on https://github.com/perki/backloop.dev');
    return actual;
  }

  fs.writeFileSync(path.resolve(certsPath, 'backloop.dev-bundle.crt'), res.cert + '\n' + res.ca);
  fs.writeFileSync(path.resolve(certsPath, 'backloop.dev-ca.crt'), res.ca);
  fs.writeFileSync(path.resolve(certsPath, 'backloop.dev-cert.crt'), res.cert);
  fs.writeFileSync(path.resolve(certsPath, 'README.md'), 'concatenate keys file in backloop.dev-key.pem to use');
  fs.writeFileSync(path.resolve(certsPath, 'backloop.dev-key.part1.pem'), res.key1);
  fs.writeFileSync(path.resolve(certsPath, 'backloop.dev-key.part2.pem'), res.key2);
  fs.writeFileSync(path.resolve(certsPath, 'pack.json'), JSON.stringify(res, null, 2));

  console.log('Updated backloop.dev certificate, expires in ' + expDays + ' days');
  console.log(`Using ${certsPath} to store certificates files.`);
  res.expirationDays = expDays;
  return res;
}

/**
 * Uses a configured secret when there is one. When there is not and a person is
 * watching, asks them once: a secret that downloads a pack is proven, so it is
 * remembered and never asked for again. A secret that does not is not worth a
 * retry loop — the answer is to go and get the right one.
 *
 * @param {string} [explicit] - secret passed by the caller
 * @param {boolean} interactive - whether asking is allowed
 * @returns Promise<CertsPack>
 */
async function fetchPackWithSecret (explicit, interactive) {
  try {
    return await fetchPack(resolveSecret(explicit));
  } catch (err) {
    // Only a *missing* secret is worth asking about. A configured one that is
    // malformed or wrong is a problem to report, not to paper over.
    if (!(err instanceof MissingSecretError) || !interactive || !canPrompt()) throw err;
  }

  const answer = await promptForSecret();
  if (answer === '') throw new MissingSecretError();

  if (!SECRET_PATTERN.test(answer)) {
    console.log('\n' + ASK_THE_ADMIN + '\n');
    throw new MissingSecretError();
  }

  let res;
  try {
    res = await fetchPack(answer);
  } catch (err) {
    console.log('\n' + ASK_THE_ADMIN + '\n');
    throw err;
  }

  saveSecret(answer);
  console.log(`Secret accepted and remembered in ${savedSecretPath}`);
  return res;
}

/**
 * @param {string} secret - validated secret, the path segment the pack lives under
 * @returns Promise<CertsPack>
 */
function fetchPack (secret) {
  return new Promise((resolve, reject) => {
    https.get(packUrl(secret), function (res) {
      // The secret is a path segment, so a wrong one reads as a plain 404.
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(res.statusCode === 404
          ? 'Certificate pack not found (HTTP 404). The secret is wrong, or it has been rotated.'
          : `Unexpected HTTP ${res.statusCode} while downloading the certificate pack.`));
      }
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try {
          return resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid response ' + data));
        }
      });
    }).on('error', reject);
  });
}

function loadFromLocalDirectory (msgOnNeedUpdate) {
  if (!fs.existsSync(packPath)) {
    console.log('backloop.dev certificate not present. ' + msgOnNeedUpdate);
    return null;
  }
  const actual = JSON.parse(fs.readFileSync(packPath, 'utf-8'));
  actual.expirationDays = expirationDays(actual.info.notAfter);
  if (actual.expirationDays < 0) {
    console.log('backloop.dev certificate expired since ' + (-1 * actual.expirationDays) + ' days. ' + msgOnNeedUpdate);
  } else {
    console.log('backloop.dev certificate OK, expires in ' + actual.expirationDays + ' days');
  }
  return actual;
}

/**
 * @returns {number} - in days when the certificate expires (if negative it's expired)
 */
function expirationDays (stringDate) {
  const expireMs = new Date(stringDate).getTime() - Date.now();
  return Math.trunc(expireMs / (1000 * 60 * 60 * 24));
}

module.exports = {
  updateAndLoad,
  loadFromLocalDirectory
};
