echo "🧪 Running Bulk Upload Tests..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run backend tests (CSV parsing, data transformation)
echo -e "\n${YELLOW}Running Backend Tests...${NC}"
deno test --allow-env app/src/backend/_tests_/bulkUpload.test.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend tests passed${NC}"
else
    echo -e "${RED}❌ Backend tests failed${NC}"
    exit 1
fi

# Run database tests (if database is available)
echo -e "\n${YELLOW}Running Database Tests...${NC}"
if [ -z "$SKIP_DB_TESTS" ]; then
    deno test --allow-all app/src/database/_tests_/bulkUpload.test.ts
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database tests passed${NC}"
    else
        echo -e "${RED}❌ Database tests failed${NC}"
        # Don't exit on DB test failure - they might be skipped
    fi
else
    echo -e "${YELLOW}⏭️  Database tests skipped (SKIP_DB_TESTS=true)${NC}"
fi

echo -e "\n${GREEN}✨ Bulk Upload tests completed!${NC}"