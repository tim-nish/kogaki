#!/usr/bin/env bash
# Runs the client kit's own install test as a registered check, so the kit's
# guarantees fire in CI rather than only when someone remembers to run them.
# The kit test is cwd-independent (it resolves its own directory), so this is
# a thin invoker and holds no assertions of its own — the assertions belong
# to the kit and stay there. kogaki#9, story 1.4.
set -euo pipefail
cd "$(dirname "$0")/.."

exec bash policy/kit/test/install-test.sh
