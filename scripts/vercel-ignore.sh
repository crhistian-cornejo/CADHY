#!/bin/bash
# Vercel Ignore Build Script
# Returns exit code 0 (skip build) if no changes in apps/web or packages/ui
# Returns exit code 1 (proceed with build) if there are changes

echo "Checking for changes in apps/web and packages/ui..."

# Use Vercel's built-in environment variable for comparison
if [ "$VERCEL_GIT_PREVIOUS_SHA" = "" ]; then
  echo "No previous SHA found - this is the first deploy, proceeding with build"
  exit 1
fi

# Fetch enough history to compare
git fetch --depth=2 origin $VERCEL_GIT_COMMIT_REF 2>/dev/null || true

# Check if the relevant folders changed
CHANGED=$(git diff --name-only $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA -- apps/web packages/ui 2>/dev/null)

if [ -z "$CHANGED" ]; then
  echo "No changes detected in apps/web or packages/ui - skipping build"
  exit 0
else
  echo "Changes detected:"
  echo "$CHANGED"
  echo "Proceeding with build..."
  exit 1
fi
