/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const { write } = require('./files');

function save (domain, certificate, certificateKey) {
  const key = certificateKey.toString();
  const keyPart1 = key.substring(0, 600);
  const keyPart2 = key.substring(600);
  write(['./gh-pages', domain + '-key.part1.pem'], keyPart1);
  write(['./gh-pages', domain + '-key.part2.pem'], keyPart2);
  write(['./gh-pages', domain + '-bundle.crt'], certificate);
  // strip bundle in ca + cert
  const FirstEnd = certificate.indexOf('-----END CERTIFICATE-----');
  const SecondBegin = certificate.indexOf('-----BEGIN CERTIFICATE-----', FirstEnd);
  write(['./gh-pages', domain + '-cert.crt'], certificate.substring(0, SecondBegin - 1));
  write(['./gh-pages', domain + '-ca.crt'], certificate.substring(SecondBegin));
}

module.exports = save;
