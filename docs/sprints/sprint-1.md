# 📑 Sprint 1 — Fundações do Monorepo & DevX

## 🎯 Objetivo
Levantar o esqueleto do projeto, experiência de desenvolvimento e infraestrutura mínima para que todos os serviços possam ser executados em conjunto.

---

## ✅ Entregas concluídas

### 🧱 Monorepo & Developer Experience
- Turborepo configurado com workspaces `apps/` (`api`, `auth`, `tasks`, `notifications`, `web`) e `packages/` (`types`, `ui`, `eslint-config`, `typescript-config`). 【F:pnpm-workspace.yaml†L1-L15】【F:packages/types/src/index.ts†L1-L3】
- Scripts globais `pnpm build|dev|lint|check-types` habilitando execução paralela dos projetos. 【F:package.json†L4-L14】
- Configuração padrão de lint, formatação e TypeScript compartilhada pelos pacotes internos. 【F:packages/eslint-config/package.json†L1-L26】【F:packages/typescript-config/package.json†L1-L20】

### 🧩 Pacotes compartilhados
- `@repo/types` centraliza DTOs, enums e contratos compartilhados (Auth, tarefas, comentários e notificações). 【F:packages/types/src/dto/index.ts†L1-L6】【F:packages/types/src/contracts/index.ts†L1-L4】
- `@repo/ui` fornece componentes React base para as aplicações Next.js. 【F:packages/ui/src/button.tsx†L1-L53】

### ☁️ Infraestrutura & Contêineres
- `docker-compose.yml` com Postgres 17.5 e RabbitMQ 3.13 (com healthchecks) além de serviços de desenvolvimento para `api`, `auth`, `tasks` e `web`, todos compartilhando rede e volumes. 【F:docker-compose.yml†L1-L121】
- Dockerfiles de desenvolvimento por app com instalação seletiva via `pnpm --filter`. 【F:apps/api/Dockerfile†L1-L43】【F:apps/auth/Dockerfile†L1-L43】
- Arquivos `.env.example` para cada serviço documentando variáveis essenciais (porta, conexões, segredos). 【F:apps/api/.env.example†L1-L6】【F:apps/auth/.env.example†L1-L7】【F:apps/tasks/.env.example†L1-L6】【F:apps/notifications/.env.example†L1-L4】【F:apps/web/.env.example†L1-L5】

### 🔌 Serviços implementados
- **API Gateway (`apps/api`)**
  - NestJS 11 com prefixo global `/api`, CORS configurável, validação global (whitelist + transformação) e rate limiter via `@nestjs/throttler`. 【F:apps/api/src/main.ts†L1-L41】【F:apps/api/src/app.module.ts†L1-L39】
  - Swagger disponível em `/api/docs` com autenticação Bearer configurada. 【F:apps/api/src/main.ts†L21-L35】
  - Endpoints HTTP para autenticação: `POST /api/auth/register` e `POST /api/auth/login`, delegando chamadas ao microserviço via `ClientProxy`. 【F:apps/api/src/auth/auth.controller.ts†L1-L24】【F:apps/api/src/auth/auth.service.ts†L1-L60】
  - Healthcheck agregado (`GET /api/health`) medindo latência do microserviço de auth. 【F:apps/api/src/health/health.controller.ts†L1-L15】【F:apps/api/src/health/health.service.ts†L1-L58】
- **Auth Service (`apps/auth`)**
  - Microserviço NestJS exposto via TCP (porta 4010) com TypeORM/Postgres, hashing Bcrypt e JWT configurável. 【F:apps/auth/src/main.ts†L1-L15】【F:apps/auth/src/app.module.ts†L1-L32】【F:apps/auth/src/auth/auth.service.ts†L1-L78】
  - Message patterns `auth.register`, `auth.login` e `auth.ping` com tratamento de erros via `RpcException`. 【F:apps/auth/src/auth/auth.controller.ts†L1-L25】【F:apps/auth/src/health/health.controller.ts†L1-L13】
- **Tasks Service (`apps/tasks`)**
  - Serviço NestJS com módulo de configuração e healthcheck HTTP (`GET /health`) pronto para integrar com RabbitMQ na próxima sprint. 【F:apps/tasks/src/app.module.ts†L1-L17】【F:apps/tasks/src/health/health.controller.ts†L1-L14】
- **Notifications Service (`apps/notifications`)** e **Web (`apps/web`)** mantêm scaffolds básicos prontos para evolução nas sprints seguintes. 【F:apps/notifications/src/app.module.ts†L1-L13】【F:apps/web/app/page.tsx†L1-L73】

---

## ▶️ Como rodar localmente

### Pré-requisitos
- Node.js 20+ com `pnpm` 9 instalado globalmente
- Docker + Docker Compose

### Passos

1. **Instalar dependências**
   ```bash
   pnpm install
   ```

2. **Configurar variáveis de ambiente**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/auth/.env.example apps/auth/.env
   cp apps/tasks/.env.example apps/tasks/.env
   cp apps/notifications/.env.example apps/notifications/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Subir infraestrutura (DB + Broker)**
   ```bash
   docker compose up -d db rabbitmq
   ```

   - Postgres: `localhost:5432` (user: postgres / pass: password / db: challenge_db)
   - RabbitMQ: `localhost:5672` (painel http://localhost:15672 — user/pass: admin/admin)

4. **Iniciar serviços em modo desenvolvimento**
   ```bash
   pnpm --filter @apps/auth-service dev          # microserviço TCP (porta 4010)
   pnpm --filter @apps/api-gateway dev           # gateway HTTP (http://localhost:3001/api)
   pnpm --filter @apps/tasks-service dev         # placeholder com healthcheck
   pnpm --filter @apps/notifications-service dev # placeholder
   pnpm --filter @apps/web dev                   # Next.js
   ```

5. **Validar healthchecks e autenticação**
   ```bash
   curl http://localhost:3001/api/health
   curl -X POST http://localhost:3001/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{"email":"user@example.com","name":"User","password":"123456"}'
   ```

   ✔️ Resposta esperada do healthcheck:
   ```json
   {
     "status": "ok",
     "ts": "2025-01-01T12:00:00.000Z",
     "services": {
       "api": { "status": "ok", "latencyMs": 0, "details": { "ts": "2025-01-01T12:00:00.000Z" } },
       "auth": {
         "status": "ok",
         "latencyMs": 2.3,
         "details": { "status": "ok", "ts": "2025-01-01T12:00:00.000Z" }
       }
     }
   }
   ```

---
