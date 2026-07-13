#!/bin/bash

# scripts/load-dummy-data.sh
# Script to load dummy data for development and testing with backup/restore functionality

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if services are running
check_services() {
    print_status "Checking if services are running..."
    
    if ! docker-compose ps | grep -q "database.*Up"; then
        print_error "Database service is not running!"
        print_status "Starting database service..."
        docker-compose up -d database
        sleep 10
    fi
    
    if ! docker-compose ps | grep -q "app.*Up"; then
        print_error "App service is not running!"
        print_status "Starting app service..."
        docker-compose up -d app
        sleep 5
    fi
    
    print_success "Services are running"
}

# Function to wait for database to be ready
wait_for_database() {
    print_status "Waiting for database to be ready..."
    
    local timeout=30
    local count=0
    
    while [ $count -lt $timeout ]; do
        if docker-compose exec -T database pg_isready -U allocaid_user -d allocaid_db > /dev/null 2>&1; then
            print_success "Database is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        count=$((count + 2))
    done
    
    print_error "Database failed to become ready within ${timeout} seconds"
    return 1
}

# Function to check database connection
test_database_connection() {
    print_status "Testing database connection..."
    
    if docker-compose exec -T database psql -U allocaid_user -d allocaid_db -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        return 1
    fi
}

# Function to create database backup before loading dummy data
create_backup() {
    print_status "Creating database backup before loading dummy data..."
    
    backup_dir="backups"
    mkdir -p "$backup_dir"
    
    backup_file="${backup_dir}/pre_dummy_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose exec -T database pg_dump -U allocaid_user allocaid_db > "$backup_file"; then
        print_success "Backup created: $backup_file"
        echo "$backup_file" > "${backup_dir}/.last_pre_dummy_backup"
        return 0
    else
        print_error "Backup failed"
        return 1
    fi
}

# Function to restore from the most recent pre-dummy backup
restore_from_backup() {
    backup_dir="backups"
    
    if [ -f "${backup_dir}/.last_pre_dummy_backup" ]; then
        backup_file=$(cat "${backup_dir}/.last_pre_dummy_backup")
        if [ -f "$backup_file" ]; then
            print_status "Restoring from most recent pre-dummy backup: $backup_file"
            
            print_warning "This will overwrite the current database!"
            echo -n "Are you sure? [y/N] "
            read -r response
            
            if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
                if docker-compose exec -T database psql -U allocaid_user -d allocaid_db < "$backup_file"; then
                    print_success "Database restored from backup"
                    # Remove the backup reference since it's been restored
                    rm -f "${backup_dir}/.last_pre_dummy_backup"
                    return 0
                else
                    print_error "Restore failed"
                    return 1
                fi
            else
                print_status "Restore cancelled"
                return 1
            fi
        fi
    fi
    
    # Fallback: look for the most recent pre_dummy backup
    backup_file=$(ls -t "${backup_dir}/pre_dummy_"*.sql 2>/dev/null | head -1)
    if [ -n "$backup_file" ]; then
        print_status "Found recent pre-dummy backup: $backup_file"
        print_warning "This will restore the database to before dummy data was loaded!"
        echo -n "Are you sure? [y/N] "
        read -r response
        
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            if docker-compose exec -T database psql -U allocaid_user -d allocaid_db < "$backup_file"; then
                print_success "Database restored from backup"
                return 0
            else
                print_error "Restore failed"
                return 1
            fi
        else
            print_status "Restore cancelled"
            return 1
        fi
    else
        print_error "No pre-dummy-data backups found"
        print_status "Available backups:"
        ls -la "$backup_dir"/ 2>/dev/null || echo "No backups found"
        return 1
    fi
}

# Function to show current table counts
show_current_data() {
    print_status "Current database state:"
    
    tables=("departments" "users" "terms" "courses" "course_templates" "student_profiles" "ta_applications" "ta_needs")
    
    for table in "${tables[@]}"; do
        count=$(docker-compose exec -T database psql -U allocaid_user -d allocaid_db -t -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null | tr -d ' \n' || echo "0")
        printf "  %-20s: %s rows\n" "$table" "$count"
    done
    
    # Check for default test users
    print_status "Default test users:"
    emails=("admin@example.com" "instructor@example.com" "student@example.com" "tacoord@example.com")
    for email in "${emails[@]}"; do
        exists=$(docker-compose exec -T database psql -U allocaid_user -d allocaid_db -t -c "SELECT COUNT(*) FROM users WHERE email='${email}';" 2>/dev/null | tr -d ' \n' || echo "0")
        if [ "$exists" = "1" ]; then
            printf "  ✅ %s\n" "$email"
        else
            printf "  ❌ %s\n" "$email"
        fi
    done
}

# Function to run the dummy data loader
load_dummy_data() {
    print_status "Loading dummy data..."
    
    # Create backup before loading dummy data
    if ! create_backup; then
        print_warning "Could not create backup, continuing anyway..."
    fi
    
    # Set environment variable to load basic users only by default
    export LOAD_FULL_DUMMY_DATA=false
    
    # Run the TypeScript dummy data loader
    if docker-compose exec app deno run --allow-net --allow-env --allow-read src/database/script/load-comprehensive-dummy-data.ts; then
        print_success "Dummy data loaded successfully!"
        
        print_status "Verifying loaded data..."
        show_current_data
        
        print_success "Database now contains the required test users!"
        print_status "Login credentials:"
        echo "   Admin: admin@example.com / admin123"
        echo "   Instructor: instructor@example.com / instructor123"
        echo "   Student: student@example.com / student123"
        echo "   TA Coordinator: tacoord@example.com / tacoord123"
        
        return 0
    else
        print_error "Failed to load dummy data"
        return 1
    fi
}

# Function to load comprehensive dummy data
load_comprehensive_dummy_data() {
    print_status "Loading comprehensive dummy data..."
    
    # Create backup before loading dummy data
    if ! create_backup; then
        print_warning "Could not create backup, continuing anyway..."
    fi
    
    # Set environment variable to load comprehensive data
    export LOAD_FULL_DUMMY_DATA=true
    
    # Run the TypeScript dummy data loader
    if docker-compose exec app deno run --allow-net --allow-env --allow-read src/database/script/load-comprehensive-dummy-data.ts; then
        print_success "Comprehensive dummy data loaded successfully!"
        show_current_data
        return 0
    else
        print_error "Failed to load comprehensive dummy data"
        return 1
    fi
}

# Function to run database tests
run_tests() {
    print_status "Running database tests..."
    
    # Check if all tables exist
    print_status "Checking table existence..."
    
    tables=("departments" "users" "terms" "courses" "course_templates" "student_profiles" "ta_applications" "ta_needs" "ta_allocations")
    
    for table in "${tables[@]}"; do
        if docker-compose exec -T database psql -U allocaid_user -d allocaid_db -c "SELECT 1 FROM ${table} LIMIT 1;" > /dev/null 2>&1; then
            echo "  ✅ $table"
        else
            echo "  ❌ $table"
        fi
    done
    
    # Test user login functionality
    print_status "Testing user authentication..."
    if docker-compose exec app deno run --allow-net --allow-env src/backend/_tests_/auth.test.ts > /dev/null 2>&1; then
        print_success "Authentication tests passed"
    else
        print_warning "Authentication tests may have issues"
    fi
}

# Function to clean database and reload dummy data
clean_database() {
    print_warning "This will delete ALL data from the database!"
    echo -n "Are you sure? [y/N] "
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning database..."
        
        # Drop and recreate schema
        docker-compose exec -T database psql -U allocaid_user -d allocaid_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        
        # Recreate tables
        print_status "Recreating tables..."
        docker-compose exec app deno run --allow-net --allow-env src/database/init.ts
        
        # Load dummy data
        print_status "Loading fresh dummy data..."
        load_dummy_data
        
        print_success "Database cleaned and fresh dummy data loaded"
    else
        print_status "Database cleaning cancelled"
    fi
}

# Function to backup database
backup_database() {
    print_status "Creating database backup..."
    
    backup_dir="backups"
    mkdir -p "$backup_dir"
    
    backup_file="${backup_dir}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose exec -T database pg_dump -U allocaid_user allocaid_db > "$backup_file"; then
        print_success "Backup created: $backup_file"
    else
        print_error "Backup failed"
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 {load|comprehensive|test|clean|reset|status|backup|restore|help}"
    echo ""
    echo "Commands:"
    echo "  load         - Load basic dummy data (default test users)"
    echo "  comprehensive- Load comprehensive dummy data (full test dataset)"
    echo "  test         - Load dummy data and run tests"
    echo "  clean        - Clean database and reload fresh dummy data"
    echo "  reset        - Complete reset with fresh dummy data"
    echo "  status       - Show current database status"
    echo "  backup       - Create database backup"
    echo "  restore      - Restore from most recent pre-dummy backup"
    echo "  help         - Show this help message"
    echo ""
    echo "The script automatically creates backups before loading dummy data."
    echo "Use 'restore' to return to the state before dummy data was loaded."
}

# Main script logic
case "${1:-help}" in
    "load")
        check_services
        wait_for_database
        test_database_connection
        load_dummy_data
        ;;
    "comprehensive")
        check_services
        wait_for_database
        test_database_connection
        load_comprehensive_dummy_data
        ;;
    "test")
        check_services
        wait_for_database
        test_database_connection
        load_dummy_data
        run_tests
        ;;
    "clean")
        check_services
        wait_for_database
        test_database_connection
        clean_database
        ;;
    "reset")
        check_services
        wait_for_database
        test_database_connection
        clean_database
        ;;
    "status")
        check_services
        wait_for_database
        test_database_connection
        show_current_data
        ;;
    "backup")
        check_services
        wait_for_database
        test_database_connection
        backup_database
        ;;
    "restore")
        check_services
        wait_for_database
        test_database_connection
        restore_from_backup
        ;;
    "help"|*)
        show_help
        ;;
esac