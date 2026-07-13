# Makefile for AllocAid TA Management System
# Provides consistent Docker-based development and deployment commands

.PHONY: help start start-dev start-prod start-w-dummy-data stop restart build clean
.PHONY: logs logs-app logs-db status health shell db-shell
.PHONY: db-migrate db-seed db-reset db-backup db-restore test
.PHONY: load-dummy-data test-dummy-data clean-dummy-data reset-with-dummy-data
.PHONY: backup-before-dummy restore-before-dummy
.PHONY: lint format dev-setup

# Default target - show help
help: ## Show this help message
	@echo "AllocAid TA Management System - Docker Commands"
	@echo "=============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ============================================================================
# MAIN APPLICATION COMMANDS
# ============================================================================

start: start-dev ## Start development environment (default)

start-dev: ## Start development environment with live reload (NO dummy data)
	@echo "🚀 Starting AllocAid development environment..."
	@docker-compose --profile development up -d --build
	@echo "⏳ Waiting for services to be ready..."
	@sleep 15
	@make db-migrate
	@make _show-dev-info
	@echo "✅ Development environment ready!"
	@echo "💡 To load dummy data, run: make load-dummy-data"

start-w-dummy-data: ## Start development environment with dummy data
	@echo "🚀 Starting AllocAid development environment with dummy data..."
	@docker-compose --profile development up -d --build
	@echo "⏳ Waiting for services to be ready..."
	@sleep 15
	@make db-migrate
	@echo "🌱 Loading dummy data for development..."
	@make load-dummy-data
	@make _show-dev-info
	@echo "✅ Development environment ready with dummy data!"

quick-start: start-dev ## Quick start for development (NO dummy data)

start-prod: ## Start production environment
	@echo "🚀 Starting AllocAid production environment..."
	@docker-compose --profile production up -d --build
	@echo "⏳ Waiting for services to be ready..."
	@sleep 15
	@make _show-prod-info

stop: ## Stop all services
	@echo "🛑 Stopping all services..."
	@docker-compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	@docker-compose restart
	@sleep 10
	@make status

build: ## Build all services without starting
	@echo "🔨 Building all services..."
	@docker-compose build

# ============================================================================
# DATABASE COMMANDS
# ============================================================================

db-migrate: ## Run database migrations
	@echo "📊 Running database migrations..."
	@docker-compose exec app deno run --allow-all src/database/init.ts

db-seed: load-dummy-data ## Load dummy data into database (alias for load-dummy-data)

db-reset: ## Reset database and reload dummy data (WARNING: Deletes all data!)
	@echo "⚠️  Resetting database - ALL DATA WILL BE LOST!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		docker-compose exec database psql -U allocaid_user -d allocaid_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; \
		make db-migrate; \
		echo "✅ Database reset complete"; \
		echo "💡 To load dummy data, run: make load-dummy-data"; \
	else \
		echo ""; \
		echo "❌ Database reset cancelled"; \
	fi

db-backup: ## Create database backup
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker-compose exec -T database pg_dump -U allocaid_user allocaid_db > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

db-restore: ## Restore database from backup (interactive)
	@echo "📥 Available database backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups found in backups/ directory"
	@echo ""
	@read -p "Enter backup filename (from backups/ directory): " backup_file; \
	if [ -f "backups/$$backup_file" ]; then \
		echo "⚠️  This will overwrite the current database!"; \
		read -p "Are you sure? [y/N] " -n 1 -r; \
		if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
			echo ""; \
			echo "🔄 Restoring database from $$backup_file..."; \
			docker-compose exec -T database psql -U allocaid_user -d allocaid_db < "backups/$$backup_file"; \
			echo "✅ Database restored from $$backup_file"; \
		else \
			echo ""; \
			echo "❌ Database restore cancelled"; \
		fi; \
	else \
		echo "❌ Backup file not found: backups/$$backup_file"; \
	fi

# ============================================================================
# DUMMY DATA COMMANDS WITH BACKUP/RESTORE
# ============================================================================

backup-before-dummy: ## Create backup before loading dummy data
	@echo "💾 Creating backup before dummy data..."
	@mkdir -p backups
	@docker-compose exec -T database pg_dump -U allocaid_user allocaid_db > backups/pre_dummy_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Pre-dummy-data backup created"

restore-before-dummy: ## Restore to state before dummy data was loaded
	@echo "📥 Looking for pre-dummy-data backups..."
	@backup_file=$$(ls -t backups/pre_dummy_*.sql 2>/dev/null | head -1); \
	if [ -n "$$backup_file" ]; then \
		echo "Found recent pre-dummy backup: $$backup_file"; \
		echo "⚠️  This will restore the database to before dummy data was loaded!"; \
		read -p "Are you sure? [y/N] " -n 1 -r; \
		if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
			echo ""; \
			echo "🔄 Restoring database from $$backup_file..."; \
			docker-compose exec -T database psql -U allocaid_user -d allocaid_db < "$$backup_file"; \
			echo "✅ Database restored to pre-dummy state"; \
		else \
			echo ""; \
			echo "❌ Restore cancelled"; \
		fi; \
	else \
		echo "❌ No pre-dummy-data backups found"; \
		echo "💡 Available backups:"; \
		ls -la backups/ 2>/dev/null || echo "No backups found"; \
	fi

load-dummy-data: ## Load comprehensive dummy data for development
	@echo "🌱 Loading dummy data..."
	@make backup-before-dummy
	@chmod +x scripts/load-dummy-data.sh
	@./scripts/load-dummy-data.sh load

test-dummy-data: ## Load dummy data and run tests
	@echo "🧪 Loading dummy data and running tests..."
	@chmod +x scripts/load-dummy-data.sh
	@./scripts/load-dummy-data.sh test

clean-dummy-data: ## Clean all data and reload fresh dummy data
	@echo "🧹 Cleaning and reloading dummy data..."
	@chmod +x scripts/load-dummy-data.sh
	@./scripts/load-dummy-data.sh clean

reset-with-dummy-data: ## Complete reset with fresh dummy data
	@echo "🔄 Complete reset with dummy data..."
	@chmod +x scripts/load-dummy-data.sh
	@./scripts/load-dummy-data.sh reset

dummy-data-status: ## Show current dummy data status
	@echo "📊 Checking dummy data status..."
	@chmod +x scripts/load-dummy-data.sh
	@./scripts/load-dummy-data.sh status

# ============================================================================
# DATABASE DEBUGGING COMMANDS
# ============================================================================

db-debug: ## Analyze database tables and find missing ones
	@echo "🔍 Running comprehensive database debug analysis..."
	@docker-compose exec app deno run --allow-all src/database/script/debug_database.ts

db-test-creation: ## Test table creation functions individually
	@echo "🧪 Testing table creation functions individually..."
	@docker-compose exec app deno run --allow-all src/database/script/test_table_creation.ts

db-list-tables: ## List all tables in database with details
	@echo "📋 Tables currently in database:"
	@docker-compose exec database psql -U allocaid_user -d allocaid_db -c "\dt"

db-count-tables: ## Count total tables in database
	@echo "📊 Table count:"
	@docker-compose exec database psql -U allocaid_user -d allocaid_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

db-show-structure: ## Show database structure (tables and columns)
	@echo "🏗️ Database structure:"
	@docker-compose exec database psql -U allocaid_user -d allocaid_db -c "\
		SELECT table_name, column_name, data_type, is_nullable \
		FROM information_schema.columns \
		WHERE table_schema = 'public' \
		ORDER BY table_name, ordinal_position;"

db-quick-check: ## Quick check for missing tables
	@echo "🔍 Running quick table check..."
	@chmod +x scripts/quick_table_check.sh
	@./scripts/quick_table_check.sh

# ============================================================================
# DEVELOPMENT WORKFLOW COMMANDS
# ============================================================================

full-reset: ## Complete reset - rebuild, clean DB, no dummy data
	@echo "🔄 Full reset - this will rebuild everything..."
	@docker-compose down
	@docker-compose build --no-cache
	@make start-dev

full-reset-w-dummy: ## Complete reset - rebuild, clean DB, load dummy data
	@echo "🔄 Full reset with dummy data - this will rebuild everything..."
	@docker-compose down
	@docker-compose build --no-cache
	@make start-w-dummy-data

dev-setup: ## Initial development setup
	@echo "🔧 Setting up development environment..."
	@chmod +x scripts/docker-setup.sh
	@./scripts/docker-setup.sh development

# ============================================================================
# MONITORING AND DEBUGGING
# ============================================================================

logs: ## View logs from all services
	@docker-compose logs -f

logs-app: ## View application logs only
	@docker-compose logs -f app

logs-db: ## View database logs only
	@docker-compose logs -f database

status: ## Show status of all services
	@echo "📊 Service Status:"
	@docker-compose ps

health: ## Check health of all services
	@echo "🏥 Health Check:"
	@docker-compose exec database pg_isready -U allocaid_user -d allocaid_db && echo "✅ Database healthy" || echo "❌ Database not ready"
	@curl -s http://localhost:8000/health >/dev/null && echo "✅ Application healthy" || echo "❌ Application not responding"

shell: ## Open shell in application container
	@echo "🐚 Opening shell in application container..."
	@docker-compose exec app sh

db-shell: ## Open database shell
	@echo "💾 Opening database shell..."
	@docker-compose exec database psql -U allocaid_user -d allocaid_db

# ============================================================================
# TESTING COMMANDS
# ============================================================================

test: ## Run all tests
	@echo "🧪 Running all tests..."
	@docker-compose exec app deno test --allow-all

test-watch: ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	@docker-compose exec app deno test --allow-all --watch

test-db: ## Run database tests only
	@echo "💾 Running database tests..."
	@docker-compose exec app deno test --allow-all src/database/_tests_/

# ============================================================================
# CLEANUP COMMANDS
# ============================================================================

clean: ## Remove stopped containers and unused images
	@echo "🧹 Cleaning up Docker resources..."
	@docker-compose down
	@docker system prune -f
	@echo "✅ Cleanup complete"

clean-all: ## Remove all containers, images, and volumes (WARNING: Destructive!)
	@echo "⚠️  This will remove ALL Docker containers, images, and volumes!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo ""; \
		docker-compose down -v; \
		docker system prune -a -f --volumes; \
		echo "✅ Complete cleanup done"; \
	else \
		echo ""; \
		echo "❌ Cleanup cancelled"; \
	fi

# ============================================================================
# INTERNAL HELPER COMMANDS
# ============================================================================

_show-dev-info: ## Internal: Show development environment info
	@echo ""
	@echo "🎉 Development Environment Started!"
	@echo "=================================="
	@echo "🌐 Application: http://localhost:8000"
	@echo "🗄️  pgAdmin: http://localhost:5050"
	@echo "   Email: admin@example.com"
	@echo "   Password: admin123"
	@echo "🔧 Logs: make logs"
	@echo "📊 Status: make status"
	@echo ""
	@echo "📝 Available Commands:"
	@echo "   make load-dummy-data     - Load test data"
	@echo "   make backup-before-dummy - Create backup before loading data"
	@echo "   make restore-before-dummy - Restore to clean state"

_show-prod-info: ## Internal: Show production environment info
	@echo ""
	@echo "🚀 Production Environment Started!"
	@echo "================================="
	@echo "🌐 Application: http://localhost:8000"
	@echo "🔧 Logs: make logs"
	@echo "📊 Status: make status"