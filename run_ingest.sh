#!/usr/bin/env bash
set -uo pipefail
cd /tmp/issue-sync-workers/tim-nish/kogaki/issue-1187
for slug in $(ls /home/tomoya/work/kogaki/corpus/p1187/in/ | sed 's/\.md$//'); do
  if [[ "$slug" == "define_attack_defense_advantage_through_opposed_security_cascades" ]]; then continue; fi
  if [[ "$slug" == "enter_a_hard_subject_through_the_readers_own_world" ]]; then
    SELECT="merge:enter_a_hard_subject_through_the_readers_own_world"
  else
    SELECT="accept"
  fi
  echo "=== $slug ($SELECT) ==="
  python3 tools/move_ingest.py passage /home/tomoya/work/kogaki/corpus/p1187/in/$slug.md \
    --model claude-sonnet-5 --out /home/tomoya/work/kogaki/corpus/p1187/out3/$slug --select "$SELECT" 2>&1 | tail -5
done
