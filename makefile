build:
	docker-compose up --build -d

start: 
	docker-compose start

stop:
	docker-compose stop

clean:
	docker-compose down --rmi all -v

install_poetry:
	brew install pipx
	pipx ensurepath
	pipx install poetry==1.8.4

poetry_start:
	cd backend && poetry config virtualenvs.in-project true

poetry_install:
	cd backend && poetry install --no-interaction -v --no-cache --no-root

poetry_update:
	cd backend && poetry update

# AML Backend Commands
aml_poetry_start:
	cd aml-backend && poetry config virtualenvs.in-project true

aml_poetry_install:
	cd aml-backend && poetry install --no-interaction -v --no-cache --no-root

aml_poetry_update:
	cd aml-backend && poetry update

aml_start:
	cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

aml_start_prod:
	cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8001

# Testing Commands
test_mongodb:
	cd aml-backend && poetry run python3 ../tests/test_mongodb_entities.py

test_aml_api:
	cd aml-backend && poetry run python3 ../tests/test_aml_api.py

test_entity_resolution:
	cd aml-backend && poetry run python3 ../tests/test_entity_resolution.py

test_all:
	make test_mongodb && make test_aml_api && make test_entity_resolution

# Setup Commands
setup_fraud:
	make poetry_install

setup_aml:
	make aml_poetry_install

setup_all:
	make setup_fraud && make setup_aml

# Development Commands
dev_fraud:
	cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev_aml:
	cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

dev_both:
	make dev_fraud & make dev_aml

# Help
help:
	@echo "Available commands:"
	@echo "  Docker:"
	@echo "    build         - Build and start with docker-compose"
	@echo "    start         - Start containers"
	@echo "    stop          - Stop containers"
	@echo "    clean         - Remove containers and images"
	@echo ""
	@echo "  Setup:"
	@echo "    install_poetry - Install Poetry via pipx"
	@echo "    setup_fraud   - Setup fraud detection backend"
	@echo "    setup_aml     - Setup AML/KYC backend"
	@echo "    setup_all     - Setup both backends"
	@echo ""
	@echo "  Development:"
	@echo "    dev_fraud     - Start fraud backend in dev mode"
	@echo "    dev_aml       - Start AML backend in dev mode"
	@echo "    dev_both      - Start both backends in dev mode"
	@echo ""
	@echo "  Testing:"
	@echo "    test_mongodb           - Test MongoDB connection and entities"
	@echo "    test_aml_api           - Test AML API endpoints"
	@echo "    test_entity_resolution - Test entity resolution and Atlas Search"
	@echo "    test_all               - Run complete test suite"