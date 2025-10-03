# Sprints do Projeto Desafio Full-stack Júnior — Sistema de Gestão de Tarefas Colaborativo

Este documento consolida todas as sprints do projeto, facilitando o acompanhamento do progresso. Para cada sprint, estão listados o objetivo, as tarefas, os entregáveis, os critérios de aceitação e as dependências correspondentes.

## S1 - Fundações do Monorepo & DevX

### Objetivo
Levantar esqueleto do projeto, DX e infra mínima para todos os serviços subirem.

### Tarefas
- [x] Configurar Turborepo (workspaces, turbo.json, scripts build/dev) (Infra)
- [x] Criar Dockerfiles dos 4 apps (targets dev) + compose com volumes e rede (Infra)
- [x] Criar .env.example para web, api-gateway, auth-service, tasks-service, notifications-service (Infra)
- [x] Scaffold Nest HTTP + Swagger placeholder + rate limiter (Gateway)
- [x] Criar @types (DTOs iniciais: User, Tokens, Task, Comment) (Packages)
- [x] Instruções de execução e troubleshooting (make dev / npm run dev) (Docs)

### Entregáveis
- Monorepo apps/ e packages/ funcional
- docker-compose com Postgres 17 + RabbitMQ 3.13 e containers vazios dos 4 apps
- Pacotes compartilhados: types, utils, eslint-config, tsconfig
- Healthcheck HTTP básico nos serviços
- Gateway Nest com Swagger placeholder e rate-limiter plugado

### Critérios de Aceitação
- docker compose up sobe tudo sem crash
- GET /api/health responde 200 no gateway

### Dependências
- Nenhuma

## S2 - Autenticação (Auth Service + API Gateway) e Base do Front

### Objetivo
Implementar login/register com JWT (access/refresh), proteger rotas e documentar.

### Tarefas
- [x] Entities User e RefreshToken; repositórios TypeORM e serviços (Auth)
- [x] Endpoints /auth/register, /auth/login, /auth/refresh (Auth)
- [x] Configurar estratégias de access/refresh + decorators @CurrentUser (Gateway)
- [ ] Páginas Login/Register com validação, toasts, loading, persistência segura de tokens (Front)
- [ ] Fluxos de sequência (Mermaid) para login/refresh (Docs)

### Entregáveis
- auth-service com User + migrations + register/login/refresh
- api-gateway com guards e proxy de /api/auth/*
- Front web com páginas Login/Register usando react-hook-form + zod e estado de auth (Context/Zustand)

### Critérios de Aceitação
- Fluxo completo de auth OK (200) com expirações corretas
- Swagger /api/docs descreve os 3 endpoints

### Dependências
- S1

## S3 - Domínio de Tarefas (Tasks Service) + RPC e Eventos

### Objetivo
Modelar e expor CRUD de tarefas, atribuições, comentários e audit log via Nest microservices + RabbitMQ.

### Tarefas
- [ ] Criar entities e índices (status, prazo, prioridade) (Tasks)
- [ ] Use-cases: create/read/update/delete; assign/unassign; addComment/listComments; AuditLog automático (Tasks)
- [ ] Definir canais/filas: tasks.rpc (RPC) e tasks.events (pub) (Messaging)
- [ ] Rotas HTTP: /api/tasks, /api/tasks/:id, /api/tasks/:id/comments com paginação (Gateway)
- [ ] Tabela de mensagens (topic, payload, publisher/consumer) (Docs)

### Entregáveis
- tasks-service com entidades Task, TaskAssignment (N:N), Comment, AuditLog
- Migrations + validação por DTO
- Gateway HTTP → RPC para leitura/escrita; publicação de eventos task.created, task.updated, task.comment.created

### Critérios de Aceitação
- CRUD e comentários via gateway com paginação
- Criação/atualização/comentário publicam eventos no broker

### Dependências
- S2

## S4 - Notificações & WebSocket

### Objetivo
Consumir eventos, persistir notificações e entregar em tempo real via WebSocket autenticado.

### Tarefas
- [ ] Entity Notification (userId, type, payload, readAt=null) (Notifications)
- [ ] Consumer com ack manual e requeue on error (Broker)
- [ ] Guards de socket (JWT) e rooms user:{id} (Gateway WS)
- [ ] Emitir eventos WS para assignments/autor/participantes (Gateway WS)
- [ ] Diagrama pub/sub (ASCII) do fluxo de notificações (Docs)

### Entregáveis
- notifications-service consumindo tasks.events e persistindo Notification
- Gateway WS (/ws) autenticado com JWT
- Eventos WS: task:created, task:updated, comment:new (endereçados aos usuários relevantes)

### Critérios de Aceitação
- Criar tarefa atribuída a X → X recebe task:created em tempo real
- Comentário em tarefa onde Y participa → Y recebe comment:new

### Dependências
- S3

## S5 - UI de Tarefas (Lista, Filtro, Detalhe, Comentários) + Realtime

### Objetivo
Construir UI funcional com boa UX e integrar WS.

### Tarefas
- [ ] Layout base e rotas /login, /tasks, /tasks/:id (Web)
- [ ] Lista com filtros (status, prioridade, prazo) e busca por título (Web)
- [ ] Form de criação/edição com zod schemas compartilhados de @types (Web)
- [ ] Aba de comentários com paginação (infinita ou carregar mais) (Web)
- [ ] Integração WS: toasts/badges e atualização em tempo real (Web)
- [ ] GIF/roteiro demonstrando fluxo E2E (Docs)

### Entregáveis
- Páginas: Lista de Tarefas (filtros/busca/paginação) e Detalhe (status/atribuições/comentários)
- ≥5 componentes shadcn/ui, skeleton loaders, toasts
- Cliente WS conectado com badge/toasts de notificação

### Critérios de Aceitação
- Fluxo: login → criar tarefa → atribuir usuário → notificação em tempo real → comentar → UI atualiza sem refresh

### Dependências
- S2
- S3
- S4

## S6 - Observabilidade, Qualidade e Segurança

### Objetivo
Endurecer o sistema com testes, logs, healthchecks e hardening.

### Tarefas
- [ ] Logger global + middleware de request-id + mask de campos sensíveis (Obs)
- [ ] Helmet, CORS e validação global (whitelist + forbidNonWhitelisted) (Security)
- [ ] Unit: auth (hash/compare, expiração), tasks (create/update/assign) (Tests)
- [ ] e2e smoke: login → create task → comment (em ambiente docker) (Tests)
- [ ] Seeds mínimas para demo (DB)
- [ ] Known issues e Next steps (Docs)

### Entregáveis
- Logs estruturados com correlação (request-id)
- Health/Readiness nos serviços
- Testes unitários principais (auth, tasks) + smoke e2e
- Rate limit (10 req/s), CORS e Helmet no gateway
- Seeds mínimos para demo

### Critérios de Aceitação
- `npm test` passando localmente
- Health /health e /ready respondendo 200
- Rate limit ativo no gateway

### Dependências
- S1
- S2
- S3
- S4
- S5

## S7 - Polimento, Performance & Entrega

### Objetivo
Finalizar documentação, ajustes de performance e preparo de entrega.

### Tarefas
- [ ] Criar índices e checar planos (EXPLAIN) dos endpoints mais usados (Perf)
- [ ] Multi-stage Docker; reduzir tamanho de imagens; revisar envs (Build)
- [ ] Diagrama (mermaid/png), tabela de mensagens RabbitMQ e matriz de permissões (Docs)
- [ ] Roteiro de testes manuais (checklist) + bug bash (QA)
- [ ] Revisar Swagger e exemplos de responses (Entrega)

### Entregáveis
- README final (arquitetura, decisões/trade-offs, tempo por parte, instruções, troubleshooting)
- Compose com perfis dev/prod-lite + Dockerfiles multi-stage
- Ajustes de índices (status, dueDate, createdAt) e revisão de queries críticas
- Bug bash e checklist de aceite
- Swagger revisado com exemplos de responses

### Critérios de Aceitação
- Subir prod-lite localmente e executar demo E2E sem passos manuais além de .env
- README cobre todos os itens exigidos no desafio

### Dependências
- S1
- S2
- S3
- S4
- S5
- S6
