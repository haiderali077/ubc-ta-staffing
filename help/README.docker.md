# Docker Usage Guide for AllocAid

This guide provides all essential Docker commands and workflows for the AllocAid TA Management System.

## Quick Start

### 1. Start Development Environment
```bash
# Using Makefile (recommended)
make start-dev

# Using Docker Compose directly
docker-compose --profile development up -d --build
```

### 2. Start Production Environment
```bash
# Using Makefile (recommended)
make start-prod

# Using Docker Compose directly
docker-compose --profile production up -d --build
```

## Core Docker Commands

### Application Lifecycle

| Command | Makefile | Docker Compose | Description |
|---------|----------|----------------|-------------|
| Start Dev | `make start-dev` | `docker-compose --profile development up -d --build` | Start with live reload |
| Start Prod | `make start-prod` | `docker-compose --profile production up -d --build` | Start production mode |
| Stop | `make stop` | `docker-compose down` | Stop all services |
| Restart | `make restart` | `docker-compose restart` | Restart all services |
| Build | `make build` | `docker-compose build` | Build images only |

### Service Management

| Command | Makefile | Docker Compose | Description |
|---------|----------|----------------|-------------|
| View Status | `make status` | `docker-compose ps` | Show all service status |
| View Logs | `make logs` | `docker-compose logs -f` | Follow all logs |
| App Logs | `make logs-app` | `docker-compose logs -f app` | Follow app logs only |
| DB Logs | `make logs-db` | `docker-compose logs -f database` | Follow database logs |
| Health Check | `make health` | N/A | Check service health |

### Container Access

| Command | Makefile | Docker Compose | Description |
|---------|----------|----------------|-------------|
| App Shell | `make shell` | `docker-compose exec app sh` | Open app container shell |
| DB Shell | `make db-shell` | `docker-compose exec database psql -U allocaid_user -d allocaid_db` | Open database shell |

## Database Operations

### Essential Database Commands

| Command | Makefile | Description |
|---------|----------|-------------|
| `make db-migrate` | Run database migrations and create tables |
| `make db-seed` | Load dummy data for development |
| `make db-reset` | **⚠️ DESTRUCTIVE** - Reset DB and reload dummy data |
| `make db-backup` | Create timestamped backup in `backups/` folder |

### Direct Database Access
```bash
# Connect to database
make db-shell
# OR
docker-compose exec database psql -U allocaid_user -d allocaid_db

# View tables
\dt

# View table structure
\d users

# Exit database shell
\q
```

## Development Workflow

### Typical Development Session
```bash
# 1. Start development environment
make start-dev

# 2. Check everything is running
make status
make health

# 3. View logs (in separate terminal)
make logs-app

# 4. Make code changes (auto-reload enabled)

# 5. Access database if needed
make db-shell

# 6. Stop when done
make stop
```

### Testing
```bash
# Run all tests
make test

# Run linting
make lint

# Format code
make format
```

## Environment Variables

### Required Environment Setup
```bash
# Copy template
cp .env.docker .env

# Edit .env file and update these values:
JWT_SECRET=your-very-long-random-secret-here
REFRESH_SECRET=another-very-long-random-secret-here
```

### Generate Secure Secrets
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## Service URLs and Ports

### Development Environment
- **Application**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **pgAdmin**: http://localhost:5050
  - Email: `admin@allocaid.com`
  - Password: `admin123`
- **Database**: localhost:5433 (external)

### Production Environment
- **Application**: http://localhost:8000
- **Database**: localhost:5433 (external)

## Troubleshooting

### Common Issues

#### "Port already in use"
```bash
# Check what's using the port
lsof -i :8000
lsof -i :5433

# Stop conflicting services
brew services stop postgresql  # If using Homebrew PostgreSQL
make stop  # Stop AllocAid services
```

#### "Database not ready"
```bash
# Wait for database to start
sleep 10
make health

# Check database logs
make logs-db

# Restart if needed
make restart
```

#### "Permission denied"
```bash
# Make scripts executable
chmod +x scripts/docker-setup.sh

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
# Then log out and back in
```

### Health Checks
```bash
# Check all services
make health

# Manual health checks
curl http://localhost:8000/health
docker-compose exec database pg_isready -U allocaid_user -d allocaid_db
```

### Clean Up and Reset

| Command | Description | ⚠️ Warning Level |
|---------|-------------|------------------|
| `make clean` | Remove containers and volumes | Medium |
| `make clean-all` | Remove everything including images | High |
| `make db-reset` | Reset database with dummy data | High |

## Docker Compose Profiles

### Available Profiles
- **development**: App + Frontend + pgAdmin + Database
- **production**: App + Database + Redis
- **test**: Separate test database for testing

### Using Profiles
```bash
# Development (includes frontend and pgAdmin)
docker-compose --profile development up -d

# Production (optimized for production)
docker-compose --profile production up -d

# Start specific services only
docker-compose up database -d
```

## File Structure

```
AllocAid/
├── docker-compose.yml          # Main service definitions
├── docker-compose.override.yml # Development overrides
├── Dockerfile                  # Multi-stage build
├── .env                        # Environment variables
├── .env.docker                 # Template
├── Makefile                    # Convenient commands
└── scripts/
    └── docker-setup.sh         # Setup automation
```

## Best Practices

### 1. Always Use Makefile Commands
```bash
# ✅ Good
make start-dev
make logs-app

# ❌ Avoid (unless necessary)
docker-compose --profile development up -d --build
```

### 2. Check Status Regularly
```bash
# Before making changes
make status
make health
```

### 3. Use Proper Environment
```bash
# Development
make start-dev

# Production
make start-prod
```

### 4. Clean Up Regularly
```bash
# Remove stopped containers and unused images
make clean

# Full cleanup (careful!)
make clean-all
```

### 5. Database Backups
```bash
# Before major changes
make db-backup

# Restore from backup
docker-compose exec -T database psql -U allocaid_user -d allocaid_db < backups/backup_20240803_143022.sql
```

## Getting Help

```bash
# Show all available commands
make help

# Check service status
make status

# View logs for debugging
make logs
```