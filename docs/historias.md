# Épico: Autenticação & Gateway

* [x] Como visitante, quero me **registrar** com email, username e senha, para poder acessar o sistema. — feita
* [x] Como usuário, quero **fazer login** e receber `accessToken` (15 min) e `refreshToken` (7 dias), para manter minha sessão ativa com segurança. — feita
* [x] Como usuário, quero **atualizar meu accessToken** via endpoint de **refresh**, para continuar autenticado sem refazer login. — feita
* [x] Como sistema, quero **hashear senhas** com bcrypt, para armazenar credenciais com segurança. — feita
* [x] Como API Gateway, quero **proteger rotas** com JWT Guards e expor **Swagger**, para padronizar e documentar o acesso HTTP. _Swagger disponível em `/api/docs`, com throttle, Helmet e CORS configurados no bootstrap._

# Épico: Tarefas (CRUD, Atribuições, Comentários, Histórico)

* [x] Como usuário autenticado, quero **criar tarefas** com título, descrição, prazo, prioridade e status, para organizar meu trabalho. — feita
* [x] Como usuário, quero **listar tarefas** com **paginação**, para navegar por grandes volumes eficientemente. — feita
* [x] Como usuário, quero **filtrar/buscar** por status, prioridade, prazo e título, para encontrar tarefas rapidamente. _O filtro de prazo considera o fuso padrão das tarefas e normaliza `assigneeId`._
* [x] Como usuário, quero **editar** uma tarefa (campos e status), para manter as informações atualizadas. — feita
* [x] Como usuário, quero **excluir** uma tarefa, para remover itens obsoletos. — feita
* [x] Como usuário, quero **atribuir/desatribuir** uma tarefa a **múltiplos usuários**, para distribuir o trabalho. — feita
* [x] Como participante da tarefa, quero **comentar** e **ver comentários** com paginação, para colaborar no contexto da tarefa. _Gateway expõe `GET /tasks/:id/comments` e `POST /tasks/:id/comments`, consumindo o serviço de tarefas via RPC._
* [x] Como sistema, quero **registrar histórico** (audit log) de alterações de tarefa, para rastrear quem mudou o quê e quando. _Audit log disponível no gateway via `GET /tasks/:id/audit-log`, com diffs normalizados e ator responsável._

# Épico: Integração entre Gateway e Microserviços

* [x] Como Gateway, quero **encaminhar** requisições HTTP para o **tasks-service** via **RPC** (Nest Microservices), para manter o boundary público apenas no Gateway. — feita
* [x] Como tasks-service, quero **validar DTOs** e aplicar **paginação** nas consultas, para garantir entradas corretas e respostas eficientes. — feita

# Épico: Mensageria & Eventos (RabbitMQ)

* [x] Como tasks-service, quero **publicar** `task.created`, `task.updated`, `task.deleted` e `task.comment.created` na fila de eventos, para informar outros serviços sobre mudanças. _Eventos forward `tasks.*` com `request-id` para correlação._
* [x] Como notifications-service, quero **consumir** eventos de tarefas e **persistir** notificações, para entregar alertas confiáveis. _Notificações armazenadas em PostgreSQL antes do fan-out WS; falhas geram `nack` para retry._
* [x] Como notifications-service, quero **ack/retry** mensagens (at-least-once), para reduzir perdas em falhas transitórias. — feita

# Épico: Notificações em Tempo Real (WebSocket)

* [x] Como usuário autenticado, quero me **conectar ao WebSocket** do Gateway, para receber notificações em tempo real. — feita
* [x] Como usuário atribuído a uma tarefa recém-criada, quero receber **`task:created`**, para ser avisado imediatamente. — feita
* [x] Como usuário envolvido numa tarefa, quero receber **`task:updated`** quando o status mudar, para acompanhar o progresso. — feita
* [x] Como participante/comentado de uma tarefa, quero receber **`comment:new`**, para não perder discussões importantes. _O gateway recebe `tasks.comment.created` e publica `comment:new`, atualizando lista e exibindo toast._
* [x] Como usuário, quero **consultar o histórico de notificações persistidas** para acompanhar alertas anteriores. _`GET /notifications` e `GET /tasks/:id/notifications` consultam o handler `findAll` do notifications-service com filtros por status, canal, intervalo temporal e `taskId`._

# Épico: Front-end (React + TanStack Router + shadcn/ui)

* [x] Como visitante, quero **páginas de Login/Register** com validação (`react-hook-form` + `zod`), para entrar no sistema de forma simples e segura. — feita
* [x] Como usuário, quero uma **lista de tarefas** com **filtro, busca e paginação**, para encontrar e priorizar itens rapidamente. _Controle de paginação com `useTasksPagination` e componentes reutilizáveis._
* [x] Como usuário, quero uma **página de detalhes da tarefa** com **status, atribuições e comentários**, para trabalhar no contexto certo. — feita
* [x] Como usuário, quero **componentes de UI** (≥5 shadcn) com **skeletons** e **toasts de erro/sucesso**, para uma UX fluida. — feita
* [x] Como usuário, quero **notificações em tempo real** refletidas na UI (badges/toasts), para reagir sem precisar atualizar a página. — feita

# Épico: Observabilidade, Qualidade e Segurança (DoR/DoD do projeto)

* [x] Como time, quero **health/readiness checks** em todos os serviços, para monitorar disponibilidade. _API, auth, tasks e notifications expõem endpoints/handlers `health`._
* [x] Como gateway, quero **rate limiting (10 req/s)**, **CORS** e **Helmet**, para mitigar abusos e reforçar segurança. _Throttler configurado via env com defaults `limit=10`/`ttl=1s`._
* [x] Como time, quero **testes unitários** (auth, tasks, notifications, gateway) e **smoke e2e** (login → create task → comment), para garantir qualidade contínua. _Suites Jest/Vitest rodando via `pnpm --filter ... test`._
* [x] Como time, quero **logs estruturados** com correlação (`request-id`) e máscara de campos sensíveis, para facilitar troubleshooting seguro. _`@repo/logger` injeta contexto compartilhado entre HTTP, RPC e filas._

# Épico: Infraestrutura & Entregabilidade (Docker/Turborepo)

* [x] Como desenvolvedor, quero **subir tudo com docker-compose** (Postgres, RabbitMQ, web, gateway, services), para rodar o sistema facilmente. — feita
* [x] Como time, quero um **monorepo Turborepo** com pacotes compartilháveis (`types`, `logger`, `eslint-config`, `tsconfig`), para padronizar e acelerar o desenvolvimento. — feita
* [x] Como time, quero **Dockerfiles multi-stage** e **compose com perfis dev/prod-lite**, para otimizar a imagem e simular produção local. _Dockerfiles atuais possuem estágio `base`/`dev`; falta estágio de runtime enxuto e perfis diferenciados no compose._
