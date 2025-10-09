# API Gateway

Este serviço expõe o gateway HTTP da plataforma. Todas as rotas REST protegidas exigem um access token JWT emitido pelo Auth Service.

## Documentação Swagger
- URL padrão local: `http://localhost:3000/api/docs`
- Clique em **Authorize** e informe `Bearer <accessToken>` para testar chamadas autenticadas diretamente no Swagger.

## Obtendo um access token JWT
1. Garanta que os serviços estejam rodando (por exemplo, com `pnpm dev` ou `docker compose up`).
2. Registre-se ou faça login pelos endpoints do gateway:
   - `POST /auth/register`
   - `POST /auth/login`
3. O corpo esperado segue o formato:

```json
{
  "email": "usuario@example.com",
  "password": "senha-segura",
  "username": "usuario" // apenas no registro
}
```

Os endpoints retornam `accessToken` e, via cookie HTTP-only, um `refreshToken`.

### Variáveis de ambiente relacionadas
- `JWT_SECRET` / `JWT_ACCESS_SECRET`: chave usada para assinar o token (deve ser a mesma do Auth Service).
- `JWT_EXPIRES_IN` / `JWT_ACCESS_EXPIRES`: tempo de expiração do access token (ex.: `15m`).

## Enviando o token nas requisições
Inclua o header `Authorization` com o esquema Bearer:

```http
Authorization: Bearer <accessToken>
```

Exemplo usando `curl`:

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     http://localhost:3000/tasks
```

Para renovar o token, utilize `POST /auth/refresh`. O gateway lerá o `refreshToken` do cookie e responderá com um novo `accessToken` pronto para ser enviado no header acima.

## Comentários de tarefas

O gateway expõe endpoints autenticados para criação e listagem paginada de comentários vinculados a uma tarefa.

### Listar comentários com paginação

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "http://localhost:3000/tasks/<TASK_ID>/comments?page=2&limit=5"
```

Resposta (resumida):

```json
{
  "data": [
    {
      "id": "f4f3...",
      "taskId": "<TASK_ID>",
      "authorId": "<USER_ID>",
      "message": "Comentário mais recente",
      "createdAt": "2024-06-01T12:34:56.000Z",
      "updatedAt": "2024-06-01T12:34:56.000Z"
    }
  ],
  "meta": {
    "page": 2,
    "size": 5,
    "total": 17,
    "totalPages": 4
  }
}
```

Os parâmetros `page` e `limit` são opcionais (padrões: `1` e `10`). A ordenação é decrescente por data de criação.

### Criar um novo comentário

```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Comentário inicial da tarefa"}' \
  http://localhost:3000/tasks/<TASK_ID>/comments
```

O corpo deve conter somente o campo `message` (máximo de 500 caracteres). O gateway atribui o autor com base no usuário autenticado e, ao salvar, o serviço publica `tasks.comment.created`, que o próprio gateway retransmite para os clientes WebSocket como `comment:new`.

## Histórico (audit log) de tarefas

Logs de criação, atualização e exclusão ficam disponíveis via `GET /tasks/:id/audit-log`. O endpoint exige `Authorization: Bearer <accessToken>` e aceita os parâmetros opcionais `page` e `limit`.

```bash
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "http://localhost:3000/tasks/<TASK_ID>/audit-log?page=1&limit=20"
```

Resposta simplificada:

```json
{
  "data": [
    {
      "id": "log-123",
      "taskId": "<TASK_ID>",
      "action": "task.updated",
      "actor": {
        "id": "user-1",
        "displayName": "Player One"
      },
      "changes": [
        {
          "field": "status",
          "previousValue": "todo",
          "currentValue": "in_progress"
        }
      ],
      "createdAt": "2024-06-02T12:34:56.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "size": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

O volume de registros cresce conforme as tarefas são alteradas; ajuste `limit` para controlar a quantidade retornada por página e monitore o tamanho da tabela `task_audit_logs` nas operações de produção.
