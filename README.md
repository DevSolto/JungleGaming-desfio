# JungleGaming Monorepo

Monorepo Turborepo com os serviços do JungleGaming (gateway HTTP, auth, tasks, notifications e front-end web).

## Onboarding rápido
1. Instale dependências com `pnpm install`.
2. Configure as variáveis de ambiente copiando os arquivos `.env.example` dentro de cada app (ex.: `cp apps/auth/.env.example apps/auth/.env`). O serviço de notificações agora também espera `DATABASE_URL` apontando para o Postgres, assim como Auth e Tasks.
3. Ajuste os segredos JWT compartilhados entre Auth e API (`JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`). Os valores precisam coincidir para que a validação do token funcione em todo o ecossistema.
4. Suba os serviços com `pnpm dev` para desenvolvimento local ou `docker compose up` para a stack completa (Postgres, RabbitMQ e serviços NestJS).

## Autenticação e JWT
- O gateway HTTP (`apps/api`) exige `Authorization: Bearer <accessToken>` em todas as rotas protegidas.
- Gere o token via `POST /auth/login` ou `POST /auth/register`; o Auth service retorna `accessToken` no corpo e gerencia `refreshToken` via cookie.
- A documentação interativa está em `http://localhost:3000/api/docs`. Use o botão **Authorize** e informe `Bearer <accessToken>` para testar requisições autenticadas.
- Tokens podem ser renovados com `POST /auth/refresh`, que lê o `refreshToken` HTTP-only configurado no login.

## Histórico de tarefas
- O microserviço de tarefas grava logs de auditoria para criações, atualizações e exclusões, incluindo diffs normalizados dos campos alterados.
- O gateway HTTP expõe `GET /tasks/:id/audit-log`, exigindo JWT válido, para consultar o histórico paginado.
- Cada resposta retorna `data` com a lista de eventos e `meta` com `page`, `size`, `total` e `totalPages`; combine com os filtros `page` e `limit` para navegar.
- Em ambientes operacionais, monitore o volume de auditoria: o armazenamento cresce conforme o número de mudanças realizadas nas tarefas.

## Estrutura
- `apps/api`: API Gateway com JWT guard e documentação Swagger.
- `apps/auth`: serviço de autenticação responsável pela emissão e rotação de tokens.
- `apps/tasks`: microserviço de tarefas acessado via RPC.
- `apps/notifications`: entrega de eventos em tempo real via WebSocket.
- `apps/web`: front-end React/TanStack Router.
- `packages/*`: bibliotecas compartilhadas (tipos, utils, configs).

## Comandos úteis
- `pnpm dev`: roda os serviços em modo desenvolvimento.
- `pnpm build`: compila todos os projetos.
- `pnpm lint`: executa o linting.
- `pnpm check-types`: valida os tipos TypeScript.

## Observabilidade & Logging
- O middleware/interceptores globais usam `@repo/logger` para propagar `requestId` entre HTTP e RPC. Cada resposta HTTP devolve o header `x-request-id`, que também aparece no payload dos logs para facilitar correlação.
- Campos sensíveis como `password`, `token`, `refreshToken`, `authorization` e `cookie` são mascarados com `[REDACTED]` automaticamente antes do log, evitando que credenciais do AuthService vazem nos registros.
- Configure o nível de log com `APP_LOG_LEVEL` (fallbacks `LOG_LEVEL`/`NODE_ENV`) e inclua mascaramentos extras com `APP_LOG_REDACT_EXTRA` (lista separada por vírgulas aceitando chaves ou paths como `payload.secret`).

Consulte `apps/api/README.md` para exemplos detalhados de uso do Swagger e das requisições autenticadas.
