#!/usr/bin/env bash
# Test d'intégration : base D1 locale neuve, wrangler dev, puis vitest.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf .wrangler/state
[ -f .dev.vars ] || printf 'SEL=sel-de-test-local-uniquement-0123\n' > .dev.vars
npx wrangler d1 migrations apply isoligne --local > /dev/null
npx wrangler dev --port 8788 --ip 127.0.0.1 > .wrangler-integration.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:8788/ && break; sleep 1; done
WORKER_URL=http://127.0.0.1:8788 npx vitest run test/integration.test.ts
# Le test précédent épuise volontairement la limite de débit : on la remet à zéro.
npx wrangler d1 execute isoligne --local --command "DELETE FROM limites" > /dev/null
# De bout en bout : deux vrais services de synchro de l'app contre ce Worker.
(cd .. && WORKER_URL=http://127.0.0.1:8788 npx vitest run tests/unit/synchro-reelle.test.ts)
