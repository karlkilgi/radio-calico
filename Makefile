# RadioCalico Makefile
# Convenient commands for development, production, and testing

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.prod.yml
NPM = npm

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ==================== Help ====================
.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)RadioCalico - Make Targets$(NC)"
	@echo "$(YELLOW)Usage: make [target]$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# ==================== Development ====================
.PHONY: dev
dev: ## Start development server locally (no Docker)
	@echo "$(YELLOW)Starting development server...$(NC)"
	$(NPM) run dev

.PHONY: dev-docker
dev-docker: ## Start development environment with Docker
	@echo "$(YELLOW)Starting development Docker environment...$(NC)"
	$(DOCKER_COMPOSE) up

.PHONY: dev-docker-build
dev-docker-build: ## Build and start development Docker environment
	@echo "$(YELLOW)Building development Docker images...$(NC)"
	$(DOCKER_COMPOSE) build
	$(DOCKER_COMPOSE) up

.PHONY: dev-stop
dev-stop: ## Stop development Docker environment
	@echo "$(YELLOW)Stopping development Docker environment...$(NC)"
	$(DOCKER_COMPOSE) down

.PHONY: dev-clean
dev-clean: ## Stop and remove development Docker containers and volumes
	@echo "$(RED)Cleaning development environment...$(NC)"
	$(DOCKER_COMPOSE) down -v

# ==================== Production ====================
.PHONY: prod
prod: ## Start production environment with Docker
	@echo "$(GREEN)Starting production environment...$(NC)"
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "$(GREEN)Production environment started!$(NC)"
	@echo "Access the application at: http://localhost"

.PHONY: prod-build
prod-build: ## Build production Docker images
	@echo "$(YELLOW)Building production Docker images...$(NC)"
	$(DOCKER_COMPOSE_PROD) build --no-cache

.PHONY: prod-start
prod-start: prod-build ## Build and start production environment
	@echo "$(GREEN)Starting production environment with fresh build...$(NC)"
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "$(GREEN)Production environment started!$(NC)"

.PHONY: prod-stop
prod-stop: ## Stop production environment
	@echo "$(YELLOW)Stopping production environment...$(NC)"
	$(DOCKER_COMPOSE_PROD) down

.PHONY: prod-restart
prod-restart: ## Restart production environment
	@echo "$(YELLOW)Restarting production environment...$(NC)"
	$(DOCKER_COMPOSE_PROD) restart

.PHONY: prod-clean
prod-clean: ## Stop and remove production containers and volumes (WARNING: deletes data!)
	@echo "$(RED)WARNING: This will delete all production data!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	$(DOCKER_COMPOSE_PROD) down -v

.PHONY: prod-logs
prod-logs: ## Show production logs (all services)
	$(DOCKER_COMPOSE_PROD) logs -f

.PHONY: prod-logs-backend
prod-logs-backend: ## Show backend service logs
	$(DOCKER_COMPOSE_PROD) logs -f backend

.PHONY: prod-logs-nginx
prod-logs-nginx: ## Show nginx service logs
	$(DOCKER_COMPOSE_PROD) logs -f nginx

.PHONY: prod-logs-db
prod-logs-db: ## Show database logs
	$(DOCKER_COMPOSE_PROD) logs -f postgres

.PHONY: prod-status
prod-status: ## Show production environment status
	@echo "$(YELLOW)Production Environment Status:$(NC)"
	$(DOCKER_COMPOSE_PROD) ps

# ==================== Testing ====================
.PHONY: test
test: ## Run all tests (backend + frontend)
	@echo "$(YELLOW)Running all tests...$(NC)"
	$(NPM) test

.PHONY: test-backend
test-backend: ## Run backend tests only
	@echo "$(YELLOW)Running backend tests...$(NC)"
	$(NPM) run test:backend

.PHONY: test-frontend
test-frontend: ## Run frontend tests only
	@echo "$(YELLOW)Running frontend tests...$(NC)"
	$(NPM) run test:frontend

.PHONY: test-watch
test-watch: ## Run tests in watch mode (backend)
	@echo "$(YELLOW)Running backend tests in watch mode...$(NC)"
	$(NPM) run test:backend:watch

.PHONY: test-watch-frontend
test-watch-frontend: ## Run frontend tests in watch mode
	@echo "$(YELLOW)Running frontend tests in watch mode...$(NC)"
	$(NPM) run test:frontend:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	@echo "$(YELLOW)Running tests with coverage...$(NC)"
	$(NPM) run test:ci

.PHONY: test-ui
test-ui: ## Open Vitest UI for interactive testing
	@echo "$(YELLOW)Opening Vitest UI...$(NC)"
	$(NPM) run test:frontend:ui

# ==================== Database ====================
.PHONY: db-backup
db-backup: ## Backup production database
	@echo "$(YELLOW)Backing up production database...$(NC)"
	@mkdir -p backups
	docker exec radiocalico-postgres pg_dump -U radiocalico radiocalico > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Database backed up to backups/$(NC)"

.PHONY: db-restore
db-restore: ## Restore database from backup (requires BACKUP_FILE=path/to/backup.sql)
ifndef BACKUP_FILE
	@echo "$(RED)Error: BACKUP_FILE not specified$(NC)"
	@echo "Usage: make db-restore BACKUP_FILE=backups/backup_20240101_120000.sql"
else
	@echo "$(YELLOW)Restoring database from $(BACKUP_FILE)...$(NC)"
	docker exec -i radiocalico-postgres psql -U radiocalico radiocalico < $(BACKUP_FILE)
	@echo "$(GREEN)Database restored$(NC)"
endif

.PHONY: db-shell
db-shell: ## Access PostgreSQL shell in production
	@echo "$(YELLOW)Connecting to PostgreSQL...$(NC)"
	docker exec -it radiocalico-postgres psql -U radiocalico radiocalico

.PHONY: db-reset
db-reset: ## Reset production database (WARNING: deletes all data!)
	@echo "$(RED)WARNING: This will delete all database data!$(NC)"
	@echo "Press Ctrl+C to cancel, or wait 5 seconds to continue..."
	@sleep 5
	$(DOCKER_COMPOSE_PROD) down
	docker volume rm radiocalico_postgres_data || true
	$(DOCKER_COMPOSE_PROD) up -d postgres
	@echo "$(GREEN)Database reset complete$(NC)"

# ==================== Installation & Setup ====================
.PHONY: install
install: ## Install npm dependencies
	@echo "$(YELLOW)Installing npm dependencies...$(NC)"
	$(NPM) install

.PHONY: install-clean
install-clean: ## Clean install (remove node_modules and reinstall)
	@echo "$(YELLOW)Performing clean install...$(NC)"
	rm -rf node_modules package-lock.json
	$(NPM) install

.PHONY: setup
setup: install ## Initial project setup
	@echo "$(GREEN)Setting up RadioCalico project...$(NC)"
	@if [ ! -f .env.production ]; then \
		cp .env.production.example .env.production; \
		echo "$(YELLOW)Created .env.production - please update with your values$(NC)"; \
	fi
	@echo "$(GREEN)Setup complete!$(NC)"

# ==================== Utility ====================
.PHONY: clean
clean: ## Clean all Docker resources and temporary files
	@echo "$(RED)Cleaning all Docker resources...$(NC)"
	$(DOCKER_COMPOSE) down -v || true
	$(DOCKER_COMPOSE_PROD) down -v || true
	docker system prune -f
	rm -rf coverage/ node_modules/.vite/
	@echo "$(GREEN)Cleanup complete$(NC)"

.PHONY: shell-backend
shell-backend: ## Access backend container shell
	@echo "$(YELLOW)Accessing backend container...$(NC)"
	docker exec -it radiocalico-backend sh

.PHONY: shell-nginx
shell-nginx: ## Access nginx container shell
	@echo "$(YELLOW)Accessing nginx container...$(NC)"
	docker exec -it radiocalico-nginx sh

.PHONY: validate
validate: ## Validate Docker Compose configurations
	@echo "$(YELLOW)Validating Docker Compose configurations...$(NC)"
	$(DOCKER_COMPOSE) config > /dev/null
	@echo "$(GREEN)✓ Development config valid$(NC)"
	$(DOCKER_COMPOSE_PROD) config > /dev/null
	@echo "$(GREEN)✓ Production config valid$(NC)"

.PHONY: ports
ports: ## Show port usage
	@echo "$(YELLOW)Port Usage:$(NC)"
	@echo "  Development:"
	@echo "    - Backend API: 3001"
	@echo "  Production:"
	@echo "    - Nginx (Frontend): 80"
	@echo "    - Backend API: 3001 (internal)"
	@echo "    - PostgreSQL: 5432 (internal)"

.PHONY: info
info: ## Show project information
	@echo "$(GREEN)RadioCalico Project Information$(NC)"
	@echo "================================"
	@echo "Node version: $$(node --version)"
	@echo "NPM version: $$(npm --version)"
	@echo "Docker version: $$(docker --version)"
	@echo "Docker Compose version: $$(docker-compose --version)"
	@echo ""
	@echo "$(YELLOW)Quick Start Commands:$(NC)"
	@echo "  Development: make dev"
	@echo "  Production: make prod"
	@echo "  Testing: make test"
	@echo ""
	@echo "Run 'make help' for all available commands"

# ==================== Health Checks ====================
.PHONY: health
health: ## Check health of all production services
	@echo "$(YELLOW)Checking service health...$(NC)"
	@echo "PostgreSQL:"
	@docker exec radiocalico-postgres pg_isready -U radiocalico && echo "$(GREEN)  ✓ Healthy$(NC)" || echo "$(RED)  ✗ Unhealthy$(NC)"
	@echo "Backend API:"
	@curl -s http://localhost:3001/ > /dev/null && echo "$(GREEN)  ✓ Healthy$(NC)" || echo "$(RED)  ✗ Unhealthy$(NC)"
	@echo "Nginx:"
	@curl -s http://localhost/health > /dev/null && echo "$(GREEN)  ✓ Healthy$(NC)" || echo "$(RED)  ✗ Unhealthy$(NC)"

# ==================== Development Shortcuts ====================
.PHONY: d
d: dev ## Shortcut for 'make dev'

.PHONY: p
p: prod ## Shortcut for 'make prod'

.PHONY: t
t: test ## Shortcut for 'make test'

.PHONY: l
l: prod-logs ## Shortcut for 'make prod-logs'

.PHONY: s
s: prod-status ## Shortcut for 'make prod-status'