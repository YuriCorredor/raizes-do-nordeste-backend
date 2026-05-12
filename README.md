# Raizes do Nordeste - Back-end MVP

A API faz o MVP pedido no roteiro: criar pedido, validar estoque, registrar pagamento mock e atualiza statsu do pedido.

## Tecnologias

- Node.js 24 ou superior
- Express
- SQLite pelo `node:sqlite`
- JWT para autenticacao
- bcryptjs para hash de senha
- Swagger/OpenAPI

## Como rodar

1. Instalar as dependencias:

```bash
npm install
```

2. Criar o arquivo `.env`:

```bash
copy .env.example .env
```

3. Criar banco, roda migration e seed:

```bash
npm run reset-db
```

4. Iniciar a API:

```bash
npm start
```

5. Acessar:

- API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

## Usuarios de teste

Todos usam a senha `123456`.

| Perfil | E-mail |
|---| ---|
|ADMIN| `admin@raizes.com` |
| GERENTE | `gerente@raizes.com` |
| COZINHA| `cozinha@raizes.com`  |
| ATENDENTE | `atendente@raizes.com` |
| CLIENTE| `cliente@raizes.com`|

## Fluxo principal

1. Login em `POST /auth/login`.
2. Criar pedido em `POST /pedidos` com `canalPedido`
3. Simular pagamento em `POST /pagamentos/mock`.
4. Atualizar status em `PATCH /pedidos/{id}/status`
5. Consultar pedidos filtrando por canal: `GET /pedidos?canalPedido=TOTEM`

Exemplo de pedido:

```json
{
  "unidadeId": 1,
  "canalPedido": "TOTEM",
  "formaPagamento": "MOCK",
  "itens": [
    { "produtoId": 1, "quantidade": 2 }
  ]
}
```

## Testes pelo Postman

A colecao esta em:

`postman/Raizes.postman_collection.json`

Ordem sugerida:

1. Rodar `npm run reset-db`
2. Rodar `npm start`
3. Importar a colecao no Postman.
4. Rodar a colecao inteira ou executar as pastas na ordem: Auth, Catalogo, Pedidos, Pagamentos, Erros, Auditoria

A colecao salva automaticamente os tokens e os ids de pedidos criado.

## Estrutura

```text
src/
  api/              rotas, controllers, middlewares e swagger
  aplicacao/        regras e casos de uso
  dominio/          constantes do dominio
  infraestrutura/   banco sqlite e migrations
scripts/            reset, seed e migrations
docs/               relatorio e diagramas
postman/            colecao de testes
```

## Seguranca e LGPD

- Senhas ficam com hash bcrypt.
- Login retorna JWT
- Endpoints sensiveis usam perfis/roles
- Dados pessoais retornam sem senha
- Consentimento LGPD fica no cadastro do usuario.
- Acoes sensiveis geram auditoria: login, pedido, pagamento, estoque, status e fidelidade
