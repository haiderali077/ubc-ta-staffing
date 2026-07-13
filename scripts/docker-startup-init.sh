#!/bin/bash

# scripts/docker-startup-init.sh
# Initialization script that runs when the app container starts in development mode
# This ensures the database schema is created and dummy data is loaded

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[STARTUP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[STARTUP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[STARTUP]${NC} $1"
}

print_error() {
    echo -e "${RED}[STARTUP]${NC} $1"
}

print_status "Starting AllocAid application initialization..."

# Wait for database to be ready
print_status "Waiting for database to be ready..."
timeout=60
count=0

while [ $count -lt $timeout ]; do
    # Use a simple connection test instead of pg_isready
    if timeout 5 bash -c "</dev/tcp/database/5432" > /dev/null 2>&1; then
        print_success "Database is ready!"
        break
    fi
    
    if [ $((count % 10)) -eq 0 ]; then
        print_status "Still waiting for database... (${count}s/${timeout}s)"
    fi
    
    sleep 2
    count=$((count + 2))
done

if [ $count -ge $timeout ]; then
    print_error "Database failed to become ready within ${timeout} seconds"
    exit 1
fi

# Check if we're in development mode
if [ "${DENO_ENV}" = "development" ] || [ "${ENVIRONMENT}" = "development" ]; then
    print_status "Development mode detected - initializing database and dummy data..."
    
    # Run database migrations first
    print_status "Running database migrations..."
    if deno run --allow-all src/database/init.ts; then
        print_success "Database migrations completed"
    else
        print_warning "Database migrations had issues, but continuing..."
    fi
    
    # Check if dummy data already exists
    print_status "Checking if dummy data already exists..."
    user_count=$(PGPASSWORD=allocaid_pass psql -h database -U allocaid_user -d allocaid_db -t -c "SELECT COUNT(*) FROM users WHERE email LIKE '%@ubc.ca';" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$user_count" -gt 0 ]; then
        print_status "Dummy data already exists (${user_count} users found), skipping data load"
    else
        print_status "No dummy data found, loading comprehensive dummy data..."
        if deno run --allow-all src/database/script/load-comprehensive-dummy-data.ts; then
            print_success "Dummy data loaded successfully!"
        else
            print_error "Failed to load dummy data"
            # Don't exit - let the app start anyway
        fi
    fi
    
    print_success "Development initialization completed!"
    
elif [ "${DENO_ENV}" = "test" ] || [ "${ENVIRONMENT}" = "test" ]; then
    print_status "Test mode detected - running minimal initialization..."
    
    # Only run migrations for test mode
    if deno run --allow-all src/database/init.ts; then
        print_success "Test database initialized"
    else
        print_warning "Test database initialization had issues"
    fi
    
else
    print_status "Production mode detected - running migrations only..."
    
    # Only run migrations for production
    if deno run --allow-all src/database/init.ts; then
        print_success "Production database initialized"
    else
        print_error "Production database initialization failed"
        exit 1
    fi
fi

print_success "AllocAid initialization completed - starting application..."

# Start the main application
exec "$@"