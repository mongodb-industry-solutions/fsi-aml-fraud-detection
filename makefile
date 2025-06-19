# ThreatSight 360 - Financial Fraud Detection System Makefile
# Comprehensive build and development commands for dual-backend microservices architecture

.PHONY: help clean install test dev prod docker
.DEFAULT_GOAL := help

# ==================== HELP COMMAND ====================

help: ## Show this help message
	@echo "ThreatSight 360 - Financial Fraud Detection System"
	@echo "=================================================="
	@echo ""
	@echo "Available commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "  %-25s %s\n", "Command", "Description"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "Architecture:"
	@echo "  - Main Backend (port 8000): Fraud detection, transaction processing, risk assessment"
	@echo "  - AML Backend (port 8001): AML/KYC operations, entity resolution, network analysis"
	@echo "  - Frontend (port 3000): Next.js application with MongoDB LeafyGreen UI"

# ==================== POETRY INSTALLATION ====================

install_poetry: ## Install Poetry dependency manager via pipx
	@echo "Installing Poetry..."
	brew install pipx
	pipx ensurepath
	pipx install poetry==1.8.4
	@echo "Poetry installed successfully"

# ==================== SETUP COMMANDS ====================

setup_fraud: ## Setup fraud detection backend dependencies
	@echo "Setting up fraud detection backend..."
	cd backend && poetry config virtualenvs.in-project true
	cd backend && poetry install --no-interaction -v --no-cache --no-root
	@echo "Fraud detection backend setup complete"

setup_aml: ## Setup AML/KYC backend dependencies  
	@echo "Setting up AML/KYC backend..."
	cd aml-backend && poetry config virtualenvs.in-project true
	cd aml-backend && poetry install --no-interaction -v --no-cache --no-root
	@echo "AML/KYC backend setup complete"

setup_frontend: ## Setup frontend dependencies
	@echo "Setting up frontend..."
	cd frontend && npm install
	@echo "Frontend setup complete"

setup_all: setup_fraud setup_aml setup_frontend ## Setup all components (backends + frontend)

# ==================== DEVELOPMENT COMMANDS ====================

dev_fraud: ## Start fraud detection backend in development mode (port 8000)
	@echo "Starting fraud detection backend on port 8000..."
	cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev_aml: ## Start AML/KYC backend in development mode (port 8001)
	@echo "Starting AML/KYC backend on port 8001..."
	cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

dev_frontend: ## Start frontend in development mode (port 3000)
	@echo "Starting frontend on port 3000..."
	cd frontend && npm run dev

dev_both: ## Start both backends concurrently in development mode
	@echo "Starting both backends in development mode..."
	make dev_fraud & make dev_aml

dev_all: ## Start all services (both backends + frontend) in development mode
	@echo "Starting all services in development mode..."
	make dev_fraud & make dev_aml & make dev_frontend

# ==================== PRODUCTION COMMANDS ====================

prod_fraud: ## Start fraud detection backend in production mode
	@echo "Starting fraud detection backend in production mode..."
	cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000

prod_aml: ## Start AML/KYC backend in production mode
	@echo "Starting AML/KYC backend in production mode..."
	cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8001

prod_frontend: ## Start frontend in production mode
	@echo "Building and starting frontend in production mode..."
	cd frontend && npm run build && npm start

prod_both: ## Start both backends in production mode
	@echo "Starting both backends in production mode..."
	make prod_fraud & make prod_aml

prod_all: ## Start all services in production mode
	@echo "Starting all services in production mode..."
	make prod_fraud & make prod_aml & make prod_frontend

# ==================== DOCKER COMMANDS ====================

build: ## Build and start all containers with docker-compose
	@echo "Building and starting all containers..."
	docker-compose up --build -d

build_fraud: ## Build fraud detection backend container
	@echo "Building fraud detection backend container..."
	docker build -f Dockerfile.backend -t threatsight-fraud:latest .

build_aml: ## Build AML/KYC backend container
	@echo "Building AML/KYC backend container..."
	docker build -f Dockerfile.aml-backend -t threatsight-aml:latest .

build_frontend: ## Build frontend container
	@echo "Building frontend container..."
	docker build -f Dockerfile.frontend -t threatsight-frontend:latest .

start: ## Start existing containers
	@echo "Starting containers..."
	docker-compose start

stop: ## Stop running containers
	@echo "Stopping containers..."
	docker-compose stop

restart: ## Restart all containers
	@echo "Restarting containers..."
	docker-compose restart

clean: ## Remove all containers, images, and volumes
	@echo "Cleaning up Docker resources..."
	docker-compose down --rmi all -v
	docker system prune -f

logs: ## Show logs from all containers
	docker-compose logs -f

logs_fraud: ## Show logs from fraud detection backend
	docker-compose logs -f threatsight-back

logs_aml: ## Show logs from AML backend
	docker-compose logs -f threatsight-aml

logs_frontend: ## Show logs from frontend
	docker-compose logs -f threatsight-front

# ==================== TESTING COMMANDS ====================

test_mongodb: ## Test MongoDB connectivity and entity operations
	@echo "Testing MongoDB connectivity..."
	cd aml-backend && poetry run python3 ../tests/test_mongodb_entities.py

test_aml_api: ## Test AML/KYC API endpoints
	@echo "Testing AML API endpoints..."
	cd aml-backend && poetry run python3 ../tests/test_aml_api.py

test_entity_resolution: ## Test entity resolution and Atlas Search functionality
	@echo "Testing entity resolution..."
	cd aml-backend && poetry run python3 ../tests/test_entity_resolution.py

test_fraud_api: ## Test fraud detection API endpoints
	@echo "Testing fraud detection API..."
	# Add fraud backend tests here when available
	@echo "Fraud API tests not yet implemented"

test_models: ## Test Pydantic models and validation
	@echo "Testing data models..."
	cd aml-backend && poetry run python test_models.py

test_repositories: ## Test repository pattern implementation
	@echo "Testing repository patterns..."
	cd aml-backend && poetry run python test_repository_pattern.py

test_embeddings: ## Test AWS Bedrock embedding generation
	@echo "Testing embedding generation..."
	cd aml-backend && poetry run python test_embedding_generation.py

test_network: ## Test network analysis functionality
	@echo "Testing network analysis..."
	cd aml-backend && poetry run python test_network_analysis.py

test_aml_all: ## Run all AML backend tests
	@echo "Running all AML backend tests..."
	make test_mongodb && make test_aml_api && make test_entity_resolution

test_all: test_aml_all ## Run complete test suite

# ==================== MAINTENANCE COMMANDS ====================

update_fraud: ## Update fraud detection backend dependencies
	@echo "Updating fraud backend dependencies..."
	cd backend && poetry update

update_aml: ## Update AML/KYC backend dependencies
	@echo "Updating AML backend dependencies..."
	cd aml-backend && poetry update

update_frontend: ## Update frontend dependencies
	@echo "Updating frontend dependencies..."
	cd frontend && npm update

update_all: update_fraud update_aml update_frontend ## Update all dependencies

clean_deps: ## Clean dependency caches and reinstall
	@echo "Cleaning dependency caches..."
	cd backend && poetry cache clear . --all && poetry install
	cd aml-backend && poetry cache clear . --all && poetry install
	cd frontend && rm -rf node_modules package-lock.json && npm install

lint_frontend: ## Run frontend linting
	@echo "Linting frontend..."
	cd frontend && npm run lint

lint_aml: ## Run AML backend linting (basic Python checks)
	@echo "Linting AML backend..."
	cd aml-backend && poetry run python -m flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

format_aml: ## Format AML backend code with black
	@echo "Formatting AML backend code..."
	cd aml-backend && poetry run python -m black . --check

# ==================== DATABASE COMMANDS ====================

db_seed: ## Seed database with sample data (fraud backend)
	@echo "Seeding database with sample data..."
	cd backend && poetry run python scripts/seed_data.py

db_backup: ## Create database backup (requires MongoDB tools)
	@echo "Creating database backup..."
	@echo "Please ensure MongoDB tools are installed and configure backup location"

# ==================== HEALTH CHECK COMMANDS ====================

health_fraud: ## Check fraud detection backend health
	@echo "Checking fraud detection backend health..."
	curl -f http://localhost:8000/health || echo "Fraud backend not responding"

health_aml: ## Check AML/KYC backend health
	@echo "Checking AML/KYC backend health..."
	curl -f http://localhost:8001/health || echo "AML backend not responding"

health_frontend: ## Check frontend health
	@echo "Checking frontend health..."
	curl -f http://localhost:3000 || echo "Frontend not responding"

health_all: health_fraud health_aml health_frontend ## Check all services health

# ==================== DEPLOYMENT COMMANDS ====================

deploy_staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	@echo "Configure staging deployment commands"

deploy_prod: ## Deploy to production environment
	@echo "Deploying to production..."
	@echo "Configure production deployment commands"

# ==================== QUICK START COMMANDS ====================

quickstart: ## Quick setup and start for development
	@echo "Quick start for development..."
	make setup_all
	@echo "Setup complete! Starting services..."
	@echo "Run 'make dev_all' to start all services or individual commands:"
	@echo "  make dev_fraud    - Start fraud detection backend (port 8000)"
	@echo "  make dev_aml      - Start AML/KYC backend (port 8001)"  
	@echo "  make dev_frontend - Start frontend (port 3000)"

# ==================== LEGACY ALIASES (for backward compatibility) ====================

poetry_start: setup_fraud ## Legacy alias for setup_fraud
poetry_install: setup_fraud ## Legacy alias for setup_fraud  
poetry_update: update_fraud ## Legacy alias for update_fraud
aml_poetry_start: setup_aml ## Legacy alias for setup_aml
aml_poetry_install: setup_aml ## Legacy alias for setup_aml
aml_poetry_update: update_aml ## Legacy alias for update_aml
aml_start: dev_aml ## Legacy alias for dev_aml
aml_start_prod: prod_aml ## Legacy alias for prod_aml