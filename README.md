# `backloop.dev`

Loopback domain and SSL certificates for HTTPS on localhost.

> ## No longer a public service
>
> backloop.dev used to publish a browser-trusted wildcard certificate that anyone
> could download. It cannot: a public certificate authority is obliged to revoke any
> certificate whose private key is published, and both authorities did — Let's Encrypt
> within about nine hours, Sectigo within about two days. The public service ended on
> 2026-09-04 and <https://backloop.dev> now explains what happened in full.
>
> The project continues as a private setup used by its author. The code still works, but
> downloading a certificate now requires a secret, and access is not open.
>
> **Looking for HTTPS on localhost?** Use a local certificate authority:
> [mkcert](https://github.com/FiloSottile/mkcert),
> [Caddy's internal CA](https://caddyserver.com/docs/automatic-https#local-https), or
> [vite-plugin-mkcert](https://github.com/liuweiGL/vite-plugin-mkcert). All install a
> root into your trust store — the trade-off backloop.dev existed to avoid, and the
> only one a public authority is not obliged to break.

## Why it existed

When you develop web applications that make heavy use of AJAX REST requests, browsers
enforce HTTPS-only policies to prevent **mixed content** between HTTP and HTTPS
sources. backloop.dev certificates enabled HTTPS on localhost without a self-signed
certificate or a root CA in your trust store.

All `*.backloop.dev` hostnames still point to `127.0.0.1` and `::1`. That part of the
setup is unaffected — it is the public certificate that is gone. The last one is still
downloadable from the old URLs, but it is revoked and is not renewed.

## Where the code lives

The two packages were split out of this repository on 2026-09-04, each into a repository
whose root is the package — npm cannot install a subdirectory of a git repository, and
being installable by URL is the point.

| | |
|---|---|
| [perki/backloop.dev-node](https://github.com/perki/backloop.dev-node) | The `backloop.dev` package: Node API, static file server, reverse proxy, multi-host HTTPS gateway. **The canonical documentation lives there.** |
| [perki/backloop.dev-vite](https://github.com/perki/backloop.dev-vite) | The `vite-plugin-backloop.dev` plugin. |
| [renew](./renew) | Certificate renewal infrastructure. Let's Encrypt has blocklisted the domain, so it can no longer complete. |

What is left here is the website served at <https://backloop.dev>, the renewal code, and
the project-wide notes.

## Installing

```bash
npm install backloop.dev
```

Every version below 4.0.0 is deprecated, so anyone installing the old public-service
releases is told what happened. 4.x and later are not — those are the versions that work,
and a warning on every install of them would be noise. What the npm builds do carry is a
line at start-up saying the package is no longer updated there, because installing from
the repository is where this is heading:

```bash
npm install github:perki/backloop.dev-node#v5.0.0
```

Certificates are downloaded from a path only reachable with a secret. If you have one,
[the package README](https://github.com/perki/backloop.dev-node#configuring-the-secret) covers the places it can be
configured. If you do not, the package installs cleanly and prints a notice rather than
failing — but it cannot fetch a certificate, and there is no way to request one. Use one
of the local-CA tools above instead.

Already hold the certificate files? Point `BACKLOOP_DEV_CERTS_DIR` at a directory
containing a valid `pack.json` and no secret is needed at all.

## For AI agents

- [AGENTS.md](./AGENTS.md) — repository map, dev commands and conventions.
- [https://backloop.dev/llms.txt](https://backloop.dev/llms.txt) — summary of what the
  project was and why it ended, with
  [llms-full.txt](https://backloop.dev/llms-full.txt) for the full account.

## License

[BSD-3-Clause](https://github.com/perki/backloop.dev/blob/main/LICENSE)
