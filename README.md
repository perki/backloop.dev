# backloop.dev files

Do SSL HTTPS requests on **Localhost** using a domain and SSL certificates pointing to your local environment.

**https://\<any subdomain>.backloop.dev/ → https://localhost/**

Any subdomain of `*.backloop.dev` points to `localhost`!

--------------------------------------------------

**Exception:** `backloop.dev`, which points to a page where you can download the certificates.

## Why ?

**backloop.dev** solves [mixed-content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content) issues when developing a WebApp or Backend on local environement while accessing ressources on remote HTTPS sources. 

The issue is often raised by the [same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) mechanism that restricts the loading of resources from another origin unless this can be allowed by sending correct [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) headers. 

Which anyway will fall-back on the must-have "non-mixed-content" (No HTTP & HTTPS) 

But making requests to **HTTPS APIs** from **HTTP** sites on **localhost** would not be possible without changing security options on your browser, which is why **backloop.dev** provides SSL certificates with a full loopback domain, to let anyone benefit from a signed certificate on **localhost**.


#### See also:

- [GitHub repository](https://github.com/perki/backloop.dev)
- [npm package](https://www.npmjs.com/package/backloop.dev)

## The files

SSL Certificates are updated weekly. 

From december 2024 the key is now delivered in two files to be concatenated. 
It seems it was found by a robot and revoked as publicly available.

- [backloop.dev-key.part1.pem](backloop.dev-key.part1.pem) : The key (part1)
- [backloop.dev-key.part2.pem](backloop.dev-key.part2.pem) : The key (part2)
- [backloop.dev-cert.crt](backloop.dev-cert.crt) : The certificate
- [backloop.dev-ca.crt](backloop.dev-ca.crt) : Certificate of authority
- [backloop.dev-bundle.crt](backloop.dev-bundle.crt) : Bundle of key + ca
- [pack.json](pack.json) : All this packed in a json file

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
