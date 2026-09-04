#! /usr/bin/env node
/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * Sets or clears the `notice` in a published pack.json — the one channel that
 * reaches installed copies of the package. Separate from build-pack.js on
 * purpose: announcing something has nothing to do with buying a certificate,
 * and rebuilding the pack just to add a sentence would mean handling the
 * private key for no reason.
 *
 *   node tools/set-notice.js <pack.json> "message" [until]
 *   node tools/set-notice.js <pack.json> --clear
 *
 * `until` is any date Date() understands; past it, the package stops showing
 * the message. Always set one for anything with a deadline — a pack lives on a
 * consumer's disk until the certificate nears expiry, and a notice with no end
 * nags for months about a date already gone.
 *
 * Only installations on backloop.dev 4.1.0 or later can display this.
 */
const fs = require('fs');

const [packPath, message, until] = process.argv.slice(2);
if (!packPath || !message) {
  console.error('usage: node tools/set-notice.js <pack.json> "message" [until]');
  console.error('       node tools/set-notice.js <pack.json> --clear');
  process.exit(1);
}

const pack = JSON.parse(fs.readFileSync(packPath, 'utf-8'));

if (message === '--clear') {
  delete pack.notice;
  console.log('notice cleared');
} else {
  if (until != null) {
    if (Number.isNaN(new Date(until).getTime())) {
      // The package shows a message whose `until` it cannot parse, so a typo
      // here would silently become a notice that never expires. Catch it now.
      console.error(`cannot read "${until}" as a date — use something like 2027-01-20`);
      process.exit(1);
    }
    pack.notice = { message, until: new Date(until).toISOString() };
  } else {
    pack.notice = message;
  }
  console.log('notice set:');
  for (const line of message.split('\n')) console.log('  ' + line);
  if (until) console.log('until: ' + pack.notice.until);
  else console.log('\nNo end date: this will show until it is cleared and the pack re-fetched.');
}

fs.writeFileSync(packPath, JSON.stringify(pack, null, 2));
console.log('\nwrote ' + packPath + ' — copy it to the server for it to take effect');
