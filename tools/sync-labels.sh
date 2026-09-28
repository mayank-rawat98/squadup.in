#!/usr/bin/env bash
# Creates or updates every label CONTRIBUTING.md §2 describes. Idempotent, and
# it never deletes a label, so older labels (bug, auth, frontend…) survive.
#
#   gh auth login              # once
#   bash tools/sync-labels.sh
#
# The area: labels match SCOPES in commitlint.config.cjs. Add a scope to both.
set -euo pipefail

label() {
  gh label create "$1" --color "$2" --description "$3" --force >/dev/null
  echo "  $1"
}

echo "type:"
label "type: feature" "1D76DB" "New user-facing behaviour"
label "type: bug" "D73A4A" "Something behaves wrongly"
label "type: security" "B60205" "A vulnerability or hardening"
label "type: chore" "C5DEF5" "Maintenance, tooling, refactors, CI, tests"
label "type: docs" "0075CA" "Documentation only"
label "type: epic" "5319E7" "A body of work split into sub-issues"

echo "status:"
label "status: needs-info" "FBCA04" "Can't move until someone answers a question"
label "status: needs-design" "FBCA04" "Can't move until the design is agreed"
label "status: blocked" "E99695" "Waiting on other work; the issue says what"

echo "area:"
for scope in api web ops e2e; do
  label "area: $scope" "0E8A16" "apps/$scope"
done
label "area: ui" "0E8A16" "libs/ui, the shared design system"
for scope in auth users staff audits notifications feature-flags blogs search storage mail \
  arenas proctoring challenges board store seo; do
  label "area: $scope" "BFD4F2" "The $scope domain"
done
for scope in db docker caddy ci deploy monitoring devops; do
  label "area: $scope" "D4C5F9" "Infrastructure: $scope"
done
for scope in tests deps repo; do
  label "area: $scope" "EDEDED" "Repo-wide: $scope"
done
