/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { read, write } = require('./files');
const acme = require('acme-client');

async function pack (domain) {
  const res = {
    domain: domain,
    cert: read(['../docs', domain + '-cert.crt']),
    ca: read(['../docs', domain + '-ca.crt']),
    key: read(['../docs', domain + '-key.pem'])
  };
  res.info = await acme.forge.readCertificateInfo(res.cert);
  write(['../docs', 'pack.json'], JSON.stringify(res, null, 2));
}

module.exports = pack;
