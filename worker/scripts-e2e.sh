#!/usr/bin/env bash
# Worker local pour le test e2e de synchro : base D1 neuve, origine de l'app de test.
set -euo pipefail
cd "$(dirname "$0")"
PERSIST=.wrangler/e2e
rm -rf "$PERSIST"
[ -f .dev.vars ] || printf 'SEL=sel-de-test-local-uniquement-0123\n' > .dev.vars
npx wrangler d1 migrations apply isoligne --local --persist-to "$PERSIST" > /dev/null
# Clé VAPID de test (jamais versionnée) et faux service de push local (tests/e2e-synchro).
VAPID=$(node -e "crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign']).then(p=>crypto.subtle.exportKey('jwk',p.privateKey)).then(j=>process.stdout.write(JSON.stringify(j)))")
exec npx wrangler dev --var ESPACES_MAX:1000 --port 8789 --ip 127.0.0.1 --persist-to "$PERSIST" --var ORIGINES:http://localhost:4174 \
  --var "VAPID_JWK:$VAPID" --var PUSH_TEST:http://127.0.0.1:8798
