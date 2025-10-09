# Épico: Autenticação & Gateway

* [x] Como visitante, quero me **registrar** com email, username e senha, para poder acessar o sistema. — feita
* [x] Como usuário, quero **fazer login** e receber `accessToken` (15 min) e `refreshToken` (7 dias), para manter minha sessão ativa com segurança. — feita
* [x] Como usuário, quero **atualizar meu accessToken** via endpoint de **refresh**, para continuar autenticado sem refazer login. — feita
* [x] Como sistema, quero **hashear senhas** com bcrypt/argon2, para armazenar credenciais com segurança. — feita
* [x] Como API Gateway, quero **proteger rotas** com JWT Guards e expor **Swagger**, para padronizar e documentar o acesso HTTP. _(Observação: Swagger segue disponível em `/api/docs` e todos os endpoints HTTP agora exigem JWT via header `Authorization: Bearer <token>`.)_

# Épico: Tarefas (CRUD, Atribuições, Comentários, Histórico)

* [x] Como usuário autenticado, quero **criar tarefas** com título, descrição, prazo, prioridade e status, para organizar meu trabalho. — feita
* [x] Como usuário, quero **listar tarefas** com **paginação**, para navegar por grandes volumes eficientemente. — feita
* [x] Como usuário, quero **filtrar/buscar** por status, prioridade, prazo e título, para encontrar tarefas rapidamente. _(Observação: o serviço de tarefas agora interpreta o filtro de prazo considerando o fuso padrão das tarefas, permitindo pesquisas por dia.)_
* [x] Como usuário, quero **editar** uma tarefa (campos e status), para manter as informações atualizadas. — feita
* [x] Como usuário, quero **excluir** uma tarefa, para remover itens obsoletos. — feita
* [x] Como usuário, quero **atribuir/desatribuir** uma tarefa a **múltiplos usuários**, para distribuir o trabalho. — feita
* [x] Como participante da tarefa, quero **comentar** e **ver comentários** com paginação, para colaborar no contexto da tarefa. _(Observação: o gateway agora expõe `GET /tasks/:id/comments` e `POST /tasks/:id/comments`, entregando respostas paginadas para a UI atualizar imediatamente a lista local.)_
* [x] Como sistema, quero **registrar histórico** (audit log) de alterações de tarefa, para rastrear quem mudou o quê e quando. _(Observação: o serviço de tarefas agora persiste logs de criação, edição e exclusão com diffs normalizados e o gateway expõe `GET /tasks/:id/audit-log` para consulta paginada.)_

# Épico: Integração entre Gateway e Microserviços

* [x] Como Gateway, quero **encaminhar** requisições HTTP para o **tasks-service** via **RPC** (Nest Microservices), para manter o boundary público apenas no Gateway. — feita
* [x] Como tasks-service, quero **validar DTOs** e aplicar **paginação** nas consultas, para garantir entradas corretas e respostas eficientes. — feita

# Épico: Mensageria & Eventos (RabbitMQ)

* [x] Como tasks-service, quero **publicar** `task.created`, `task.updated` e `task.comment.created` na fila de eventos, para informar outros serviços sobre mudanças. _(Observação: a criação de comentários agora dispara tanto `task.comment.created` quanto `tasks.comment.created`, alinhando a publicação com os demais eventos.)_
* [ ] Como notifications-service, quero **consumir** eventos de tarefas e **persistir** notificações, para entregar alertas confiáveis. _(Observação: o serviço apenas encaminha eventos via WebSocket; nenhuma persistência é realizada.)_
* [x] Como notifications-service, quero **ack/retry** mensagens (at-least-once), para reduzir perdas em falhas transitórias. — feita

# Épico: Notificações em Tempo Real (WebSocket)

* [x] Como usuário autenticado, quero me **conectar ao WebSocket** do Gateway, para receber notificações em tempo real. — feita
* [x] Como usuário atribuído a uma tarefa recém-criada, quero receber **`task:created`**, para ser avisado imediatamente. — feita
* [x] Como usuário envolvido numa tarefa, quero receber **`task:updated`** quando o status mudar, para acompanhar o progresso. — feita
* [x] Como participante/comentado de uma tarefa, quero receber **`comment:new`**, para não perder discussões importantes. _(Observação: a criação de comentários agora dispara `tasks.comment.created` no serviço de tarefas, que é encaminhado pelo gateway como `comment:new`, atualizando a lista e exibindo toast no front-end.)_
* [ ] Como usuário, quero **consultar o histórico de notificações persistidas** para acompanhar alertas anteriores. _(Observação: o gateway documenta `GET /notifications` no Swagger, permitindo paginação, filtro por status/canal e servindo de contrato para a futura integração RPC com o serviço de notificações.)_

# Épico: Front-end (React + TanStack Router + shadcn/ui)

* [x] Como visitante, quero **páginas de Login/Register** com validação (`react-hook-form` + `zod`), para entrar no sistema de forma simples e segura. — feita
* [x] Como usuário, quero uma **lista de tarefas** com **filtro, busca e paginação**, para encontrar e priorizar itens rapidamente. _(Observação: a página de tarefas agora controla estado de página/tamanho via `useTasksPagination` e renderiza o componente `TasksPagination`, com botões de navegação e seletor de itens por página.)_
* [x] Como usuário, quero uma **página de detalhes da tarefa** com **status, atribuições e comentários**, para trabalhar no contexto certo. — feita
* [x] Como usuário, quero **componentes de UI** (≥5 shadcn) com **skeletons** e **toasts de erro/sucesso**, para uma UX fluida. — feita
* [x] Como usuário, quero **notificações em tempo real** refletidas na UI (badges/toasts), para reagir sem precisar atualizar a página. — feita

# Épico: Observabilidade, Qualidade e Segurança (DoR/DoD do projeto)

* [x] Como time, quero **health/readiness checks** em todos os serviços, para monitorar disponibilidade. _(Observação: API, auth, tasks e notifications expõem `GET /health` via seus respectivos `HealthModule`, retornando status e timestamp.)_
* [x] Como gateway, quero **rate limiting (10 req/s)**, **CORS** e **Helmet**, para mitigar abusos e reforçar segurança. _(Observação: o `ThrottlerModule` agora lê `RATE_LIMIT_TTL`/`RATE_LIMIT_LIMIT` com default `1s/10 req`, mantendo CORS e Helmet configurados.)_
* [ ] Como time, quero **testes unitários** (auth, tasks) e **smoke e2e** (login → create task → comment), para garantir qualidade contínua. _(Observação: Auth e Tasks possuem suites unitárias abrangentes, mas ainda falta um fluxo e2e integrando login → criação de tarefa → comentário.)_
* [ ] Como time, quero **logs estruturados** com correlação (request-id) e máscara de campos sensíveis, para facilitar troubleshooting seguro. _(Pendente: não há estruturação específica de logs ou correlação de requisições.)_

# Épico: Infraestrutura & Entregabilidade (Docker/Turborepo)

* [x] Como desenvolvedor, quero **subir tudo com docker-compose** (Postgres, RabbitMQ, web, gateway, services), para rodar o sistema facilmente. — feita
* [x] Como time, quero um **monorepo Turborepo** com pacotes compartilháveis (`types`, `utils`, `eslint-config`, `tsconfig`), para padronizar e acelerar o desenvolvimento. — feita
* [ ] Como time, quero **Dockerfiles multi-stage** e **compose com perfis dev/prod-lite**, para otimizar a imagem e simular produção local. _(Observação: os Dockerfiles atuais possuem apenas estágio base/dev e não há perfis adicionais no compose.)_

