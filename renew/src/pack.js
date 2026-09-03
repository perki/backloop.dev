/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { read, write, OUT } = require('./files');
const acme = require('acme-client');

async function pack (domain) {
  const res = {
    version: {
      num: '1',
      message: '' // message to display if version does not match
    },
    domain: domain,
    cert: read([OUT, domain + '-cert.crt']),
    ca: read([OUT, domain + '-ca.crt']),
    key2: read([OUT, domain + '-key.part2.pem']),
    key1: read([OUT, domain + '-key.part1.pem']),
    key11: 'XXXXXX DUMMY STRING XXXXXXX'
  };
  res.info = await acme.forge.readCertificateInfo(res.cert);
  write([OUT, 'pack.json'], JSON.stringify(res, null, 2));
}

module.exports = pack;
