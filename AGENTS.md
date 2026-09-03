# AGENTS.md — backloop.dev (monorepo)

Guidance for AI coding agents working on this repository.

## What this project is

`backloop.dev` provides HTTPS on localhost for local development:

- DNS: **any** subdomain of `*.backloop.dev` resolves to `127.0.0.1` and `::1`.
- A publicly shared, publicly trusted wildcard SSL certificate for `*.backloop.dev`, renewed regularly and published on https://backloop.dev.
- Certificates are **not bundled** in the npm package: they are downloaded from `https://backloop.dev/pack.json` at install time (postinstall) and refreshed at runtime when close to expiry.

The apex domain `backloop.dev` is the only exception: it points to the certificate download page (GitHub Pages).

## Repository map

| Path | What it is |
|---|---|
| `nodejs/` | The `backloop.dev` npm package: Node API (`httpsOptions*`), CLI static server, reverse proxy, multi-host config server, cert updater. Most of the code and docs live here. |
| `vitejs/` | The `vite-plugin-backloop.dev` npm package: thin Vite plugin wrapping `nodejs/`. |
| `renew/` | Certificate renewal infrastructure (Let's Encrypt + Gandi DNS). Writes its output into `dist/`. Let's Encrypt now refuses to issue for this domain, so it cannot complete — see `renew/README.md`. **Do not modify unless explicitly asked.** |
| `.github/workflows/` | The renewal workflow, manual-only and non-publishing. |
| `dist/` | The https://backloop.dev website, built locally: `index.html`, cert files, `pack.json`, `llms.txt`, `robots.txt`. Gitignored, and **copied by hand onto the Apache server at Gandi** — there is no deploy automation. |
| branch `renew-gh-pages` | Dead since 2024; kept only as an archive. |

There is no root `package.json`: `nodejs/`, `vitejs/` and `renew/` are independent npm projects.

## Develop and test

```bash
cd nodejs
npm install
npm test          # Node.js built-in test runner (Node 18+ required)
npm run lint      # eslint with neostandard
```

`vitejs/` has no tests; `renew/` cannot be run without production secrets.

## Gotchas

- `npm install` in `nodejs/` triggers `postinstall: node bin/update.js`, which **needs network access** to fetch `https://backloop.dev/pack.json`. In a sandboxed/offline environment, install with `npm install --ignore-scripts` and pre-seed certificates by pointing `BACKLOOP_DEV_CERTS_DIR` to a directory containing a valid `pack.json`.
- `src/check.js` exits the process if the certs directory does not exist. The default is `nodejs/certs/` (kept by `.gitkeep`).
- The private key is published split in two files (`backloop.dev-key.part1.pem` + `part2`); concatenate them to get the usable key. `pack.json` carries them as `key1` + `key2`.
- The published cert is intentionally public (it only secures loopback traffic); do not "fix" this by treating it as a leaked secret.

## Conventions

- License: BSD-3-Clause. Source files carry a `@license` header, managed via `.licenser.yml`.
- Lint style: [neostandard](https://github.com/neostandard/neostandard) (no semicolon-free style — run `npm run lint` before committing).
- `nodejs/CHANGELOG.md` is updated for every release; version lives in `nodejs/package.json`.
- `vitejs/` depends on `backloop.dev` with a `^` range — when releasing a breaking change in `nodejs/`, also update and release `vitejs/`.
- Keep `nodejs/README.md` the canonical documentation; the root README and the website only summarize and link to it.

## Documentation surfaces to keep in sync

When user-facing behavior changes, update all that apply:

1. `nodejs/README.md` (canonical docs, shipped to npm)
2. `nodejs/AGENTS.md` and `vitejs/AGENTS.md` (shipped to npm)
3. Root `README.md`
4. `dist/`: `index.html`, `llms.txt`, `llms-full.txt` (the website) — then copy `dist/` to the Gandi server, since nothing publishes it automatically
