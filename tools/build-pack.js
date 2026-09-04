#! /usr/bin/env node
/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * Builds the published certificate directory from a commercial CA delivery.
 *
 * `renew/` can no longer run — the domain is blocklisted by the free authority
 * it used — but the published layout must not change, because installed copies
 * of the package parse it. This mirrors `renew/src/saveccert.js` and
 * `renew/src/pack.js` exactly: same chain order, same 600-character key split,
 * same pack.json fields, same shape of `info`. It uses node's own X509 parser
 * rather than acme-client so that it runs with no dependencies at all.
 *
 * Nothing here is secret: the delivery, the key and the destination are all
 * arguments. Never commit the key or the directory this writes.
 *
 *   node tools/build-pack.js <delivery-dir> <key-file> <dest-dir>
 *
 * <delivery-dir> holds the reseller's files:
 *   STAR_backloop_dev.crt                              the certificate
 *   SSL2BUYEMEARSADomainValidationSecureServerCA.crt   issuing intermediate
 *   SectigoPublicServerAuthenticationRootR46_*.crt     root that cross-signs it
 * The USERTrust root in the delivery is deliberately left out: it is already in
 * every trust store, and shipping it only makes the chain bigger.
 */
const fs = require('fs');
const path = require('path');
const { X509Certificate } = require('crypto');

const [deliveryDir, keyFile, destDir] = process.argv.slice(2);
if (!deliveryDir || !keyFile || !destDir) {
  console.error('usage: node tools/build-pack.js <delivery-dir> <key-file> <dest-dir>');
  process.exit(1);
}

const DOMAIN = 'backloop.dev';

/** The delivery filenames vary in case and suffix, so match on content instead. */
function findByCommonName (dir, needle) {
  for (const name of fs.readdirSync(dir)) {
    if (!/\.(crt|pem|cer)$/i.test(name)) continue;
    const pem = fs.readFileSync(path.join(dir, name), 'utf-8');
    try {
      if (new X509Certificate(pem).subject.includes(needle)) return pem.trim() + '\n';
    } catch { /* not a certificate */ }
  }
  throw new Error(`no certificate whose subject contains "${needle}" in ${dir}`);
}

const leaf = findByCommonName(deliveryDir, DOMAIN);
const chain =
  findByCommonName(deliveryDir, 'Domain Validation Secure Server CA') +
  findByCommonName(deliveryDir, 'Sectigo Public Server Authentication Root');

const key = fs.readFileSync(keyFile, 'utf-8');

const cert = new X509Certificate(leaf);
if (cert.publicKey.export({ type: 'spki', format: 'pem' }) !==
    require('crypto').createPublicKey(key).export({ type: 'spki', format: 'pem' })) {
  throw new Error('the certificate does not match the private key');
}

// Same shape acme-client produced, so pack.json does not change format.
const info = {
  issuer: { commonName: /CN=(.+)/.exec(cert.issuer.split('\n').find(l => l.startsWith('CN=')))[1] },
  domains: {
    commonName: /CN=(.+)/.exec(cert.subject.split('\n').find(l => l.startsWith('CN=')))[1],
    altNames: (cert.subjectAltName || '').split(',').map(s => s.trim().replace(/^DNS:/, '')).filter(Boolean)
  },
  notAfter: new Date(cert.validTo).toISOString(),
  notBefore: new Date(cert.validFrom).toISOString()
};

fs.mkdirSync(destDir, { recursive: true });
const write = (name, content) => {
  fs.writeFileSync(path.join(destDir, name), content);
  console.log('  ' + name.padEnd(30) + fs.statSync(path.join(destDir, name)).size + ' o');
};

console.log('writing ' + destDir);
write(DOMAIN + '-bundle.crt', leaf + chain);
write(DOMAIN + '-cert.crt', leaf);
write(DOMAIN + '-ca.crt', chain);
write(DOMAIN + '-key.part1.pem', key.substring(0, 600));
write(DOMAIN + '-key.part2.pem', key.substring(600));
write('README.md', 'concatenate keys file in backloop.dev-key.pem to use\n');
write('pack.json', JSON.stringify({
  version: { num: '1', message: '' },
  domain: DOMAIN,
  cert: leaf,
  ca: chain,
  key2: key.substring(600),
  key1: key.substring(0, 600),
  key11: 'XXXXXX DUMMY STRING XXXXXXX',
  info
}, null, 2));

console.log('\nissuer   ' + info.issuer.commonName);
console.log('covers   ' + info.domains.altNames.join(', '));
console.log('expires  ' + info.notAfter);
