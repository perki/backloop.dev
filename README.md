# `backloop.dev` 

Loopback domain and SSL certs to handle HTTPS on localhost. 

## Why ?

When you locally develop web applications that intensively use AJAX REST requests. CORS layer is enforced by pure HTTPS only policies from browsers to avoid **mixed content** between HTTP & HTTPS sources.

Backloop.dev SSL certificates enable localhost HTTPS.

All `*.backloop.dev` hostnames point to `127.0.0.1` and `::1`. 

## CONTENT 

- [NodeJS](./nodejs) NPM package for usage in Node apps and command line tool to server local files or proxy web sites.
- [The certificates](https://backloop.dev) Web page from which you can download the SSL certificates.
- [Renew](./renew) Code that takes care of generating regularly certificates on Letsencrypt and publish them.

Most of the documentation is present on the [NodeJS](./nodejs) package 👈🏻

## CONTRIBUTING

- Pull requests are welcome.

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
