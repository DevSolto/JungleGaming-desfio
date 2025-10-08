# Épico: Autenticação & Gateway

* [x] Como visitante, quero me **registrar** com email, username e senha, para poder acessar o sistema. — feita
* [x] Como usuário, quero **fazer login** e receber `accessToken` (15 min) e `refreshToken` (7 dias), para manter minha sessão ativa com segurança. — feita
* [x] Como usuário, quero **atualizar meu accessToken** via endpoint de **refresh**, para continuar autenticado sem refazer login. — feita
* [x] Como sistema, quero **hashear senhas** com bcrypt/argon2, para armazenar credenciais com segurança. — feita
* [ ] Como API Gateway, quero **proteger rotas** com JWT Guards e expor **Swagger**, para padronizar e documentar o acesso HTTP. _(Observação: Swagger e guard para WebSocket estão ativos, porém os endpoints HTTP de tarefas ainda não utilizam JWT guard.)_

# Épico: Tarefas (CRUD, Atribuições, Comentários, Histórico)

* [x] Como usuário autenticado, quero **criar tarefas** com título, descrição, prazo, prioridade e status, para organizar meu trabalho. — feita
* [x] Como usuário, quero **listar tarefas** com **paginação**, para navegar por grandes volumes eficientemente. — feita
* [ ] Como usuário, quero **filtrar/buscar** por status, prioridade, prazo e título, para encontrar tarefas rapidamente. _(Observação: filtros de status/prioridade/busca existem, mas o filtro de prazo não é processado no serviço de tarefas.)_
* [x] Como usuário, quero **editar** uma tarefa (campos e status), para manter as informações atualizadas. — feita
* [x] Como usuário, quero **excluir** uma tarefa, para remover itens obsoletos. — feita
* [x] Como usuário, quero **atribuir/desatribuir** uma tarefa a **múltiplos usuários**, para distribuir o trabalho. — feita
* [ ] Como participante da tarefa, quero **comentar** e **ver comentários** com paginação, para colaborar no contexto da tarefa. _(Observação: a API ainda não expõe endpoints de comentários; o front-end apenas consulta um endpoint inexistente.)_
* [ ] Como sistema, quero **registrar histórico** (audit log) de alterações de tarefa, para rastrear quem mudou o quê e quando. _(Pendente: não há registro de audit log no serviço de tarefas.)_

# Épico: Integração entre Gateway e Microserviços

* [x] Como Gateway, quero **encaminhar** requisições HTTP para o **tasks-service** via **RPC** (Nest Microservices), para manter o boundary público apenas no Gateway. — feita
* [x] Como tasks-service, quero **validar DTOs** e aplicar **paginação** nas consultas, para garantir entradas corretas e respostas eficientes. — feita

# Épico: Mensageria & Eventos (RabbitMQ)

* [ ] Como tasks-service, quero **publicar** `task.created`, `task.updated` e `task.comment.created` na fila de eventos, para informar outros serviços sobre mudanças. _(Observação: eventos de criação/atualização são emitidos, porém não há publicação para comentários.)_
* [ ] Como notifications-service, quero **consumir** eventos de tarefas e **persistir** notificações, para entregar alertas confiáveis. _(Observação: o serviço apenas encaminha eventos via WebSocket; nenhuma persistência é realizada.)_
* [x] Como notifications-service, quero **ack/retry** mensagens (at-least-once), para reduzir perdas em falhas transitórias. — feita

# Épico: Notificações em Tempo Real (WebSocket)

* [x] Como usuário autenticado, quero me **conectar ao WebSocket** do Gateway, para receber notificações em tempo real. — feita
* [x] Como usuário atribuído a uma tarefa recém-criada, quero receber **`task:created`**, para ser avisado imediatamente. — feita
* [x] Como usuário envolvido numa tarefa, quero receber **`task:updated`** quando o status mudar, para acompanhar o progresso. — feita
* [ ] Como participante/comentado de uma tarefa, quero receber **`comment:new`**, para não perder discussões importantes. _(Observação: o gateway está pronto para propagar o evento, mas ele nunca é disparado porque não existe fluxo de criação de comentários.)_

# Épico: Front-end (React + TanStack Router + shadcn/ui)

* [x] Como visitante, quero **páginas de Login/Register** com validação (`react-hook-form` + `zod`), para entrar no sistema de forma simples e segura. — feita
* [ ] Como usuário, quero uma **lista de tarefas** com **filtro, busca e paginação**, para encontrar e priorizar itens rapidamente. _(Observação: filtros e busca estão implementados, mas não há controles de paginação na UI.)_
* [x] Como usuário, quero uma **página de detalhes da tarefa** com **status, atribuições e comentários**, para trabalhar no contexto certo. — feita
* [x] Como usuário, quero **componentes de UI** (≥5 shadcn) com **skeletons** e **toasts de erro/sucesso**, para uma UX fluida. — feita
* [x] Como usuário, quero **notificações em tempo real** refletidas na UI (badges/toasts), para reagir sem precisar atualizar a página. — feita

# Épico: Observabilidade, Qualidade e Segurança (DoR/DoD do projeto)

* [ ] Como time, quero **health/readiness checks** em todos os serviços, para monitorar disponibilidade. _(Observação: API, auth e tasks possuem healthcheck, mas o serviço de notificações não expõe endpoint semelhante.)_
* [ ] Como gateway, quero **rate limiting (10 req/s)**, **CORS** e **Helmet**, para mitigar abusos e reforçar segurança. _(Observação: CORS e Helmet estão ativos; o rate limiting existe mas com limites padrão (120/min) diferentes do alvo de 10 req/s.)_
* [ ] Como time, quero **testes unitários** (auth, tasks) e **smoke e2e** (login → create task → comment), para garantir qualidade contínua. _(Observação: existem testes unitários para auth, porém faltam testes para tasks e o fluxo e2e.)_
* [ ] Como time, quero **logs estruturados** com correlação (request-id) e máscara de campos sensíveis, para facilitar troubleshooting seguro. _(Pendente: não há estruturação específica de logs ou correlação de requisições.)_

# Épico: Infraestrutura & Entregabilidade (Docker/Turborepo)

* [x] Como desenvolvedor, quero **subir tudo com docker-compose** (Postgres, RabbitMQ, web, gateway, services), para rodar o sistema facilmente. — feita
* [x] Como time, quero um **monorepo Turborepo** com pacotes compartilháveis (`types`, `utils`, `eslint-config`, `tsconfig`), para padronizar e acelerar o desenvolvimento. — feita
* [ ] Como time, quero **Dockerfiles multi-stage** e **compose com perfis dev/prod-lite**, para otimizar a imagem e simular produção local. _(Observação: os Dockerfiles atuais possuem apenas estágio base/dev e não há perfis adicionais no compose.)_

