# `backloop.dev` renew

Renew the `*.backloop.dev` wildcard SSL certificate with Let's Encrypt and Gandi.

> **This no longer works.** Since 2026-08-01 Let's Encrypt refuses to issue for
> this domain — `Cannot issue for "*.backloop.dev": ... forbidden by policy`.
> The published wildcard is now bought from a commercial CA. The code here is
> kept for its ACME and Gandi DNS-01 plumbing in case issuance becomes possible
> again, and for `pack.js`, which is still what builds `pack.json`.

- Outputs the certificate files into `dist/` at the root of this repository.
- `dist/` is not committed and is not published by any automation: after a run,
  its contents are copied by hand onto the Apache server at Gandi that serves
  https://backloop.dev.
- The published certificates are used by the [backloop.dev](https://github.com/perki/backloop.dev) package.

The workflow in [.github/workflows](../.github/workflows) is manual-only and
uploads `dist/` as an artifact; it publishes nothing.


## Installation 

- `npm install`

## Usage

### Account creation

First you need to create an account on Letsencrypt with:
  - Staging: `BACKLOOP_EMAIL={your email} node ./src/createAccount.js`
  - Production: `IS_PRODUCTION=true BACKLOOP_EMAIL={your email} node ./src/createAccount.js`

Keep the values of `Account key` and `Account Url` respectively in environement variables `ACME_ACCOUNT_KEY` and `ACME_ACCOUNT_URL`, They will be used by the renewal script. You need to do this only once per environment.

### Generate new certficates 

To create new certificates, you need to set the following environement variables:
  - `ACME_ACCOUNT_URL` - generated on the previous step
  - `ACME_ACCOUNT_KEY` - generated on the previous step
  - `GANDI_API_TOKEN` - A gandi.net's ApiKey that allows to update your domain [Read more](https://api.gandi.net/docs/authentication/)

Run: 
  - Staging: `npm start`
  - Production: `IS_PRODUCTION=true npm start`

### Install

```
npm install
```

### Run

```
GANDI_API_TOKEN=${KEY} npm start
```
to generate new SSL certificates into `dist/` at the root of this repository.

Add `IS_PRODUCTION=true` to use Let's Encrypt's production API **which has a call limit!**


## CONTRIBUTING

- Pull requests are welcome

You may want to contribute to this repository to make it work for your own domain name or to support validation on other registar (DNS services) than gandi.net

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
