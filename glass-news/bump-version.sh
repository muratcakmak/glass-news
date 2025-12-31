#!/bin/bash

# Glass News Version Bumper
# Usage: ./bump-version.sh [patch|minor|major]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to patch if no argument
BUMP_TYPE=${1:-patch}

echo -e "${BLUE}🔄 Glass News Version Bumper${NC}"
echo ""

# Read current version
CURRENT_VERSION=$(cat version.json | grep -o '"version": "[^"]*"' | cut -d'"' -f4)
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Split version into parts
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version based on type
case $BUMP_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
  *)
    echo "Usage: $0 [patch|minor|major]"
    exit 1
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

echo -e "New version:     ${GREEN}$NEW_VERSION${NC}"
echo -e "Build time:      ${GREEN}$BUILD_TIME${NC}"
echo ""

# Update version.json
cat > version.json <<EOF
{
  "version": "$NEW_VERSION",
  "buildTime": "$BUILD_TIME"
}
EOF
echo -e "${GREEN}✓${NC} Updated version.json"

# Update app.js - APP_VERSION constant
sed -i.bak "s/const APP_VERSION = \".*\";/const APP_VERSION = \"$NEW_VERSION\";/" app.js
rm -f app.js.bak
echo -e "${GREEN}✓${NC} Updated app.js (APP_VERSION)"

# Update app.js - document title
sed -i.bak "s/- v[0-9]*\.[0-9]*\.[0-9]*/- v$NEW_VERSION/" app.js
rm -f app.js.bak
echo -e "${GREEN}✓${NC} Updated app.js (document.title)"

# Update index.html - navbar
sed -i.bak "s/>v[0-9]*\.[0-9]*\.[0-9]*</>v$NEW_VERSION</" index.html
rm -f index.html.bak
echo -e "${GREEN}✓${NC} Updated index.html (navbar)"

# Update service worker cache name
sed -i.bak "s/const CACHE_NAME = \"glass-news-v[^\"]*\";/const CACHE_NAME = \"glass-news-v$NEW_VERSION\";/" sw.js
rm -f sw.js.bak
echo -e "${GREEN}✓${NC} Updated sw.js (CACHE_NAME)"

echo ""
echo -e "${GREEN}🎉 Version bumped to $NEW_VERSION${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Review changes: git diff"
echo "  2. Commit: git add . && git commit -m \"chore: Bump version to v$NEW_VERSION\""
echo "  3. Push: git push origin master"
echo ""
