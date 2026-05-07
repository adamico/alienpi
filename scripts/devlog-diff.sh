#!/usr/bin/env bash
# Print a markdown-formatted commit list between two refs (typically tags),
# ready to paste into a devlog or changelog.
#
# Usage:
#   scripts/devlog-diff.sh <from-ref> [<to-ref>]
#   scripts/devlog-diff.sh v0.1.5 v0.1.6
#   scripts/devlog-diff.sh v0.1.5            # to-ref defaults to HEAD
#
# Output:
#   - Heading with "<from> -> <to>"
#   - Diffstat summary (commit count + file/line changes)
#   - Non-merge commits in <from>..<to>, oldest first, grouped by
#     Conventional-Commit type (feat, fix, perf, refactor, docs, test,
#     build, ci, chore, style, other).
#
# Pipe to pbcopy / a file as needed:
#   scripts/devlog-diff.sh v0.1.5 v0.1.6 | pbcopy
#   scripts/devlog-diff.sh v0.1.5 v0.1.6 > devlog-0.1.6.md

set -euo pipefail

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Usage: $0 <from-ref> [<to-ref>]" >&2
  exit 2
fi

FROM="$1"
TO="${2:-HEAD}"

git rev-parse --verify --quiet "$FROM" >/dev/null \
  || { echo "Unknown ref: $FROM" >&2; exit 1; }
git rev-parse --verify --quiet "$TO" >/dev/null \
  || { echo "Unknown ref: $TO" >&2; exit 1; }

RANGE="${FROM}..${TO}"

printf '## %s -> %s\n\n' "$FROM" "$TO"

git log --no-merges --reverse --pretty=format:'%s' "$RANGE" \
  | awk '
    BEGIN {
      n = split("feat fix perf refactor docs test build ci style", order, " ")
      label["feat"]     = "New"
      label["fix"]      = "fix"
      label["perf"]     = "perf"
      label["refactor"] = "refactor"
      label["docs"]     = "docs"
      label["test"]     = "test"
      label["build"]    = "build"
      label["ci"]       = "ci"
      label["style"]    = "style"
      for (i = 1; i <= n; i++) idx[order[i]] = i
    }
    {
      subject = $0
      if (!match(subject, /^[a-z]+(\([^)]+\))?!?: /)) next
      head = substr(subject, 1, RLENGTH - 2)
      rest = substr(subject, RLENGTH + 1)
      t = head
      sub(/[(!].*$/, "", t)
      if (!(t in idx)) next
      scope = head
      sub(/^[a-z]+/, "", scope)
      if (scope != "") rest = scope ": " rest
      bucket[t] = bucket[t] "- " rest "\n"
    }
    END {
      for (i = 1; i <= n; i++) {
        t = order[i]
        if (t in bucket) {
          printf "### %s\n\n%s\n", label[t], bucket[t]
        }
      }
    }
  '
