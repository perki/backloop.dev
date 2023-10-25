const acme = require('acme-client');
const { read } = require('./files');
const gandi = require('./gandi');
const savecert = require('./saveccert');
const pack = require('./pack');

const DOMAIN = process.env.BACKLOOP_DOMAIN || 'backloop.dev';
const IS_PRODUCTION = process.env.IS_PRODUCTION || false; // set to true when going to production

if (! process.env.ACME_ACCOUNT_KEY) {
  throw new Error('Missing environement var ACME_ACCOUNT_KEY');
}
const ACME_ACCOUNT_KEY = process.env.ACME_ACCOUNT_KEY;

if (! process.env.ACME_ACCOUNT_URL) {
  throw new Error('Missing environement var ACME_ACCOUNT_URL');
}
const ACME_ACCOUNT_URL = process.env.ACME_ACCOUNT_URL;


(async () => {
  const client = new acme.Client({
    directoryUrl: IS_PRODUCTION ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
    accountKey: '-----BEGIN RSA PRIVATE KEY-----\n' + ACME_ACCOUNT_KEY + '\n-----END RSA PRIVATE KEY-----',
    accountUrl: ACME_ACCOUNT_URL
  });

  const [certificateKey, csr] = await acme.crypto.createCsr({
      commonName: '*.' + DOMAIN,
      // altNames: [DOMAIN]  // was causing double request 
  });


  console.log('START');
  const certificate = await client.auto({
    csr,
    challengePriority: ['dns-01'],
    challengeCreateFn,
    challengeRemoveFn
  });


  // const certificate = read(['docs', DOMAIN + '-bundle.crt']);
  savecert(DOMAIN, certificate, certificateKey);
  await pack(DOMAIN);
  console.log('DONE');
})();

async function challengeCreateFn (authz, challenge, keyAuthorization) {
  console.log('****challengeCreateFn: ' + ' > ' + keyAuthorization, challenge);
  await gandi.update(DOMAIN, '_acme-challenge', [keyAuthorization]);
}

async function challengeRemoveFn (authz, challenge, keyAuthorization) {
  console.log('****challengeRemoveFn');
  //await gandi.update(DOMAIN, '_acme-challenge', ['cleared']);
}
