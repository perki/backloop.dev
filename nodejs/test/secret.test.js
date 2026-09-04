const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  resolveSecret,
  packUrl,
  MissingSecretError,
  InvalidSecretError
} = require('../src/secret');

const VALID = 'abcdef0123456789ABCDEF';

// resolveSecret() reads the environment and the filesystem, so every test runs
// against a scratch HOME and INIT_CWD and restores what it changed.
let sandbox;
let saved;

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-secret-'));
  fs.mkdirSync(path.join(sandbox, 'home'));
  fs.mkdirSync(path.join(sandbox, 'project'));
  saved = {
    BACKLOOP_DEV_SECRET: process.env.BACKLOOP_DEV_SECRET,
    BACKLOOP_DEV_BASE_URL: process.env.BACKLOOP_DEV_BASE_URL,
    INIT_CWD: process.env.INIT_CWD,
    homedir: os.homedir
  };
  delete process.env.BACKLOOP_DEV_SECRET;
  delete process.env.BACKLOOP_DEV_BASE_URL;
  process.env.INIT_CWD = path.join(sandbox, 'project');
  os.homedir = () => path.join(sandbox, 'home');
});

afterEach(() => {
  os.homedir = saved.homedir;
  for (const key of ['BACKLOOP_DEV_SECRET', 'BACKLOOP_DEV_BASE_URL', 'INIT_CWD']) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
});

function writeProjectConfig (content) {
  fs.writeFileSync(path.join(sandbox, 'project', 'backloop.dev.json'), content);
}

function writeHomeConfig (content) {
  fs.writeFileSync(path.join(sandbox, 'home', '.backloop.dev.json'), content);
}

describe('resolveSecret', () => {
  it('throws MissingSecretError when nothing is configured', () => {
    assert.throws(() => resolveSecret(), MissingSecretError);
  });

  it('explains how to configure a secret in the error message', () => {
    assert.throws(() => resolveSecret(), (err) => {
      assert.match(err.message, /BACKLOOP_DEV_SECRET/);
      assert.match(err.message, /BACKLOOP_DEV_CERTS_DIR/);
      return true;
    });
  });

  it('accepts an explicit secret', () => {
    assert.strictEqual(resolveSecret(VALID), VALID);
  });

  it('reads BACKLOOP_DEV_SECRET', () => {
    process.env.BACKLOOP_DEV_SECRET = VALID;
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('reads ./backloop.dev.json', () => {
    writeProjectConfig(JSON.stringify({ secret: VALID }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('reads ~/.backloop.dev.json', () => {
    writeHomeConfig(JSON.stringify({ secret: VALID }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('prefers the explicit secret over every other source', () => {
    process.env.BACKLOOP_DEV_SECRET = 'env_secret_0123456789';
    writeProjectConfig(JSON.stringify({ secret: 'proj_secret_0123456789' }));
    assert.strictEqual(resolveSecret(VALID), VALID);
  });

  it('prefers the environment over the config files', () => {
    process.env.BACKLOOP_DEV_SECRET = VALID;
    writeProjectConfig(JSON.stringify({ secret: 'proj_secret_0123456789' }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('prefers the project config over the home config', () => {
    writeProjectConfig(JSON.stringify({ secret: VALID }));
    writeHomeConfig(JSON.stringify({ secret: 'home_secret_0123456789' }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('falls through a config file that holds no secret', () => {
    writeProjectConfig(JSON.stringify({ somethingElse: true }));
    writeHomeConfig(JSON.stringify({ secret: VALID }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('falls through an unparseable config file rather than crashing', () => {
    writeProjectConfig('{ not json');
    writeHomeConfig(JSON.stringify({ secret: VALID }));
    assert.strictEqual(resolveSecret(), VALID);
  });

  it('rejects a malformed secret instead of silently trying the next source', () => {
    process.env.BACKLOOP_DEV_SECRET = 'too-short';
    writeHomeConfig(JSON.stringify({ secret: VALID }));
    assert.throws(() => resolveSecret(), InvalidSecretError);
  });

  it('rejects characters that would escape the path segment', () => {
    for (const bad of ['../../etc/passwd0000', 'has spaces in it 000', 'slash/in/secret/000']) {
      assert.throws(() => resolveSecret(bad), InvalidSecretError, bad);
    }
  });

  it('rejects a secret that is too long', () => {
    assert.throws(() => resolveSecret('a'.repeat(129)), InvalidSecretError);
  });
});

describe('packUrl', () => {
  it('places the secret as a path segment', () => {
    assert.strictEqual(packUrl(VALID), `https://backloop.dev/${VALID}/pack.json`);
  });

  it('honours BACKLOOP_DEV_BASE_URL and strips trailing slashes', () => {
    process.env.BACKLOOP_DEV_BASE_URL = 'https://example.test/';
    assert.strictEqual(packUrl(VALID), `https://example.test/${VALID}/pack.json`);
  });

  it('never points at the public pack.json the project used to serve', () => {
    assert.notStrictEqual(packUrl(VALID), 'https://backloop.dev/pack.json');
  });
});
