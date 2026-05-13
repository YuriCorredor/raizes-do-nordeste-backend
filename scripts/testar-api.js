const baseUrl = process.env.API_URL || "http://localhost:3000";

async function chamarApi(metodo, rota, body, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";

  const resposta = await fetch(`${baseUrl}${rota}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const texto = await resposta.text();
  let json = null;

  if (texto) {
    try {
      json = JSON.parse(texto);
    } catch {
      json = texto;
    }
  }

  return { status: resposta.status, body: json };
}

function resultado(teste, esperado, obtido) {
  return { teste, esperado, obtido, passou: esperado === obtido };
}

async function rodar() {
  const resultados = [];

  const health = await chamarApi("GET", "/health");
  resultados.push(resultado("Health da API", 200, health.status));

  const cliente = await chamarApi("POST", "/auth/login", { email: "cliente@raizes.com", senha: "123456" });
  const clienteToken = cliente.body?.accessToken;
  resultados.push(resultado("Login cliente", 200, cliente.status));

  const admin = await chamarApi("POST", "/auth/login", { email: "admin@raizes.com", senha: "123456" });
  const adminToken = admin.body?.accessToken;
  resultados.push(resultado("Login admin", 200, admin.status));

  const cozinha = await chamarApi("POST", "/auth/login", { email: "cozinha@raizes.com", senha: "123456" });
  const cozinhaToken = cozinha.body?.accessToken;
  resultados.push(resultado("Login cozinha", 200, cozinha.status));

  // Reforca o estoque para o teste poder ser repetido.
  const reforco1 = await chamarApi("POST", "/estoque/movimentos", {
    unidadeId: 1,
    produtoId: 1,
    tipo: "ENTRADA",
    quantidade: 20,
    observacao: "reforco para teste automatico"
  }, adminToken);
  resultados.push(resultado("Reforcar estoque", 201, reforco1.status));

  const reforco2 = await chamarApi("POST", "/estoque/movimentos", {
    unidadeId: 1,
    produtoId: 3,
    tipo: "ENTRADA",
    quantidade: 20,
    observacao: "reforco para teste automatico"
  }, adminToken);
  resultados.push(resultado("Reforcar estoque 2", 201, reforco2.status));

  const cardapio = await chamarApi("GET", "/unidades/1/cardapio");
  resultados.push(resultado("Consultar cardapio", 200, cardapio.status));

  const perfil = await chamarApi("GET", "/usuarios/me", null, clienteToken);
  resultados.push(resultado("Perfil logado", 200, perfil.status));

  const pedido = await chamarApi("POST", "/pedidos", {
    unidadeId: 1,
    canalPedido: "TOTEM",
    formaPagamento: "MOCK",
    itens: [{ produtoId: 1, quantidade: 1 }]
  }, clienteToken);
  resultados.push(resultado("Criar pedido valido", 201, pedido.status));

  const pagamento = await chamarApi("POST", "/pagamentos/mock", {
    pedidoId: pedido.body?.id,
    aprovado: true
  }, clienteToken);
  resultados.push(resultado("Pagamento aprovado", 201, pagamento.status));

  const status = await chamarApi("PATCH", `/pedidos/${pedido.body?.id}/status`, {
    status: "PRONTO"
  }, cozinhaToken);
  resultados.push(resultado("Atualizar status PRONTO", 200, status.status));

  const filtro = await chamarApi("GET", "/pedidos?canalPedido=TOTEM", null, clienteToken);
  resultados.push(resultado("Listar por canalPedido", 200, filtro.status));

  const saldo = await chamarApi("GET", "/fidelidade/saldo", null, clienteToken);
  resultados.push(resultado("Saldo fidelidade", 200, saldo.status));

  const pedidoRecusa = await chamarApi("POST", "/pedidos", {
    unidadeId: 1,
    canalPedido: "APP",
    formaPagamento: "MOCK",
    itens: [{ produtoId: 3, quantidade: 1 }]
  }, clienteToken);
  resultados.push(resultado("Criar pedido para recusa", 201, pedidoRecusa.status));

  const recusado = await chamarApi("POST", "/pagamentos/mock", {
    pedidoId: pedidoRecusa.body?.id,
    aprovado: false
  }, clienteToken);
  resultados.push(resultado("Pagamento recusado", 201, recusado.status));

  const semToken = await chamarApi("GET", "/pedidos");
  resultados.push(resultado("Erro sem token", 401, semToken.status));

  const semPermissao = await chamarApi("POST", "/produtos", { nome: "Produto teste", preco: 9.99 }, clienteToken);
  resultados.push(resultado("Erro perfil sem permissao", 403, semPermissao.status));

  const semCanal = await chamarApi("POST", "/pedidos", {
    unidadeId: 1,
    formaPagamento: "MOCK",
    itens: [{ produtoId: 1, quantidade: 1 }]
  }, clienteToken);
  resultados.push(resultado("Erro sem canalPedido", 422, semCanal.status));

  const semEstoque = await chamarApi("POST", "/pedidos", {
    unidadeId: 1,
    canalPedido: "WEB",
    formaPagamento: "MOCK",
    itens: [{ produtoId: 1, quantidade: 9999 }]
  }, clienteToken);
  resultados.push(resultado("Erro estoque insuficiente", 409, semEstoque.status));

  const produtoNaoExiste = await chamarApi("POST", "/pedidos", {
    unidadeId: 1,
    canalPedido: "BALCAO",
    formaPagamento: "MOCK",
    itens: [{ produtoId: 999, quantidade: 1 }]
  }, clienteToken);
  resultados.push(resultado("Erro produto inexistente", 404, produtoNaoExiste.status));

  const auditoria = await chamarApi("GET", "/auditorias", null, adminToken);
  resultados.push(resultado("Auditoria admin", 200, auditoria.status));

  const openapi = await chamarApi("GET", "/openapi.json");
  resultados.push(resultado("OpenAPI JSON", 200, openapi.status));

  console.table(resultados);

  const falhas = resultados.filter((item) => !item.passou);
  if (falhas.length) {
    console.error("Alguns testes falharam.");
    process.exit(1);
  }

  console.log("Todos os testes passaram.");
}

rodar().catch((erro) => {
  console.error("Falha ao rodar testes. Veja se a API esta aberta com npm start.");
  console.error(erro.message);
  process.exit(1);
});

