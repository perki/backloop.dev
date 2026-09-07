# AGENTS.md — backloop.dev

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

1. **The secret must never be committed.** Every repository involved is public, so the
   obvious mistake is a working default in a README, a test fixture, or a CI workflow.
   There is no default value anywhere, and `backloop.dev.json` / `.backloop.dev.json` are
   gitignored here and in both package repositories.
2. **Never write a way to obtain a secret.** No email address, no contact route, no
   request form, no "ask the author". Documenting how to *configure* a secret is fine and
   necessary — someone holding one must be able to use it unaided. Documenting how to
   *get* one is not.
3. **The apex site says the project is discontinued and stops there.** `dist/index.html`,
   `llms.txt` and `llms-full.txt` must not mention secrets, private access, or any way to
   get in touch about it. Pointing at `dist/public/` is fine and intended: that certificate
   is for everybody and needs no secret, so describing it gives nothing away.

What this buys, so it is not oversold: it stops the automated key scanners and CT-log
crawlers that found the key within hours, twice. It does **not** make the setup
compliant. The key still reaches more than one party, so a CA that learns of it must
still revoke. Plan on rotation, and on the certificate dying again eventually. This is a
documented, accepted trade-off.

## What is where

The two packages were split out of this repository on 2026-09-04, each into a repository
whose root is the package — npm cannot install a subdirectory of a git repository, and
being installable by URL is where this is heading.

| | |
|---|---|
| [perki/backloop.dev-node](https://github.com/perki/backloop.dev-node) | The `backloop.dev` package. **Canonical documentation.** `src/secret.js` there is the single place that knows how the secret is resolved and how the download URL is built. |
| [perki/backloop.dev-vite](https://github.com/perki/backloop.dev-vite) | The `vite-plugin-backloop.dev` plugin. Depends on `backloop.dev@^5.0.0` from npm. |

What remains here:

| Path | What it is |
|---|---|
| `dist/` | The https://backloop.dev website, **copied by hand onto the Apache server at Gandi** — there is no deploy automation. The five authored files (`index.html`, `llms.txt`, `llms-full.txt`, `robots.txt`, `public/index.html`) are committed, because they have no other source and losing `dist/` would lose them for good. Everything else under `dist/` is gitignored by an allowlist, so neither a `dist/<secret>/` certificate directory nor the public certificate's key can be committed by accident. |
| `dist/public/` | The shared self-signed certificate and its install page. Deliberately public: it is the answer for anyone without a secret. |
| `tools/build-pack.js` | Builds a `dist/<secret>/` directory from a commercial CA delivery. No dependencies, no secrets — delivery, key and destination are arguments. |
| `tools/build-public-pack.js` | Generates the shared self-signed certificate served at `dist/public/`. Refuses to write anything that is not a `CA:FALSE` leaf. |
| `tools/set-notice.js` | Sets or clears the `notice` in a published `pack.json` — the one channel that reaches installed copies. |
| `tools/setup.sh` | Clones both package repositories into `packages/`, installs them, links the plugin against the local node checkout. |
| `packages/` | Development checkouts of the two package repositories. Gitignored; they have their own remotes. |
| `renew/` | Certificate renewal infrastructure (ACME + Gandi DNS-01). Kept deliberately, in case issuance for this domain becomes possible again. It cannot complete today: the blocklist is on the *domain name*, so keeping the key private does not lift it. **Do not modify unless explicitly asked.** |
| `.github/workflows/` | The renewal workflow, manual-only and non-publishing. |
| `_temp/` | Working notes, the migration plan, and archived material. Gitignored. |
| branch `renew-gh-pages` | Dead since 2024; kept only as an archive. |

## Develop and test

This repository is the hub for the whole project. `tools/setup.sh` clones both package
repositories into `packages/`, installs them, and symlinks the plugin's `backloop.dev`
dependency at the local node checkout, so a change in one is testable from the other
without publishing anything:

```bash
./tools/setup.sh              # set BACKLOOPDEV first if you want certificates fetched
cd packages/backloop.dev-node
npm test                      # Node.js built-in test runner (Node 18+ required)
npm run lint                  # eslint with neostandard
```

Safe to re-run: existing checkouts are fast-forwarded, never reset, and one with
uncommitted work is left alone and reported. The symlink is deliberate rather than
`npm link` — no global state to clean up, and the plugin's `package.json` keeps pointing
at the published `^5.0.0`, so nothing local can leak into a release.

`packages/` is gitignored. Both are independent repositories with their own remotes:
commit and push inside each. The plugin has no tests; `renew/` cannot be run at all any
more.

## Distribution

npm, with `npm install backloop.dev` unchanged — and that is deliberate. The packages are
used across more than a hundred projects; a semver range that already resolves plus one
`BACKLOOPDEV` per machine beats editing a hundred manifests on the same day. Each project
then moves to `github:perki/backloop.dev-node#v5.0.0` on its own schedule. npm is the
bridge; the split repositories are the destination.

Without a secret the package is inert, so publishing it distributes nothing sensitive.

**Deprecation stops below 4.0.0** — `npm deprecate backloop.dev@"<4"`, and `@"<2"` for
the plugin. The public-service releases carry the message, which is what a stranger
running `npm install backloop.dev` lands on, since they get 3.1.0. 4.x and later are
deliberately left clean: those are the versions that work, and a warning on every install
would be noise in every project that legitimately uses them. Telling *those* projects to
move is the npm branch's job instead (below), which says it once per process at start-up
rather than once per install. **Widen to `@"*"` only at the end of the migration.**
Deprecated, never unpublished — unpublishing breaks existing consumers, npm disallows it
after 72 hours, and removing the packages entirely is very unlikely to be possible at
all.

npm honours the `files` field for a git install too — it packs the clone the same way —
so the contents are identical whichever route is used, apart from the one file below.

### The npm branch

Neither package is published from `main`. Each has an `npm` branch that is `main` **plus
exactly one file** — `src/npm-distribution-warning.js` in the node package,
`npm-distribution-warning.js` in the plugin — and that branch is what goes to the
registry. So a copy installed from npm says at start-up that the package is no longer
updated there and names the git URL to switch to, and a copy installed from git says
nothing. Seeing the message means the project you are in has not migrated yet; that
signal is the whole point, so it is deliberately not silenceable.

The hook lives on `main` and the branch only ever *adds* — so a rebase can never conflict
and the published build cannot drift from the tag it claims. **Keep it that way.** Because
that tarball differs from the same-named tag by one file, a `-npm` tag (`v5.0.0-npm`,
`v2.2.0-npm`) marks exactly what was published. The procedure lives in each package's own
`AGENTS.md`; it ends with `git checkout main`, and a checkout left on `npm` is a publish
that was not finished.

**One cross-repository contract:** only one warning is shown per process. A Vite project
loads both packages, and each saying the same thing gave sixteen lines. Whichever speaks
first claims `Symbol.for('backloop.dev.distributionWarningShown')` on `globalThis` and the
other stays quiet — change that symbol name in one repository and you must change it in
the other.

## The public certificate

Since 2026-09-07 the package is useful again to people with no secret, which is most
people. `https://backloop.dev/public/pack.json` serves a shared, self-signed certificate
for `*.backloop.dev`, published with its private key exactly as the old public service
was. The difference is the one that matters: **no certificate authority issued it, so no
authority can be obliged to revoke it.** §4.9.1.1 binds authorities, and there is no
authority here to bind.

The cost is that browsers reject it until somebody installs it, once per machine, which
is what `dist/public/index.html` is for. That is a real cost and the page says so rather
than glossing it.

**It is a leaf and must stay one.** `CA:FALSE`, `serverAuth` only. A root certificate
whose private key is public would let anyone holding that key mint a certificate for any
hostname at all, for every person who installed it: their bank, their mail, everything.
As a leaf, the worst case is impersonating `*.backloop.dev` origins, which already point
at loopback and which `/etc/hosts` pinning already covers. Every tutorial teaches
root-plus-leaf because that is correct when the root key stays local, so the wrong shape
is the one somebody will reach for by default. `tools/build-public-pack.js` refuses to
write anything else, and that refusal is load-bearing.

Measured on macOS 26 on 2026-09-07, and worth not rediscovering:

- A user-installed self-signed **leaf** is accepted as a trust anchor. Chrome and Safari
  both load it clean once `security add-trusted-cert -p ssl` has run.
- **Apple's 825-day ceiling does not apply to it.** A 3650-day certificate verifies and
  loads with no warning, the same carve-out Apple states explicitly for the later
  398-day rule. So the certificate is issued for ten years: rotation costs every
  installed user a manual reinstall, and there is no revocation to force one.
- **Firefox will not take it.** It uses its own store and will not accept a non-CA as an
  authority. Documented as a limitation on the install page, not worked around.
- **Removing it needs `security remove-trusted-cert`, and nothing else does the job.**
  `security delete-certificate` removes the certificate from the keychain and leaves the
  trust setting behind, so the machine keeps trusting a certificate that is no longer
  there. `security dump-trust-settings` reports "No Trust Settings were found" the entire
  time, so it cannot be used to confirm removal. Verified both ways by serving the
  certificate and loading it in Chrome. The install page leads with this, because a user
  who cannot undo an install of a published private key has a real problem.

Rotating means everyone reinstalls. Announce it through the pack's `notice` field months
ahead, and remember `notice` only reaches 4.1.0 and later.

## The old certificate is still served, on purpose

`https://backloop.dev/pack.json` answers with the **old, revoked** certificate — issued
by a free authority, revoked 2026-07-31, expiring 2026-10-29 — so that installs of
`backloop.dev` v3 and the v1 plugin keep working instead of breaking. That is not
cosmetic: v3's postinstall has no `catch`, so a 404 there aborts the whole `npm install`,
not just the download. Measured both ways on 2026-09-04.

The five individual certificate files (`backloop.dev-cert.crt` and friends) are **not**
restored and return 404. They were the human download path and nothing links to them any
more; only `pack.json` matters, because that is what the package fetches.

Never describe `pack.json` as returning 404, and never present it as current. **A copy to
Gandi must not delete server-side files** — no `rsync --delete`, or the old pack and the
secret directory both disappear. That has already happened once.

## Publishing a new certificate

A commercial delivery arrives as four files. `tools/build-pack.js` turns them and the
private key into the published directory, mirroring `renew/src/saveccert.js` and
`renew/src/pack.js` exactly — same chain order, same 600-character key split, same
`pack.json` fields and `info` shape — because installed copies of the package parse it:

```bash
node tools/build-pack.js <delivery-dir> <key-file> dist/<secret>
```

It refuses to write anything if the certificate does not match the key. The delivery's
USERTrust root is deliberately left out of the chain: it is already in every trust store.

Then check the certificate before publishing it, and periodically afterwards — that is
what catches a revocation on the day rather than a day late:

```bash
openssl ocsp -issuer <delivery>/*DomainValidationSecureServerCA.crt \
  -cert <delivery>/STAR_backloop_dev.crt \
  -url http://ocsp.sectigo.com -header "Host=ocsp.sectigo.com" -no_nonce
```

**The private key is not in this repository and must never be.** It is also not in any
backup unless you put it in one; without it the certificate is worthless.

## Telling people something

`pack.json` may carry a `notice`, which `backloop.dev` 4.1.0 and later print once at
start-up. It is the only channel to installed copies — a secret rotation with a date, in
practice.

```bash
node tools/set-notice.js dist/<secret>/pack.json "The secret changes on 2027-01-15." 2027-01-20
node tools/set-notice.js dist/<secret>/pack.json --clear
```

Always give an end date for anything with a deadline: a pack sits on a consumer's disk
until the certificate nears expiry, so a notice without one nags for months about a date
already gone.

Two limits worth stating before relying on it. It reaches **only** installations on
4.1.0 or later — older ones ignore the field. And it is read from the pack the consumer
has, so someone whose certificate is still valid sees it only after their next refresh.
Announce early, not on the day.

Do **not** repurpose `pack.json`'s `version.message` for this. It fires only when
`version.num` exceeds the package's hardcoded `versionNum`, and it then calls
`process.exit(1)` — using it to announce anything would stop the dev server of everyone
who had not yet migrated.

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
- Lint style in the package repositories: [neostandard](https://github.com/neostandard/neostandard).
- A breaking change in `backloop.dev-node` means a release of `backloop.dev-vite` too.
- Keep the node package's `README.md` the canonical documentation; the README here and
  the website only summarize and link to it.

## Documentation surfaces to keep in sync

When user-facing behavior changes, update all that apply:

1. `README.md` in [backloop.dev-node](https://github.com/perki/backloop.dev-node) (canonical), and its `AGENTS.md` and `CHANGELOG.md`
2. `README.md` and `AGENTS.md` in [backloop.dev-vite](https://github.com/perki/backloop.dev-vite)
3. This repository's `README.md`
4. `dist/`: `index.html`, `llms.txt`, `llms-full.txt` — then copy `dist/` to the Gandi
   server, since nothing publishes it automatically. Remember rule 3 above: these three
   files say the project is discontinued and stop there.
