# Épico: Autenticação & Gateway

* [ ] Como visitante, quero me **registrar** com email, username e senha, para poder acessar o sistema. 
* [ ] Como usuário, quero **fazer login** e receber `accessToken` (15 min) e `refreshToken` (7 dias), para manter minha sessão ativa com segurança. 
* [ ] Como usuário, quero **atualizar meu accessToken** via endpoint de **refresh**, para continuar autenticado sem refazer login. 
* [ ] Como sistema, quero **hashear senhas** com bcrypt/argon2, para armazenar credenciais com segurança. 
* [ ] Como API Gateway, quero **proteger rotas** com JWT Guards e expor **Swagger**, para padronizar e documentar o acesso HTTP. 

# Épico: Tarefas (CRUD, Atribuições, Comentários, Histórico)

* [ ] Como usuário autenticado, quero **criar tarefas** com título, descrição, prazo, prioridade e status, para organizar meu trabalho. 
* [ ] Como usuário, quero **listar tarefas** com **paginação**, para navegar por grandes volumes eficientemente. 
* [ ] Como usuário, quero **filtrar/buscar** por status, prioridade, prazo e título, para encontrar tarefas rapidamente. 
* [ ] Como usuário, quero **editar** uma tarefa (campos e status), para manter as informações atualizadas. 
* [ ] Como usuário, quero **excluir** uma tarefa, para remover itens obsoletos. 
* [ ] Como usuário, quero **atribuir/desatribuir** uma tarefa a **múltiplos usuários**, para distribuir o trabalho. 
* [ ] Como participante da tarefa, quero **comentar** e **ver comentários** com paginação, para colaborar no contexto da tarefa. 
* [ ] Como sistema, quero **registrar histórico** (audit log) de alterações de tarefa, para rastrear quem mudou o quê e quando. 

# Épico: Integração entre Gateway e Microserviços

* [ ] Como Gateway, quero **encaminhar** requisições HTTP para o **tasks-service** via **RPC** (Nest Microservices), para manter o boundary público apenas no Gateway. 
* [ ] Como tasks-service, quero **validar DTOs** e aplicar **paginação** nas consultas, para garantir entradas corretas e respostas eficientes. 

# Épico: Mensageria & Eventos (RabbitMQ)

* [ ] Como tasks-service, quero **publicar** `task.created`, `task.updated` e `task.comment.created` na fila de eventos, para informar outros serviços sobre mudanças. 
* [ ] Como notifications-service, quero **consumir** eventos de tarefas e **persistir** notificações, para entregar alertas confiáveis. 
* [ ] Como notifications-service, quero **ack/retry** mensagens (at-least-once), para reduzir perdas em falhas transitórias. 

# Épico: Notificações em Tempo Real (WebSocket)

* [ ] Como usuário autenticado, quero me **conectar ao WebSocket** do Gateway, para receber notificações em tempo real. 
* [ ] Como usuário atribuído a uma tarefa recém-criada, quero receber **`task:created`**, para ser avisado imediatamente. 
* [ ] Como usuário envolvido numa tarefa, quero receber **`task:updated`** quando o status mudar, para acompanhar o progresso. 
* [ ] Como participante/comentado de uma tarefa, quero receber **`comment:new`**, para não perder discussões importantes. 

# Épico: Front-end (React + TanStack Router + shadcn/ui)

* [ ] Como visitante, quero **páginas de Login/Register** com validação (`react-hook-form` + `zod`), para entrar no sistema de forma simples e segura. 
* [ ] Como usuário, quero uma **lista de tarefas** com **filtro, busca e paginação**, para encontrar e priorizar itens rapidamente. 
* [ ] Como usuário, quero uma **página de detalhes da tarefa** com **status, atribuições e comentários**, para trabalhar no contexto certo. 
* [ ] Como usuário, quero **componentes de UI** (≥5 shadcn) com **skeletons** e **toasts de erro/sucesso**, para uma UX fluida. 
* [ ] Como usuário, quero **notificações em tempo real** refletidas na UI (badges/toasts), para reagir sem precisar atualizar a página. 

# Épico: Observabilidade, Qualidade e Segurança (DoR/DoD do projeto)

* [ ] Como time, quero **health/readiness checks** em todos os serviços, para monitorar disponibilidade. 
* [ ] Como gateway, quero **rate limiting (10 req/s)**, **CORS** e **Helmet**, para mitigar abusos e reforçar segurança. 
* [ ] Como time, quero **testes unitários** (auth, tasks) e **smoke e2e** (login → create task → comment), para garantir qualidade contínua. 
* [ ] Como time, quero **logs estruturados** com correlação (request-id) e máscara de campos sensíveis, para facilitar troubleshooting seguro. 

# Épico: Infraestrutura & Entregabilidade (Docker/Turborepo)

* [ ] Como desenvolvedor, quero **subir tudo com docker-compose** (Postgres, RabbitMQ, web, gateway, services), para rodar o sistema facilmente. 
* [ ] Como time, quero um **monorepo Turborepo** com pacotes compartilháveis (`types`, `utils`, `eslint-config`, `tsconfig`), para padronizar e acelerar o desenvolvimento. 
* [ ] Como time, quero **Dockerfiles multi-stage** e **compose com perfis dev/prod-lite**, para otimizar a imagem e simular produção local. 

