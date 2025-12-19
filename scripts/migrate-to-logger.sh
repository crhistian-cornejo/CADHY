#!/usr/bin/env bash
#
# migrate-to-logger.sh
# Migrates console.log/warn/info/debug to logger equivalents
# Usage: ./scripts/migrate-to-logger.sh
#

set -e

echo "🔍 Searching for TypeScript files to migrate..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

total_files=0
total_changes=0

# Function to process a single file
process_file() {
  local file="$1"
  local content
  local new_content
  local changes=0

  content=$(cat "$file")
  new_content="$content"

  # Check if file already has logger import
  has_logger_import=$(echo "$content" | grep -c "from '@cadhy/shared/logger'" || true)

  # Count occurrences
  log_count=$(echo "$content" | grep -o 'console\.log' | wc -l | tr -d ' ')
  warn_count=$(echo "$content" | grep -o 'console\.warn' | wc -l | tr -d ' ')
  info_count=$(echo "$content" | grep -o 'console\.info' | wc -l | tr -d ' ')
  debug_count=$(echo "$content" | grep -o 'console\.debug' | wc -l | tr -d ' ')

  total=$((log_count + warn_count + info_count + debug_count))

  if [ "$total" -eq 0 ]; then
    return 0
  fi

  echo -e "${YELLOW}📝 $file${NC}"
  echo "   Found: $log_count log, $warn_count warn, $info_count info, $debug_count debug"

  # Replace console.* with logger.*
  new_content=$(echo "$new_content" | sed 's/console\.log\b/logger.log/g')
  new_content=$(echo "$new_content" | sed 's/console\.warn\b/logger.warn/g')
  new_content=$(echo "$new_content" | sed 's/console\.info\b/logger.info/g')
  new_content=$(echo "$new_content" | sed 's/console\.debug\b/logger.debug/g')

  # Add import if not present
  if [ "$has_logger_import" -eq 0 ]; then
    # Find last import line and add logger import after it
    new_content=$(echo "$new_content" | awk '
      /^import .* from/ { last_import = NR }
      { lines[NR] = $0 }
      END {
        for (i = 1; i <= NR; i++) {
          print lines[i]
          if (i == last_import) {
            print "import { logger } from '\''@cadhy/shared/logger'\''"
          }
        }
      }
    ')
    ((changes++))
  fi

  changes=$((changes + total))

  # Write changes back to file
  echo "$new_content" > "$file"

  echo -e "   ${GREEN}✅ Replaced $changes occurrences${NC}"
  echo ""

  total_changes=$((total_changes + changes))
  ((total_files++))
}

# Find all TypeScript files (excluding node_modules, dist, and test files)
while IFS= read -r -d '' file; do
  process_file "$file"
done < <(find apps/desktop/src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -name "*.test.ts" \
  ! -name "*.test.tsx" \
  -print0)

echo ""
echo -e "${GREEN}✨ Migration complete!${NC}"
echo "   Total changes: $total_changes across $total_files files"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "   1. Run: bun typecheck"
echo "   2. Run: bun lint:fix"
echo "   3. Test the app manually"
