# 📑 Sprint 1 — Fundações do Monorepo & DevX

## 🎯 Objetivo
Levantar esqueleto do projeto, developer experience e infraestrutura mínima para que todos os serviços possam ser executados em conjunto.

---

## ✅ Entregas concluídas
- Monorepo estruturado em `apps/` (gateway, auth, tasks, notifications) e `packages/` (types, utils, eslint-config, tsconfig).
- `docker-compose.yml` com **Postgres 17.5** e **RabbitMQ 3.13** rodando em rede compartilhada.
- Pacotes compartilhados publicados e já usados pelos serviços (`@repo/types` para DTOs iniciais).
- Healthcheck HTTP implementado em:
  - **API Gateway**: `GET /api/health`
  - **Auth Service**: `GET /health`
  - **Tasks Service**: `GET /health`
- **API Gateway** configurado com:
  - Swagger placeholder em `/api/docs`
  - Rate limiter global (10 req/seg por default)
  - Helmet + CORS
- `.env.example` criado em cada app (`web`, `api-gateway`, `auth-service`, `tasks-service`).

---

## ▶️ Como rodar localmente

### Pré-requisitos
- Node.js 22+ (com `pnpm`)
- Docker + Docker Compose

### Passos

1. **Subir infraestrutura (DB + Broker)**
   ```bash
   docker compose up -d db rabbitmq
   ```

   - Postgres: `localhost:5432` (user: postgres / pass: password / db: challenge_db)
   - RabbitMQ: `localhost:5672` (painel: http://localhost:15672 — user/pass: admin/admin)

2. **Rodar serviços em modo dev**
   ```bash
   pnpm -F @apps/api-gateway dev
   pnpm -F @apps/auth-service dev
   pnpm -F @apps/tasks-service dev
   # (notifications-service será desenvolvido na Sprint 4)
   ```

3. **Testar healthchecks**
   ```bash
   curl http://localhost:3001/api/health    # gateway
   curl http://localhost:3002/health        # auth
   curl http://localhost:3003/health        # tasks
   ```

   ✔️ Saída esperada:
   ```json
   { "status": "ok", "ts": "2025-10-02T13:00:00.000Z" }
   ```

4. **Testar Swagger do Gateway**
   - http://localhost:3001/api/docs

---