COMPOSE := docker compose -f infrastructure/docker-compose.yml --env-file .env

.PHONY: up down logs health test-api test-renderer

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

health:
	curl -sf http://localhost:3100/api/health
	curl -sf http://localhost:8100/health
	curl -sf http://localhost:8100/health/ready

test-api:
	cd services/api && uv run pytest

test-renderer:
	cd services/renderer && uv run pytest
