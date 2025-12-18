#!/bin/bash
# CADHY Release Script - Triggers build in CADHY repo
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version required"
  echo "Usage: ./scripts/release.sh 0.1.0-beta.1"
  exit 1
fi

echo "🚀 Launching release build for v$VERSION..."
echo ""

# Trigger workflow in CADHY repo
gh api repos/crhistian-cornejo/CADHY/dispatches \
  -X POST \
  -f event_type='build-release' \
  -f "client_payload[version]=$VERSION"

echo "✅ Build triggered successfully!"
echo ""
echo "Monitor progress:"
echo "https://github.com/crhistian-cornejo/CADHY/actions"
echo ""
echo "Release will be available at:"
echo "https://github.com/crhistian-cornejo/CADHY/releases/tag/v$VERSION"
echo ""
echo "⏱️  Estimated time: ~45 minutes"
