#!/usr/bin/env bash
# Copies the documentation in docs/ into the two apps that need it: the site
# gets one JSON module (apps/site/lib/docs.json), the indexer embeds the files
# (services/indexer/docs/). Run after editing docs/ and commit the results.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
rm -rf "$root/services/indexer/docs"
mkdir -p "$root/services/indexer/docs"
cp "$root"/docs/*.md "$root/services/indexer/docs/"
node "$root/scripts/docs-json.mjs" "$root/docs" "$root/apps/site/lib/docs.json"
echo "synced $(ls "$root"/docs/*.md | wc -l) documents"
