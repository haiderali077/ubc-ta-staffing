#!/bin/bash
# Test script for database.test.ts

echo "🧪 Running Database Tests..."

# Start test database
docker-compose up test-database -d

# Wait for PostgreSQL
echo "⏳ Waiting for database..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T test-database pg_isready -U test_user > /dev/null 2>&1; then
        echo "✅ Database ready!"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ Database timeout"
    exit 1
fi

# Run database tests
DENO_ENV=test DB_HOST=localhost DB_PORT=5432 DB_NAME=test_db DB_USER=test_user DB_PASSWORD=test_password \
deno test --allow-all --no-check app/src/database/_tests_/export.test.ts

# Store exit code
test_exit_code=$?

# Cleanup
docker-compose down test-database

# Exit with test result
exit $test_exit_code
