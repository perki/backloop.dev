#! /usr/bin/env bash
#
# Sets this repository up as the development hub for all of backloop.dev.
#
# The two packages live in their own repositories — npm cannot install a
# subdirectory of a git repository, and being installable by URL is the point —
# but development still wants them side by side. This clones both into
# packages/, installs their dependencies, and points the plugin at the local
# node package so a change in one is testable from the other without publishing.
#
# Safe to re-run: existing checkouts are fast-forwarded, never reset. Anything
# you have uncommitted is left alone and reported.
#
#   ./tools/setup.sh
#
# Set BACKLOOPDEV first if you want the certificate fetched at install time.
# Without it the install still succeeds and prints a notice.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKGS="$ROOT/packages"
NODE_DIR="$PKGS/backloop.dev-node"
VITE_DIR="$PKGS/backloop.dev-vite"

clone_or_update () {
  local url="$1" dir="$2" name="$3"
  if [ -d "$dir/.git" ]; then
    if [ -n "$(git -C "$dir" status --porcelain)" ]; then
      echo "  $name: local changes, leaving it alone"
      return
    fi
    git -C "$dir" fetch --quiet --tags origin
    local branch; branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"
    if [ "$branch" = "HEAD" ]; then
      echo "  $name: detached HEAD, leaving it alone"
    else
      git -C "$dir" merge --quiet --ff-only "origin/$branch" 2>/dev/null \
        && echo "  $name: up to date on $branch" \
        || echo "  $name: cannot fast-forward $branch, leaving it alone"
    fi
  else
    git clone --quiet "$url" "$dir"
    echo "  $name: cloned"
  fi
}

echo "packages"
mkdir -p "$PKGS"
clone_or_update https://github.com/perki/backloop.dev-node.git "$NODE_DIR" backloop.dev-node
clone_or_update https://github.com/perki/backloop.dev-vite.git "$VITE_DIR" backloop.dev-vite

echo
echo "dependencies"
# The node package's postinstall wants a secret. Without one it prints a notice
# and exits 0, so this never fails the setup either way.
( cd "$NODE_DIR" && npm install --silent ) && echo "  backloop.dev-node: installed"
( cd "$VITE_DIR" && npm install --silent ) && echo "  backloop.dev-vite: installed"

echo
echo "linking the plugin against the local node package"
# A symlink rather than `npm link`: no global state to clean up later, and the
# plugin's package.json keeps pointing at the published ^4.0.0, so nothing here
# can leak into a release.
rm -rf "$VITE_DIR/node_modules/backloop.dev"
ln -s "$NODE_DIR" "$VITE_DIR/node_modules/backloop.dev"
# `exports` in the package does not expose ./package.json, so read the file and
# resolve the entry point separately — the point is to prove the symlink lands
# on the local checkout, not on something npm fetched.
LINKED="$(node -p "require('$NODE_DIR/package.json').version")"
RESOLVED="$(cd "$VITE_DIR" && node -p "require.resolve('backloop.dev')")"
echo "  vite → node, resolving $LINKED"
case "$RESOLVED" in
  "$NODE_DIR"/*) echo "  entry point: $RESOLVED" ;;
  *) echo "  LINK NOT EFFECTIVE — resolved to $RESOLVED"; exit 1 ;;
esac

echo
echo "checks"
( cd "$NODE_DIR" && npm test --silent >/dev/null 2>&1 && echo "  tests pass" || echo "  TESTS FAIL — run npm test in $NODE_DIR" )
( cd "$NODE_DIR" && npm run lint --silent >/dev/null 2>&1 && echo "  lint clean" || echo "  LINT FAILS — run npm run lint in $NODE_DIR" )

cat <<EOF

ready.

  packages/backloop.dev-node    the package        npm test, npm run lint
  packages/backloop.dev-vite    the Vite plugin    linked to the checkout above

Both are independent git repositories with their own remotes; commit and push
inside each. packages/ is gitignored here, so nothing about them is tracked by
this repository.
EOF
