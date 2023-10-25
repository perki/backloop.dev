# backloop.dev files

Loopback domain and SSL certs.

## Why ?

When you locally develop web applications that intensively use AJAX REST requests. CORS layer is enforced by pure HTTPS only policies from browsers.

Backloop.dev SSL certificates enable localhost HTTPS.

All `*.backloop.dev` hostnames point to `127.0.0.1`. 

#### See also:

- [GitHub repository](https://github.com/perki/backloop.dev)
- [npm package](https://www.npmjs.com/package/backloop.dev)


## The files

- [backloop.dev-cert.crt](backloop.dev-cert.crt) : The certificate
- [backloop.dev-key.pem](backloop.dev-key.pem) : The key
- [backloop.dev-ca.crt](backloop.dev-ca.crt) : Certificate of authority
- [backloop.dev-bundle.crt](backloop.dev-bundle.crt) : Bundle of key + ca
- [pack.json](pack.json) : All this packed in a json file

