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
