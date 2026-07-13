#!/bin/bash

# Docker Setup Script for AllocAid TA Management System
# This script sets up the Docker environment for development or production

set -e  # Exit on any error

echo "🚀 Setting up AllocAid Docker Environment"
echo "=========================================="

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set environment mode
ENVIRONMENT=${1:-development}

print_status "Setting up for ${ENVIRONMENT} environment..."

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p database/init
mkdir -p logs
mkdir -p scripts

# Setup environment file
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.docker .env
    print_warning "Please review and update the .env file with your actual secrets!"
else
    print_status ".env file already exists."
fi

# Setup for different environments
case $ENVIRONMENT in
    "development")
        print_status "Setting up development environment..."
        
        # Create development override
        cat > docker-compose.override.yml << EOF
services:
  app:
    volumes:
        - ./app:/app:ro
    environment:
      ENVIRONMENT: development
    command: ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "--watch", "server.ts"]
EOF
        
        print_status "Starting development services..."
        docker-compose --profile development up -d
        ;;
        
    "production")
        print_status "Setting up production environment..."
        
        # Remove development override if it exists
        [ -f docker-compose.override.yml ] && rm docker-compose.override.yml
        
        print_status "Building and starting production services..."
        docker-compose --profile production up -d --build
        ;;
        
    "test")
        print_status "Setting up test environment..."
        
        # Create test override
        cat > docker-compose.override.yml << EOF
services:
  app:
    environment:
      ENVIRONMENT: test
      DB_NAME: allocaid_test_db
  database:
    environment:
      POSTGRES_DB: allocaid_test_db
EOF
        
        print_status "Starting test services..."
        docker-compose up -d
        ;;
        
    *)
        print_error "Unknown environment: $ENVIRONMENT"
        print_status "Available environments: development, production, test"
        exit 1
        ;;
esac

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check service health
print_status "Checking service health..."

# Check database
if docker-compose exec -T database pg_isready -U allocaid_user -d allocaid_db &> /dev/null; then
    print_success "Database is ready"
else
    print_warning "Database may still be starting up..."
fi

# Check application
if curl -s http://localhost:8000/health &> /dev/null; then
    print_success "Application is ready"
else
    print_warning "Application may still be starting up..."
fi

# Display status
echo ""
print_success "Docker setup complete!"
echo ""
echo "🌐 Available services:"
echo "   - Application: http://localhost:8000"
if [ "$ENVIRONMENT" = "development" ]; then
    echo "   - Frontend Dev: http://localhost:3000"
    echo "   - pgAdmin: http://localhost:5050"
    echo "     Email: admin@allocaid.com"
    echo "     Password: admin123"
fi
echo "   - Database: localhost:5432"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop services: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - Shell into app: docker-compose exec app sh"
echo "   - Database shell: docker-compose exec database psql -U allocaid_user -d allocaid_db"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
    print_status "Development environment includes live reloading and pgAdmin for database management."
fi

print_warning "Remember to update your .env file with secure secrets before production deployment!"