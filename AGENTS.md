# AGENTS.md — backloop.dev (monorepo)

Guidance for AI coding agents working on this repository.

## Read this first

backloop.dev is **no longer a public service**, as of 2026-09-04.

It used to publish a browser-trusted wildcard certificate for `*.backloop.dev` that
anyone could download. That cannot work: CA/Browser Forum Baseline Requirements §4.9.1.1
obliges a certificate authority to revoke within 24 hours of evidence that a private key
is compromised, and publishing the key is that evidence. Let's Encrypt revoked in about
nine hours and blocklisted the domain; Sectigo revoked in about two days. The site now
explains this in full.

The project continues privately, for its author's own projects. The certificate is still
distributed, but no longer *discoverable*: it sits behind a path segment you need a
secret to reach.

Three rules follow, and they matter more than anything else in this file:

1. **The secret must never be committed.** This repository is public and carries the
   installation instructions, so the obvious mistake is a working default in a README, a
   test fixture, or a CI workflow. There is no default value anywhere in the tree, and
   `backloop.dev.json` / `.backloop.dev.json` are gitignored.
2. **Never write a way to obtain a secret.** No email address, no contact route, no
   request form, no "ask the author". Documenting how to *configure* a secret is fine and
   necessary — someone holding one must be able to use it unaided. Documenting how to
   *get* one is not.
3. **The apex site says the project is discontinued and stops there.** `dist/index.html`,
   `llms.txt` and `llms-full.txt` must not mention secrets, private access, or any way to
   get in touch about it.

What this buys, so it is not oversold: it stops the automated key scanners and CT-log
crawlers that found the key within hours, twice. It does **not** make the setup
compliant. The key still reaches more than one party, so a CA that learns of it must
still revoke. Plan on rotation, and on the certificate dying again eventually. This is a
documented, accepted trade-off.

## What this project is

- DNS: **any** subdomain of `*.backloop.dev` resolves to `127.0.0.1` and `::1`. Still live.
- A wildcard certificate for `*.backloop.dev`, distributed to holders of a secret.
- Certificates are **not bundled** in the package: they are downloaded at install time
  (postinstall) and refreshed at runtime when close to expiry.

## Repository map

| Path | What it is |
|---|---|
| `nodejs/` | The `backloop.dev` package: Node API (`httpsOptions*`), CLI static server, reverse proxy, multi-host config server, cert updater. Most of the code and docs live here. `src/secret.js` is the single place that knows how the secret is resolved and how the download URL is built. |
| `vitejs/` | The `vite-plugin-backloop.dev` package: thin Vite plugin wrapping `nodejs/`. |
| `renew/` | Certificate renewal infrastructure (Let's Encrypt + Gandi DNS). Let's Encrypt has blocklisted the domain, so it cannot complete and is kept for reference. **Do not modify unless explicitly asked.** |
| `.github/workflows/` | The renewal workflow, manual-only and non-publishing. |
| `dist/` | The https://backloop.dev website: `index.html` (the shutdown notice), `llms.txt`, `llms-full.txt`, `robots.txt` — and nothing else. Gitignored, and **copied by hand onto the Apache server at Gandi** — there is no deploy automation. The certificate files live in a `dist/<secret>/` directory that is never committed and never named in any document. |
| `_temp/` | Working notes, plans and archived material. Gitignored. |
| branch `renew-gh-pages` | Dead since 2024; kept only as an archive. |

There is no root `package.json`: `nodejs/`, `vitejs/` and `renew/` are independent npm projects.

## Distribution

Still npm, and deprecated rather than unpublished — unpublishing breaks existing
consumers and npm disallows it after 72 hours. The deprecation message is what tells
every installer, including old versions, that this is no longer a public service.

Installing straight from git is **not** an option and should not be suggested: there is
no `package.json` at the repository root, and npm cannot install a subdirectory of a git
repository. `npm install github:perki/backloop.dev` fails with `ENOENT ... package.json`.
Verified 2026-09-04.

Without a secret the package is inert, so publishing it distributes nothing sensitive.

## Develop and test

```bash
cd nodejs
npm install
npm test          # Node.js built-in test runner (Node 18+ required)
npm run lint      # eslint with neostandard
```

`vitejs/` has no tests; `renew/` cannot be run at all any more.

## Gotchas

- `npm install` in `nodejs/` triggers `postinstall: node bin/update.js --postinstall`,
  which needs network access **and** a configured secret. Without either it prints a
  notice and exits 0 — it must never fail the install. A deliberate `backloop.dev-update`
  exits 1 on the same failure; keep that asymmetry.
- In a sandboxed or offline environment, install with `npm install --ignore-scripts` and
  pre-seed certificates by pointing `BACKLOOP_DEV_CERTS_DIR` at a directory containing a
  valid `pack.json`. No secret is needed on that path.
- `src/check.js` exits the process if the certs directory does not exist. The default is
  `nodejs/certs/` (kept by `.gitkeep`, which must keep travelling in git installs).
- The private key is distributed split in two files (`backloop.dev-key.part1.pem` +
  `part2`); concatenate them to get the usable key. `pack.json` carries them as `key1` +
  `key2`. The split delays naive scanners and nothing more — do not describe it as a
  security measure.

## Serving from Gandi

`.htaccess` is ignored on that server (`AllowOverride None`), so nothing about the web
server can be fixed from this repository. Two properties were verified live on
2026-09-04 and must be re-verified after any server change:

- **Directory listing is off.** A request to an existing directory with no `index.html`
  returns a bare `403 Forbidden`. If that ever became a listing, `https://backloop.dev/`
  would expose the secret directory name and the whole scheme would collapse.
- **`robots.txt` does not name the secret directory.** Naming it — even to disallow it —
  publishes it. Secrecy comes from there being no inbound link anywhere.

Access logs contain the secret on every request. Whoever can read Gandi's logs can read
the secret. Acceptable, worth knowing.

Rotation: upload `dist/<new>/`, tell the holders, delete `dist/<old>/` after a grace
period. Consumers with the old secret get a 404 and the error message tells them what
happened.

## Conventions

- License: BSD-3-Clause. Source files carry a `@license` header, managed via `.licenser.yml`.
- Lint style: [neostandard](https://github.com/neostandard/neostandard) — run `npm run lint` before committing.
- `nodejs/CHANGELOG.md` is updated for every release; version lives in `nodejs/package.json`.
- `vitejs/` depends on `backloop.dev` — when releasing a breaking change in `nodejs/`, also update and release `vitejs/`.
- Keep `nodejs/README.md` the canonical documentation; the root README and the website only summarize and link to it.

## Documentation surfaces to keep in sync

When user-facing behavior changes, update all that apply:

1. `nodejs/README.md` (canonical docs)
2. `nodejs/AGENTS.md` and `vitejs/AGENTS.md`
3. Root `README.md`
4. `dist/`: `index.html`, `llms.txt`, `llms-full.txt` — then copy `dist/` to the Gandi
   server, since nothing publishes it automatically. Remember rule 3 above: these three
   files say the project is discontinued and stop there.
