/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { write } = require('./files');

function save (domain, certificate, certificateKey) {
  write(['./gh-pages', domain + '-key.pem'], certificateKey.toString());
  write(['./gh-pages', domain + '-bundle.crt'], certificate);
  // strip bundle in ca + cert
  const FirstEnd = certificate.indexOf('-----END CERTIFICATE-----');
  const SecondBegin = certificate.indexOf('-----BEGIN CERTIFICATE-----', FirstEnd);
  write(['./gh-pages', domain + '-cert.crt'], certificate.substring(0, SecondBegin - 1));
  write(['./gh-pages', domain + '-ca.crt'], certificate.substring(SecondBegin));
}

module.exports = save;
