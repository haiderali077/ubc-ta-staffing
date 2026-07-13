echo "🚀 Starting test database..."
docker-compose up test-database -d

echo "⏳ Waiting for PostgreSQL to start..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T test-database pg_isready -U test_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL is running!"
        break
    fi
    echo "PostgreSQL not ready yet, waiting..."
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    exit 1
fi

echo "🔧 Ensuring test database exists..."
# Create database if it doesn't exist
docker-compose exec -T test-database psql -U test_user -d postgres -c "SELECT 1 FROM pg_database WHERE datname = 'test_db';" | grep -q 1 || {
    echo "📊 Creating test_db database..."
    docker-compose exec -T test-database psql -U test_user -d postgres -c "CREATE DATABASE test_db;"
    if [ $? -eq 0 ]; then
        echo "✅ Database test_db created successfully!"
    else
        echo "❌ Failed to create database test_db"
        exit 1
    fi
}

echo "⏳ Waiting for test database to be ready..."
timeout=10
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T test-database pg_isready -U test_user -d test_db > /dev/null 2>&1; then
        echo "✅ Test database is ready!"
        break
    fi
    echo "Test database not ready yet, waiting..."
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -le 0 ]; then
    echo "❌ Test database failed to be ready within 10 seconds"
    exit 1
fi

echo "🧪 Running tests..."
DENO_ENV=test DB_HOST=localhost DB_PORT=5432 DB_NAME=test_db DB_USER=test_user DB_PASSWORD=test_password deno test --allow-all --no-check

test_exit_code=$?

echo "🧹 Cleaning up..."
docker-compose down test-database

# Exit with the same code as the tests
exit $test_exit_code