const erroPadrao = {
  type: "object",
  properties: {
    error: { type: "string", example: "VALIDACAO_ERRO" },
    message: { type: "string", example: "Mensagem legivel do erro." },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string", example: "canalPedido" },
          issue: { type: "string", example: "Campo obrigatorio." }
        }
      }
    },
    timestamp: { type: "string", example: "2026-02-05T12:00:00.000Z" },
    path: { type: "string", example: "/pedidos" }
  }
};

const pedidoRequest = {
  type: "object",
  required: ["unidadeId", "canalPedido", "itens"],
  properties: {
    unidadeId: { type: "integer", example: 1 },
    canalPedido: { type: "string", enum: ["APP", "TOTEM", "BALCAO", "PICKUP", "WEB"], example: "TOTEM" },
    formaPagamento: { type: "string", example: "MOCK" },
    itens: {
      type: "array",
      items: {
        type: "object",
        required: ["produtoId", "quantidade"],
        properties: {
          produtoId: { type: "integer", example: 1 },
          quantidade: { type: "integer", example: 2 }
        }
      }
    }
  }
};

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Raizes do Nordeste API",
    version: "1.0.0",
    description: "MVP Back-end: pedido, pagamento mock, estoque, fidelidade, auditoria e JWT."
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
    },
    schemas: {
      ErroPadrao: erroPadrao,
      PedidoRequest: pedidoRequest
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Verifica se a API esta ativa",
        responses: { 200: { description: "API ativa" } }
      }
    },
    "/auth/cadastro": {
      post: {
        summary: "Cadastra cliente com consentimento LGPD",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                nome: "Cliente Teste",
                email: "cliente.novo@email.com",
                senha: "123456",
                consentimentoLgpd: true
              }
            }
          }
        },
        responses: {
          201: { description: "Cliente criado" },
          409: { description: "E-mail ja cadastrado" },
          422: { description: "Erro de validacao" }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Autentica usuario e retorna JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: { email: "cliente@raizes.com", senha: "123456" }
            }
          }
        },
        responses: {
          200: { description: "Login realizado" },
          401: { description: "Credenciais invalidas" }
        }
      }
    },
    "/usuarios/me": {
      get: {
        summary: "Retorna o usuario logado sem senha",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Perfil" }, 401: { description: "Sem token" } }
      }
    },
    "/unidades": {
      get: {
        summary: "Lista unidades da rede",
        responses: { 200: { description: "Lista de unidades" } }
      }
    },
    "/unidades/{id}/cardapio": {
      get: {
        summary: "Lista cardapio de uma unidade",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Cardapio" } }
      }
    },
    "/produtos": {
      get: {
        summary: "Lista produtos com paginacao",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } }
        ],
        responses: { 200: { description: "Produtos" }, 401: { description: "Sem token" } }
      },
      post: {
        summary: "Cria produto (GERENTE/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              example: { nome: "Bolo de rolo", descricao: "Fatia simples", preco: 8.5 }
            }
          }
        },
        responses: { 201: { description: "Produto criado" }, 403: { description: "Sem permissao" } }
      }
    },
    "/estoque": {
      get: {
        summary: "Consulta estoque por unidade",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "unidadeId", in: "query", schema: { type: "integer", example: 1 } }],
        responses: { 200: { description: "Saldo de estoque" }, 403: { description: "Sem permissao" } }
      }
    },
    "/estoque/movimentos": {
      post: {
        summary: "Movimenta estoque (GERENTE/ADMIN)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              example: { unidadeId: 1, produtoId: 1, tipo: "ENTRADA", quantidade: 5, observacao: "compra" }
            }
          }
        },
        responses: { 201: { description: "Movimento criado" }, 409: { description: "Estoque insuficiente" } }
      }
    },
    "/pedidos": {
      get: {
        summary: "Lista pedidos com filtro por canal e status",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "canalPedido", in: "query", schema: { type: "string", example: "TOTEM" } },
          { name: "status", in: "query", schema: { type: "string", example: "EM_PREPARO" } },
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } }
        ],
        responses: { 200: { description: "Pedidos" }, 401: { description: "Sem token" } }
      },
      post: {
        summary: "Cria pedido validando cardapio, canalPedido e estoque",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PedidoRequest" }, example: { unidadeId: 1, canalPedido: "TOTEM", formaPagamento: "MOCK", itens: [{ produtoId: 1, quantidade: 2 }] } } }
        },
        responses: {
          201: { description: "Pedido criado" },
          401: { description: "Sem token" },
          403: { description: "Perfil sem permissao" },
          404: { description: "Unidade ou produto nao encontrado" },
          409: { description: "Estoque insuficiente" },
          422: { description: "Request invalido" }
        }
      }
    },
    "/pedidos/{id}": {
      get: {
        summary: "Busca pedido por id",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Pedido encontrado" }, 404: { description: "Nao encontrado" } }
      }
    },
    "/pedidos/{id}/status": {
      patch: {
        summary: "Atualiza status do pedido (COZINHA/GERENTE/ADMIN)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { content: { "application/json": { example: { status: "PRONTO" } } } },
        responses: { 200: { description: "Status alterado" }, 403: { description: "Sem permissao" }, 409: { description: "Transicao invalida" } }
      }
    },
    "/pagamentos/mock": {
      post: {
        summary: "Simula pagamento aprovado ou recusado",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              example: { pedidoId: 1, aprovado: true }
            }
          }
        },
        responses: {
          201: { description: "Pagamento registrado" },
          403: { description: "Cliente tentando pagar pedido de outro usuario" },
          409: { description: "Pedido nao esta aguardando pagamento" },
          422: { description: "Dados invalidos" }
        }
      }
    },
    "/fidelidade/saldo": {
      get: {
        summary: "Consulta saldo de pontos do cliente",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Saldo" }, 403: { description: "Somente cliente" } }
      }
    },
    "/fidelidade/resgates": {
      post: {
        summary: "Resgata pontos simples",
        security: [{ bearerAuth: [] }],
        requestBody: { content: { "application/json": { example: { pontos: 1 } } } },
        responses: { 200: { description: "Pontos resgatados" }, 409: { description: "Saldo insuficiente" } }
      }
    },
    "/auditorias": {
      get: {
        summary: "Lista logs de auditoria (GERENTE/ADMIN)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Auditorias" }, 403: { description: "Sem permissao" } }
      }
    }
  }
};

for (const pathItem of Object.values(openapi.paths)) {
  for (const operacao of Object.values(pathItem)) {
    operacao.responses = operacao.responses || {};
    operacao.responses.default = {
      description: "Erro padronizado",
      content: { "application/json": { schema: { $ref: "#/components/schemas/ErroPadrao" } } }
    };
  }
}

module.exports = openapi;

