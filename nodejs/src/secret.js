/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * Certificates are no longer published openly: they live behind a secret path
 * segment. This module is the single place that knows how the secret is found
 * and how the download URL is built.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_BASE_URL = 'https://backloop.dev';

const SECRET_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

const PROJECT_CONFIG = 'backloop.dev.json';
const HOME_CONFIG = '.backloop.dev.json';

const HOW_TO_CONFIGURE = `backloop.dev certificates are no longer published openly.
Downloading them needs a secret. Provide it in any one of these ways:

  BACKLOOP_DEV_SECRET=<secret>       environment variable
  ./backloop.dev.json                { "secret": "<secret>" }, for this project
  ~/.backloop.dev.json               { "secret": "<secret>" }, for every project
  httpsOptionsPromise({ secret })    directly in code

Already hold the certificate files? Point BACKLOOP_DEV_CERTS_DIR at a directory
containing a valid pack.json, and no secret is needed at all.

The project is discontinued and access is not open. See https://backloop.dev`;

class MissingSecretError extends Error {
  constructor () {
    super('No backloop.dev secret configured.\n\n' + HOW_TO_CONFIGURE);
    this.name = 'MissingSecretError';
  }
}

class InvalidSecretError extends Error {
  constructor (source) {
    super(`The backloop.dev secret from ${source} is malformed: expected 8 to 128 characters, each of A-Z a-z 0-9 _ or -`);
    this.name = 'InvalidSecretError';
  }
}

/**
 * During an npm lifecycle script the working directory is the package itself,
 * so npm exposes the directory the user actually ran the command from.
 */
function projectDir () {
  return process.env.INIT_CWD || process.cwd();
}

/**
 * @returns {string|null} the secret held in a JSON config file, if any
 */
function readConfigFile (file) {
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const value = parsed?.secret;
    return (typeof value === 'string' && value.length > 0) ? value : null;
  } catch (e) {
    // A malformed config file must not look the same as a missing one.
    console.error(`backloop.dev: ignoring ${file}: ${e.message}`);
    return null;
  }
}

/**
 * First configured source wins. A malformed secret is reported rather than
 * skipped: it is far more likely to be a typo than an invitation to fall back.
 *
 * @param {string} [explicit] - secret passed directly by the caller
 * @returns {string}
 * @throws {MissingSecretError|InvalidSecretError}
 */
function resolveSecret (explicit) {
  const candidates = [
    [explicit, 'the secret passed to the API'],
    [process.env.BACKLOOP_DEV_SECRET, 'BACKLOOP_DEV_SECRET'],
    [readConfigFile(path.join(projectDir(), PROJECT_CONFIG)), './' + PROJECT_CONFIG],
    [readConfigFile(path.join(os.homedir(), HOME_CONFIG)), '~/' + HOME_CONFIG]
  ];

  for (const [value, source] of candidates) {
    if (value == null || value === '') continue;
    if (!SECRET_PATTERN.test(value)) throw new InvalidSecretError(source);
    return value;
  }

  throw new MissingSecretError();
}

/**
 * @param {string} secret - already validated by resolveSecret()
 * @returns {string} the URL the certificate pack is downloaded from
 */
function packUrl (secret) {
  const base = (process.env.BACKLOOP_DEV_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(secret)}/pack.json`;
}

module.exports = {
  resolveSecret,
  packUrl,
  MissingSecretError,
  InvalidSecretError,
  HOW_TO_CONFIGURE,
  SECRET_PATTERN
};
