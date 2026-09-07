#! /usr/bin/env node
/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */

/**
 * Builds the public, self-signed certificate directory served at
 * https://backloop.dev/public/.
 *
 * This is the certificate handed to anyone who has no secret. It is shared, and
 * its private key is published with it, exactly like the old public service.
 * The difference is that no certificate authority is involved, so there is
 * nothing that can be compelled to revoke it. It is trusted only on machines
 * where somebody installed it deliberately.
 *
 * Two properties of the certificate are load-bearing and must not be relaxed:
 *
 *   CA:FALSE          It is a leaf, never a certificate authority. A root whose
 *                     private key is public would let anyone holding that key
 *                     mint a certificate for ANY hostname, for every person who
 *                     installed it. As a leaf, the worst case is impersonating
 *                     *.backloop.dev origins, which already resolve to loopback.
 *
 *   serverAuth only   Apple requires extendedKeyUsage on TLS server certificates
 *                     issued after 2019-07-01, and it keeps the trust narrow.
 *
 * Validity is ten years, which looks wrong against Apple's published 825-day
 * maximum for TLS server certificates and is not. That maximum applies to
 * certificates chaining to roots the system ships; a certificate the user
 * installed themselves is exempt, the same carve-out Apple states explicitly
 * for the later 398-day rule. Measured on macOS 26 on 2026-09-07: a 3650-day
 * self-signed leaf installed with `security add-trusted-cert -p ssl` passes
 * `security verify-cert` and loads in Safari and Chrome with no warning.
 *
 * That matters because rotation is expensive here. There is no revocation and
 * no automatic refresh, so every rotation means every installed user repeating
 * the install by hand. Ten years turns that into a non-event. Announce any
 * rotation through the pack's `notice` field months in advance.
 *
 *   node tools/build-public-pack.js dist/public [--days=3650]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { X509Certificate, createPublicKey } = require('crypto');

const args = process.argv.slice(2);
const destDir = args.find(a => !a.startsWith('--'));
const daysArg = args.find(a => a.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 3650;

if (!destDir) {
  console.error('usage: node tools/build-public-pack.js <dest-dir> [--days=825]');
  process.exit(1);
}
if (!Number.isInteger(days) || days < 1 || days > 7300) {
  console.error('--days must be between 1 and 7300');
  process.exit(1);
}

const DOMAIN = 'backloop.dev';

const CONFIG = `[req]
distinguished_name = dn
x509_extensions    = ext
prompt             = no

[dn]
CN = *.${DOMAIN}
O  = ${DOMAIN}
OU = Public self-signed certificate for localhost development

[ext]
basicConstraints     = critical, CA:FALSE
keyUsage             = critical, digitalSignature, keyEncipherment
extendedKeyUsage     = serverAuth
subjectAltName       = DNS:*.${DOMAIN}, DNS:${DOMAIN}
subjectKeyIdentifier = hash
`;

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'backloop-public-'));
const cnfPath = path.join(work, 'leaf.cnf');
const keyPath = path.join(work, 'key.pem');
const certPath = path.join(work, 'cert.pem');

try {
  fs.writeFileSync(cnfPath, CONFIG);
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
    '-days', String(days), '-keyout', keyPath, '-out', certPath, '-config', cnfPath
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (err) {
  console.error('openssl failed: ' + (err.stderr ? err.stderr.toString().trim() : err.message));
  process.exit(1);
}

const leaf = fs.readFileSync(certPath, 'utf-8').trim() + '\n';
const key = fs.readFileSync(keyPath, 'utf-8');
fs.rmSync(work, { recursive: true, force: true });

const cert = new X509Certificate(leaf);
if (cert.publicKey.export({ type: 'spki', format: 'pem' }) !==
    createPublicKey(key).export({ type: 'spki', format: 'pem' })) {
  throw new Error('the certificate does not match the private key');
}

// Refuse to write anything that is not the safe shape, even though this script
// is what produced it. A tool that silently emits a usable CA would be the one
// mistake here that actually hurts people. `cert.ca` comes from node's own
// parser; the EKU has no accessor, so it is read back out of openssl.
if (cert.ca) throw new Error('refusing to write: certificate is a CA');
const text = execFileSync('openssl', ['x509', '-noout', '-text'], { input: leaf }).toString();
if (!/CA:FALSE/.test(text)) throw new Error('refusing to write: basicConstraints is not CA:FALSE');
if (!/TLS Web Server Authentication/.test(text)) throw new Error('refusing to write: no serverAuth EKU');

const cn = s => /CN=(.+)/.exec(s.split('\n').find(l => l.startsWith('CN=')))[1];

// Same shape acme-client produced, so pack.json does not change format for the
// installed copies that parse it. `public` and `fingerprint256` are additions;
// older versions ignore unknown fields.
const info = {
  issuer: { commonName: cn(cert.issuer) },
  domains: {
    commonName: cn(cert.subject),
    altNames: (cert.subjectAltName || '').split(',').map(s => s.trim().replace(/^DNS:/, '')).filter(Boolean)
  },
  notAfter: new Date(cert.validTo).toISOString(),
  notBefore: new Date(cert.validFrom).toISOString(),
  fingerprint256: cert.fingerprint256
};

fs.mkdirSync(destDir, { recursive: true });
const write = (name, content) => {
  fs.writeFileSync(path.join(destDir, name), content);
  console.log('  ' + name.padEnd(30) + fs.statSync(path.join(destDir, name)).size + ' o');
};

console.log('writing ' + destDir);
// Self-signed: the leaf is its own trust anchor, so the chain and the "ca" file
// are the leaf itself. backloop.dev-ca.crt is what the install page tells people
// to download, so it has to be the file they should trust.
write(DOMAIN + '-bundle.crt', leaf);
write(DOMAIN + '-cert.crt', leaf);
write(DOMAIN + '-ca.crt', leaf);
write(DOMAIN + '-key.part1.pem', key.substring(0, 600));
write(DOMAIN + '-key.part2.pem', key.substring(600));
write('README.md',
  'This certificate is self-signed, shared, and its private key is published\n' +
  'alongside it. It is trusted only where somebody installed it on purpose.\n' +
  'See https://backloop.dev/public/ for what that means and how to do it.\n');
write('pack.json', JSON.stringify({
  version: { num: '1', message: '' },
  domain: DOMAIN,
  public: true,
  cert: leaf,
  ca: leaf,
  key2: key.substring(600),
  key1: key.substring(0, 600),
  key11: 'XXXXXX DUMMY STRING XXXXXXX',
  info
}, null, 2));

console.log('\ncovers       ' + info.domains.altNames.join(', '));
console.log('expires      ' + info.notAfter + '  (' + days + ' days)');
console.log('fingerprint  ' + info.fingerprint256);
console.log('\nPut the fingerprint on the install page: it is the only way someone can');
console.log('check that the file they downloaded is the one you published.');
