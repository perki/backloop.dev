#! /usr/bin/env node
const configArg = process.argv.find(a => a.startsWith('--config='));
if (configArg) {
  const configPath = configArg.split('=').slice(1).join('=');
  require('../src/webserver/config.js').startFromConfig(configPath);
} else {
  require('../src/webserver/main.js').runCLI();
}
