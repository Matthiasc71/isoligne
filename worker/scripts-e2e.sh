#!/usr/bin/env bash
# Worker local pour le test e2e de synchro : base D1 neuve, origine de l'app de test.
set -euo pipefail
cd "$(dirname "$0")"
PERSIST=.wrangler/e2e
rm -rf "$PERSIST"
[ -f .dev.vars ] || printf 'SEL=sel-de-test-local-uniquement-0123\n' > .dev.vars
npx wrangler d1 migrations apply isoligne --local --persist-to "$PERSIST" > /dev/null
exec npx wrangler dev --port 8789 --ip 127.0.0.1 --persist-to "$PERSIST" --var ORIGINES:http://localhost:4174
