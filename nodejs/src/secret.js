/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * Certificates are no longer published openly: they live behind a secret path
 * segment. This module is the single place that knows how the secret is found,
 * how it is remembered, and how the download URL is built.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const DEFAULT_BASE_URL = 'https://backloop.dev';

const SECRET_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

const PROJECT_CONFIG = 'backloop.dev.json';
const HOME_CONFIG = '.backloop.dev.json';

const certsPath = process.env.BACKLOOP_DEV_CERTS_DIR || path.resolve(__dirname, '../certs/');

/** Where a secret typed at the prompt is remembered, so it is asked for once. */
const savedSecretPath = path.resolve(certsPath, 'secret');

const HOW_TO_CONFIGURE = `backloop.dev certificates are no longer published openly.
Downloading them needs a secret. Provide it in any one of these ways:

  BACKLOOPDEV=<secret>               environment variable
  ./backloop.dev.json                { "secret": "<secret>" }, for this project
  ~/.backloop.dev.json               { "secret": "<secret>" }, for every project
  httpsOptionsPromise({ secret })    directly in code

To set the environment variable for good, add this to ~/.zshrc or ~/.bashrc:

  export BACKLOOPDEV=<secret>

Already hold the certificate files? Point BACKLOOP_DEV_CERTS_DIR at a directory
containing a valid pack.json, and no secret is needed at all.

The project is discontinued and access is not open. See https://backloop.dev`;

/** Shown when a typed secret turns out not to work. */
const ASK_THE_ADMIN = `That secret did not work.

backloop.dev is no longer a public service and access is not open: ask whoever
administers your setup for the secret. Once you have it, set it as an
environment variable so you are not asked again — add this to ~/.zshrc or
~/.bashrc and open a new terminal:

  export BACKLOOPDEV=<secret>

Or write it into ./backloop.dev.json in your project, as { "secret": "<secret>" }.
Keep that file out of version control.`;

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
 * @returns {string|null} a secret remembered from an earlier prompt
 */
function readSavedSecret () {
  if (!fs.existsSync(savedSecretPath)) return null;
  try {
    const value = fs.readFileSync(savedSecretPath, 'utf-8').trim();
    return value.length > 0 ? value : null;
  } catch (e) {
    console.error(`backloop.dev: ignoring ${savedSecretPath}: ${e.message}`);
    return null;
  }
}

/**
 * Remembers a secret that has just been proven to work, so the prompt happens
 * once rather than on every start. Failing to write is not worth an error: the
 * secret still works for this run.
 *
 * @param {string} secret - already validated and proven against the server
 */
function saveSecret (secret) {
  try {
    fs.writeFileSync(savedSecretPath, secret + '\n', { mode: 0o600 });
    return true;
  } catch (e) {
    console.error(`backloop.dev: could not remember the secret in ${savedSecretPath}: ${e.message}`);
    return false;
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
    [process.env.BACKLOOPDEV, 'BACKLOOPDEV'],
    [process.env.BACKLOOP_DEV_SECRET, 'BACKLOOP_DEV_SECRET'],
    [readConfigFile(path.join(projectDir(), PROJECT_CONFIG)), './' + PROJECT_CONFIG],
    [readConfigFile(path.join(os.homedir(), HOME_CONFIG)), '~/' + HOME_CONFIG],
    [readSavedSecret(), savedSecretPath]
  ];

  for (const [value, source] of candidates) {
    if (value == null || value === '') continue;
    if (!SECRET_PATTERN.test(value)) throw new InvalidSecretError(source);
    return value;
  }

  throw new MissingSecretError();
}

/**
 * A prompt is only ever appropriate when a person is watching. Without both
 * ends attached to a terminal — CI, a service under a supervisor, an npm
 * lifecycle script whose output npm pipes elsewhere — asking would hang
 * forever with nobody to see the question.
 *
 * @returns {boolean}
 */
function canPrompt () {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Asks once. An empty answer means "I don't know it", which is a legitimate
 * reply and not an error.
 *
 * @returns {Promise<string>} the trimmed answer, empty if the user just pressed enter
 */
function promptForSecret () {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('\nThe secret for backloop.dev is unknown. If you know it, enter it now.');
    console.log('Otherwise, or to learn how to set it as an environment variable, press enter.');
    rl.question('Secret: ', (answer) => {
      rl.close();
      resolve((answer || '').trim());
    });
  });
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
  readSavedSecret,
  saveSecret,
  promptForSecret,
  canPrompt,
  packUrl,
  certsPath,
  savedSecretPath,
  MissingSecretError,
  InvalidSecretError,
  HOW_TO_CONFIGURE,
  ASK_THE_ADMIN,
  SECRET_PATTERN
};
