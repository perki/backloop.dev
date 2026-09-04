#! /usr/bin/env node
/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { updateAndLoad } = require('../src/check');
const { MissingSecretError, InvalidSecretError } = require('../src/secret');

// Run from the postinstall hook, a failure must not break `npm install`: the
// certificate can still be configured afterwards and fetched at runtime. Run
// deliberately from the command line, the same failure is a real one.
const isPostinstall = process.argv.includes('--postinstall');

(async () => {
  try {
    // Asking only makes sense when a person ran this on purpose. npm pipes a
    // lifecycle script's output elsewhere, so a prompt there is an invisible hang.
    await updateAndLoad(true, { interactive: !isPostinstall });
  } catch (err) {
    const expected = err instanceof MissingSecretError || err instanceof InvalidSecretError;

    if (isPostinstall) {
      console.log('\nbackloop.dev: certificates were not downloaded.');
      console.log(expected ? err.message : `  ${err.message}`);
      console.log('\nInstallation continues. Run `npx backloop.dev-update` once configured.\n');
      process.exit(0);
    }

    console.error('\nbackloop.dev: update failed.');
    console.error(expected ? err.message : `  ${err.message}`);
    console.error('');
    process.exit(1);
  }
})();
