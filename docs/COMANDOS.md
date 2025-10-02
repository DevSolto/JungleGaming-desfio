# Comandos da Aplicação

> Monorepo com `apps/` (api-gateway, auth-service, tasks-service, notifications-service, web) e `packages/` (types, etc.).  
> Orquestração local com **Docker Compose** para **PostgreSQL** e **RabbitMQ**.

## Sumário
- [Pré-requisitos](#pré-requisitos)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Docker & Compose (Infra)](#docker--compose-infra)
  - [Subir/Derrubar Infraestrutura](#subirderrubar-infraestrutura)
  - [Logs, Status e Saúde](#logs-status-e-saúde)
  - [Acessos Rápidos](#acessos-rápidos)
- [Comandos por Aplicação (PNPM)](#comandos-por-aplicação-pnpm)
  - [Instalar Dependências](#instalar-dependências)
  - [Rodar em Dev (fora do Docker)](#rodar-em-dev-fora-do-docker)
  - [Build](#build)
  - [Lint & Format](#lint--format)
- [TypeORM & Banco](#typeorm--banco)
- [RabbitMQ (Mensageria)](#rabbitmq-mensageria)
- [HTTP & WebSocket (Testes rápidos)](#http--websocket-testes-rápidos)
- [Testes](#testes)
- [Troubleshooting Úteis](#troubleshooting-úteis)
- [Docker (Prod-like)](#docker-prod-like)
- [Scripts Sugeridos](#scripts-sugeridos)
- [Checklist de Pronto-para-Uso](#checklist-de-pronto-para-uso)
- [Makefile (atalhos)](#makefile-atalhos)

---

## 📦 Pré-requisitos

```bash
# versões sugeridas
node -v
pnpm -v
docker --version
docker compose version
```

---

## 🔐 Variáveis de Ambiente

Crie um `.env` na raiz (ou use os `.env.example` de cada app):

```bash
# Banco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=challenge_db
POSTGRES_PORT=5432

# RabbitMQ
RABBITMQ_USER=admin
RABBITMQ_PASS=admin
RABBITMQ_AMQP_PORT=5672
RABBITMQ_UI_PORT=15672
```

URLs internas (entre containers):
```bash
DATABASE_URL=postgres://postgres:password@db:5432/challenge_db
RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672
```

---

## 🐳 Docker & Compose (Infra)

### Subir/Derrubar Infraestrutura

```bash
# subir Postgres + RabbitMQ (modo daemon)
docker compose up -d
```
> Sobe os containers definidos no `docker-compose.yml`.

```bash
# derrubar sem apagar volumes
docker compose down
```
> Para os containers, mantendo dados (volumes).

```bash
# derrubar e apagar volumes (⚠️ apaga dados)
docker compose down -v
```
> Remove containers, rede e **volumes**.

### Logs, Status e Saúde

```bash
docker compose ps
```
> Lista containers e status.

```bash
docker compose logs -f db
docker compose logs -f rabbitmq
```
> “Seguir” logs do Postgres/RabbitMQ.

```bash
# healthcheck manual (db)
docker exec -it db pg_isready -U postgres -d challenge_db
```
> Verifica se o Postgres está pronto para conexões.

### Acessos Rápidos

```bash
# psql local (requer psql instalado na máquina)
PGPASSWORD=password psql -h localhost -U postgres -d challenge_db -c "select now();"
```
> Testa conexão no Postgres.

```bash
# acessar shell do container do RabbitMQ
docker exec -it rabbitmq sh
```
> Útil para diagnósticos de fila/exchange.

---

## 🧰 Comandos por Aplicação (PNPM)

> Use o **filter** do pnpm para rodar comandos em um app específico.

### Instalar Dependências

```bash
pnpm install
```
> Instala tudo (raiz + apps + packages).

### Rodar em Dev (fora do Docker)

```bash
# API Gateway (porta 3001)
pnpm -F @apps/api-gateway dev

# Auth Service (porta 3002)
pnpm -F @apps/auth-service dev

# Tasks Service (porta 3003)
pnpm -F @apps/tasks-service dev

# Notifications Service (porta 3004)
pnpm -F @apps/notifications-service dev

# Web (porta 3000)
pnpm -F @apps/web dev
```
> Sobe cada serviço localmente (útil para depurar sem containers).

### Build

```bash
pnpm build          # build do monorepo
pnpm -F @apps/api-gateway build
```
> Gera artefatos de produção (ex.: `dist/` no Nest).

### Lint & Format

```bash
pnpm lint
pnpm format
```
> Ajusta estilo de código e aponta problemas de lint.

---

## 🗄️ TypeORM & Banco

> Cada serviço que usa DB (ex.: `auth-service`, `tasks-service`) terá seus próprios comandos/migrations.

```bash
# gerar migration (ex.: no auth-service)
pnpm -F @apps/auth-service typeorm migration:generate -n create_user_table

# rodar migrations
pnpm -F @apps/auth-service typeorm migration:run
pnpm -F @apps/tasks-service typeorm migration:run

# reverter última migration (cuidado)
pnpm -F @apps/auth-service typeorm migration:revert
```
> Versionamento de schema por serviço.

---

## 📮 RabbitMQ (Mensageria)

### Variáveis e Testes

```bash
# URL interna usada pelos serviços
echo "amqp://admin:admin@rabbitmq:5672"
```

### Gerenciar via CLI (dentro do container)

```bash
# listar filas e exchanges
docker exec -it rabbitmq rabbitmqctl list_queues
docker exec -it rabbitmq rabbitmqctl list_exchanges

# estado dos plugins
docker exec -it rabbitmq rabbitmq-plugins list
```
> Diagnóstico de filas, bindings e plugins (ex.: `management`).

---

## 🌐 HTTP & WebSocket (Testes rápidos)

### Endpoints (Gateway)

```bash
# registrar
curl -X POST http://localhost:3001/api/auth/register   -H "Content-Type: application/json"   -d '{"email":"user@test.com","username":"user","password":"secret"}'

# login
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"user@test.com","password":"secret"}'
```

```bash
# criar task (use um token válido)
ACCESS_TOKEN="coloque_o_token_aqui"
curl -X POST http://localhost:3001/api/tasks   -H "Authorization: Bearer $ACCESS_TOKEN"   -H "Content-Type: application/json"   -d '{"title":"Primeira tarefa","description":"...", "priority":"HIGH", "dueDate":"2025-10-10"}'
```

### Swagger

```text
http://localhost:3001/api/docs
```
> Documentação interativa do Gateway.

### WebSocket (exemplo via websocat)

```bash
# instale websocat (opcional) e conecte (se usar socket.io, adapte)
websocat ws://localhost:3001/ws
```
> Conecta no WS para receber notificações em tempo real.

---

## 🧪 Testes

```bash
pnpm -F @apps/auth-service test
pnpm -F @apps/tasks-service test
pnpm -F @apps/api-gateway test
```
> Rodar testes unitários por serviço (Jest).

---

## 🛠️ Troubleshooting Úteis

```bash
# ver quem está usando uma porta (ex.: 3001)
sudo lsof -i :3001 -sTCP:LISTEN -n -P
```
> Mata processo que esteja segurando a porta.

```bash
# limpar containers/parar tudo
docker compose stop
docker compose rm -f

# limpar imagens não usadas (cuidado)
docker image prune -f
docker system prune -f
```
> Libera espaço e evita conflitos de cache.

```bash
# recriar do zero (⚠️ apaga dados)
docker compose down -v && docker compose up -d --build
```
> Útil quando schema mudou ou volumes corromperam.

---

## 🚀 Docker (Prod-like)

> Se seus Dockerfiles tiverem estágios `development`/`production`:

```bash
# build de uma imagem de app (ex.: gateway) no modo produção
docker build -f apps/api-gateway/Dockerfile   --target production   -t api-gateway:prod .
```

```bash
# subir com compose usando perfis/override de prod (se existir)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
> Mantém imagens menores e sem dependências de dev.

---

## 🧭 Scripts Sugeridos

```json
{
  "scripts": {
    "dev:infra": "docker compose up -d",
    "down:infra": "docker compose down",
    "reset:infra": "docker compose down -v && docker compose up -d",
    "dev:gateway": "pnpm -F @apps/api-gateway dev",
    "dev:auth": "pnpm -F @apps/auth-service dev",
    "dev:tasks": "pnpm -F @apps/tasks-service dev",
    "dev:notif": "pnpm -F @apps/notifications-service dev",
    "dev:web": "pnpm -F @apps/web dev",
    "migrate:auth": "pnpm -F @apps/auth-service typeorm migration:run",
    "migrate:tasks": "pnpm -F @apps/tasks-service typeorm migration:run"
  }
}
```

---

## ✅ Checklist de Pronto-para-Uso

```bash
# 1) Infra
docker compose up -d && docker compose ps

# 2) Gateway em dev
pnpm -F @apps/api-gateway dev

# 3) Swagger online
# → http://localhost:3001/api/docs

# 4) Auth (register/login)
# 5) Criar task
# 6) Ver eventos/notifications no WS
```

---

## 🧰 Makefile (atalhos)

> Coloque este conteúdo no arquivo `Makefile` na raiz do projeto.

```Makefile
## =====================
## Atalhos de desenvolvimento
## =====================

.PHONY: help infra-up infra-down infra-reset ps logs-db logs-rmq db-ready psql shell-rmq         dev-gateway dev-auth dev-tasks dev-notif dev-web         build lint format test         migrate-auth migrate-tasks         kill-3001 prune hard-recreate

help:
	@echo "Targets:"
	@echo "  infra-up     - docker compose up -d"
	@echo "  infra-down   - docker compose down"
	@echo "  infra-reset  - docker compose down -v && docker compose up -d"
	@echo "  ps           - docker compose ps"
	@echo "  logs-db      - docker compose logs -f db"
	@echo "  logs-rmq     - docker compose logs -f rabbitmq"
	@echo "  db-ready     - pg_isready para checar DB"
	@echo "  psql         - abre um psql (local)"
	@echo "  shell-rmq    - shell no container rabbitmq"
	@echo "  dev-...      - roda apps em dev (pnpm -F)"
	@echo "  migrate-...  - roda migrations por serviço"
	@echo "  kill-3001    - mata processo na porta 3001"
	@echo "  prune        - docker system prune -f"
	@echo "  hard-recreate- down -v && up -d --build"

infra-up:
	docker compose up -d

infra-down:
	docker compose down

infra-reset:
	docker compose down -v && docker compose up -d

ps:
	docker compose ps

logs-db:
	docker compose logs -f db

logs-rmq:
	docker compose logs -f rabbitmq

db-ready:
	docker exec -it db pg_isready -U postgres -d challenge_db

psql:
	PGPASSWORD=password psql -h localhost -U postgres -d challenge_db

shell-rmq:
	docker exec -it rabbitmq sh

dev-gateway:
	pnpm -F @apps/api-gateway dev

dev-auth:
	pnpm -F @apps/auth-service dev

dev-tasks:
	pnpm -F @apps/tasks-service dev

dev-notif:
	pnpm -F @apps/notifications-service dev

dev-web:
	pnpm -F @apps/web dev

build:
	pnpm build

lint:
	pnpm lint

format:
	pnpm format

test:
	pnpm -F @apps/auth-service test && pnpm -F @apps/tasks-service test && pnpm -F @apps/api-gateway test

migrate-auth:
	pnpm -F @apps/auth-service typeorm migration:run

migrate-tasks:
	pnpm -F @apps/tasks-service typeorm migration:run

kill-3001:
	sudo lsof -i :3001 -sTCP:LISTEN -n -P | awk 'NR>1 {print $$2}' | xargs -r kill -9

prune:
	docker system prune -f

hard-recreate:
	docker compose down -v && docker compose up -d --build
```
