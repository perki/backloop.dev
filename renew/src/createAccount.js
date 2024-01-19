/**
 * @license
 * [BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
 */
const acme = require('acme-client');

const IS_PRODUCTION = process.env.IS_PRODUCTION || false; // set to true when going to production


if (! process.env.BACKLOOP_EMAIL) {
  throw new Error('Missing BACKLOOP_EMAIL environement var')
}
const EMAIL = process.env.BACKLOOP_EMAIL;

(async () => { 
  const privateKey = await acme.forge.createPrivateKey();
  const oneLinerKey = acme.forge.getPemBody(privateKey);
  console.log('Account key: ' + oneLinerKey);

  const client = new acme.Client({
    directoryUrl: IS_PRODUCTION ? acme.directory.letsencrypt.production : acme.directory.letsencrypt.staging,
    accountKey: '-----BEGIN RSA PRIVATE KEY-----\n' + oneLinerKey + '\n-----END RSA PRIVATE KEY-----'
  });

  const account = await client.createAccount({
    termsOfServiceAgreed: true,
    contact: ['mailto:' + EMAIL]
  });

  const accountUrl = client.getAccountUrl();
  console.log('Account Url: ' + accountUrl);
})();

