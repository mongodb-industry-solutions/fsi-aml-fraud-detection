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