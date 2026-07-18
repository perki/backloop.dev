/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { startServer } = require('./server');
const helpers = require('./helpers');

// Load a config file: .json is parsed, .js/.cjs is required, .mjs is imported.
// A module may export a config object or a (helpers) => config factory.
async function loadConfig (resolvedPath) {
  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext === '.js' || ext === '.cjs') {
    const mod = require(resolvedPath);
    return typeof mod === 'function' ? mod(helpers) : mod;
  }
  if (ext === '.mjs') {
    const mod = (await import(pathToFileURL(resolvedPath).href)).default;
    return typeof mod === 'function' ? mod(helpers) : mod;
  }
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

/**
 * Load and start the multi-host server from a config file.
 * @param {string} configPath - Path to a .json, .js, .cjs or .mjs config file
 */
async function startFromConfig (configPath) {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: config file not found: ${resolvedPath}`);
    process.exit(1);
  }

  let config;
  try {
    config = await loadConfig(resolvedPath);
  } catch (e) {
    console.error(`Error: failed to load config file: ${e.message}`);
    process.exit(1);
  }

  if (!config || !config.hostnames || typeof config.hostnames !== 'object') {
    console.error('Error: config file must contain a "hostnames" object');
    process.exit(1);
  }

  config.baseDir = path.dirname(resolvedPath);
  try {
    await startServer(config);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { startFromConfig };
