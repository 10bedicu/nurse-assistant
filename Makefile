.PHONY: logs


DOCKER_VERSION := $(shell docker --version 2>/dev/null)

docker_config_file := 'local.yml'

all:
ifndef DOCKER_VERSION
    $(error "command docker is not available, please install Docker")
endif

re-build:
	docker compose -f $(docker_config_file) build --no-cache

build:
	docker compose -f $(docker_config_file) build

up:
	docker compose -f $(docker_config_file) up -d --wait

test:
	docker compose -f $(docker_config_file) exec -e NODE_ENV=test app bun test

upb:
	docker compose -f $(docker_config_file) up -d --build

down:
	docker compose -f $(docker_config_file) down

teardown:
	docker compose -f $(docker_config_file) down -v

list:
	docker compose -f $(docker_config_file) ps

logs:
	docker compose -f $(docker_config_file) logs

backup:
	docker compose -f $(docker_config_file) exec postgres backup -n backup
	docker compose -f $(docker_config_file) cp postgres:/backups/backup.sql.gz ./backup.sql.gz

restore:
	docker compose -f $(docker_config_file) exec postgres backup -n pre-restore
	docker compose -f $(docker_config_file) cp postgres:/backups/pre-restore.sql.gz ./pre-restore.sql.gz
	docker compose -f $(docker_config_file) cp ./backup.sql.gz postgres:/backups/backup.sql.gz
	docker compose -f $(docker_config_file) exec postgres restore backup.sql.gz