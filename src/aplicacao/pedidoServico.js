const { pegarBanco } = require("../infraestrutura/banco");
const { CANAIS_PEDIDO, STATUS_PEDIDO } = require("../dominio/constantes");
const { erroValidacao, erroNaoEncontrado, erroConflito, ErroApi } = require("../api/middlewares/erro");
const { registrarAuditoria } = require("./auditoriaServico");

function centavosParaReais(valor) {
  return Number((valor / 100).toFixed(2));
}

function validarPedido(dados) {
  const detalhes = [];

  if (!Number.isInteger(dados.unidadeId)) {
    detalhes.push({ field: "unidadeId", issue: "Unidade deve ser informada." });
  }

  if (!CANAIS_PEDIDO.includes(dados.canalPedido)) {
    detalhes.push({ field: "canalPedido", issue: "Canal invalido. Use APP, TOTEM, BALCAO, PICKUP ou WEB." });
  }

  if (!Array.isArray(dados.itens) || dados.itens.length === 0) {
    detalhes.push({ field: "itens", issue: "Pedido precisa ter ao menos um item." });
  } else {
    dados.itens.forEach((item, indice) => {
      if (!Number.isInteger(item.produtoId)) {
        detalhes.push({ field: `itens[${indice}].produtoId`, issue: "Produto deve ser inteiro." });
      }
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        detalhes.push({ field: `itens[${indice}].quantidade`, issue: "Quantidade deve ser maior que zero." });
      }
    });
  }

  if (detalhes.length) {
    throw erroValidacao("Dados invalidos para criar pedido.", detalhes);
  }
}

function buscarUnidade(db, unidadeId) {
  const unidade = db.prepare("SELECT id FROM unidades WHERE id = ? AND ativa = 1").get(unidadeId);
  if (!unidade) {
    throw erroNaoEncontrado("Unidade nao encontrada ou inativa.", [{ field: "unidadeId", issue: "Nao existe unidade ativa com este id." }]);
  }
}

function buscarProdutoNoCardapio(db, unidadeId, produtoId) {
  const produto = db.prepare(`
    SELECT p.id, p.nome, p.preco_centavos AS precoCentavos
    FROM produtos p
    JOIN cardapios c ON c.produto_id = p.id
    WHERE p.id = ? AND c.unidade_id = ? AND p.ativo = 1 AND c.disponivel = 1
  `).get(produtoId, unidadeId);

  if (!produto) {
    throw erroNaoEncontrado("Produto nao encontrado no cardapio desta unidade.", [
      { field: "produtoId", issue: `Produto ${produtoId} nao disponivel.` }
    ]);
  }

  return produto;
}

function validarEstoque(db, unidadeId, produtoId, quantidade, indice) {
  const estoque = db.prepare(`
    SELECT quantidade FROM estoques
    WHERE unidade_id = ? AND produto_id = ?
  `).get(unidadeId, produtoId);

  const disponivel = estoque ? estoque.quantidade : 0;
  if (disponivel < quantidade) {
    throw erroConflito("ESTOQUE_INSUFICIENTE", "Nao ha quantidade suficiente para um ou mais itens.", [
      { field: `itens[${indice}].quantidade`, issue: `Disponivel: ${disponivel}` }
    ]);
  }
}

function montarPedido(db, pedidoId) {
  const pedido = db.prepare(`
    SELECT p.id, p.usuario_id AS clienteId, p.unidade_id AS unidadeId, p.canal_pedido AS canalPedido,
           p.forma_pagamento AS formaPagamento, p.status, p.total_centavos AS totalCentavos,
           p.criado_em AS criadoEm, p.atualizado_em AS atualizadoEm,
           u.nome AS clienteNome
    FROM pedidos p
    JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.id = ?
  `).get(pedidoId);

  if (!pedido) {
    throw erroNaoEncontrado("Pedido nao encontrado.");
  }

  const itens = db.prepare(`
    SELECT pi.produto_id AS produtoId, pr.nome AS produtoNome, pi.quantidade,
           pi.preco_unitario_centavos AS precoUnitarioCentavos
    FROM pedido_itens pi
    JOIN produtos pr ON pr.id = pi.produto_id
    WHERE pi.pedido_id = ?
  `).all(pedidoId).map((item) => ({
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    quantidade: item.quantidade,
    precoUnitario: centavosParaReais(item.precoUnitarioCentavos),
    subtotal: centavosParaReais(item.precoUnitarioCentavos * item.quantidade)
  }));

  return {
    id: pedido.id,
    clienteId: pedido.clienteId,
    clienteNome: pedido.clienteNome,
    unidadeId: pedido.unidadeId,
    canalPedido: pedido.canalPedido,
    formaPagamento: pedido.formaPagamento,
    status: pedido.status,
    total: centavosParaReais(pedido.totalCentavos),
    itens,
    criadoEm: pedido.criadoEm,
    atualizadoEm: pedido.atualizadoEm
  };
}

function criarPedido(usuario, dados) {
  validarPedido(dados);
  const db = pegarBanco();
  buscarUnidade(db, dados.unidadeId);

  const itensTratados = dados.itens.map((item, indice) => {
    const produto = buscarProdutoNoCardapio(db, dados.unidadeId, item.produtoId);
    validarEstoque(db, dados.unidadeId, item.produtoId, item.quantidade, indice);
    return { ...item, produto };
  });

  const totalCentavos = itensTratados.reduce((total, item) => {
    return total + item.quantidade * item.produto.precoCentavos;
  }, 0);

  let pedidoId;

  db.exec("BEGIN");
  try {
    const resultado = db.prepare(`
      INSERT INTO pedidos (usuario_id, unidade_id, canal_pedido, forma_pagamento, status, total_centavos)
      VALUES (?, ?, ?, ?, 'AGUARDANDO_PAGAMENTO', ?)
    `).run(usuario.id, dados.unidadeId, dados.canalPedido, dados.formaPagamento || "MOCK", totalCentavos);

    pedidoId = resultado.lastInsertRowid;

    itensTratados.forEach((item) => {
      db.prepare(`
        INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario_centavos)
        VALUES (?, ?, ?, ?)
      `).run(pedidoId, item.produtoId, item.quantidade, item.produto.precoCentavos);

      db.prepare(`
        UPDATE estoques SET quantidade = quantidade - ?
        WHERE unidade_id = ? AND produto_id = ?
      `).run(item.quantidade, dados.unidadeId, item.produtoId);

      db.prepare(`
        INSERT INTO movimentacoes_estoque (unidade_id, produto_id, tipo, quantidade, usuario_id, observacao)
        VALUES (?, ?, 'SAIDA', ?, ?, ?)
      `).run(dados.unidadeId, item.produtoId, item.quantidade, usuario.id, `Reserva do pedido ${pedidoId}`);
    });

    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }

  registrarAuditoria(usuario.id, "CRIAR_PEDIDO", "pedidos", pedidoId, {
    canalPedido: dados.canalPedido,
    totalCentavos
  });

  return montarPedido(db, pedidoId);
}

function listarPedidos(filtros, usuario) {
  const db = pegarBanco();
  const page = Math.max(Number(filtros.page || 1), 1);
  const limit = Math.min(Math.max(Number(filtros.limit || 10), 1), 50);
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (usuario.perfil === "CLIENTE") {
    where.push("p.usuario_id = ?");
    params.push(usuario.id);
  }

  if (filtros.canalPedido) {
    if (!CANAIS_PEDIDO.includes(filtros.canalPedido)) {
      throw erroValidacao("Canal do pedido invalido.", [{ field: "canalPedido", issue: "Valor nao permitido." }]);
    }
    where.push("p.canal_pedido = ?");
    params.push(filtros.canalPedido);
  }

  if (filtros.status) {
    if (!STATUS_PEDIDO.includes(filtros.status)) {
      throw erroValidacao("Status do pedido invalido.", [{ field: "status", issue: "Valor nao permitido." }]);
    }
    where.push("p.status = ?");
    params.push(filtros.status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = db.prepare(`SELECT COUNT(*) AS total FROM pedidos p ${whereSql}`).get(...params).total;
  const linhas = db.prepare(`
    SELECT p.id
    FROM pedidos p
    ${whereSql}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    page,
    limit,
    total,
    dados: linhas.map((linha) => montarPedido(db, linha.id))
  };
}

function buscarPedido(pedidoId, usuario) {
  const db = pegarBanco();
  const pedido = montarPedido(db, Number(pedidoId));

  if (usuario.perfil === "CLIENTE" && pedido.clienteId !== usuario.id) {
    throw new ErroApi(403, "SEM_PERMISSAO", "Cliente so pode ver os proprios pedidos.");
  }

  return pedido;
}

function atualizarStatus(pedidoId, novoStatus, usuario) {
  if (!STATUS_PEDIDO.includes(novoStatus)) {
    throw erroValidacao("Status do pedido invalido.", [{ field: "status", issue: "Valor nao permitido." }]);
  }

  const db = pegarBanco();
  const pedido = montarPedido(db, Number(pedidoId));
  const permitidos = {
    AGUARDANDO_PAGAMENTO: ["CANCELADO"],
    EM_PREPARO: ["PRONTO", "CANCELADO"],
    PRONTO: ["ENTREGUE"],
    ENTREGUE: [],
    CANCELADO: [],
    PAGAMENTO_RECUSADO: []
  };

  if (!permitidos[pedido.status].includes(novoStatus)) {
    throw erroConflito("STATUS_INVALIDO", "Mudanca de status nao permitida para o estado atual.", [
      { field: "status", issue: `${pedido.status} -> ${novoStatus}` }
    ]);
  }

  db.prepare(`
    UPDATE pedidos
    SET status = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(novoStatus, pedido.id);

  registrarAuditoria(usuario.id, "ATUALIZAR_STATUS_PEDIDO", "pedidos", pedido.id, {
    statusAnterior: pedido.status,
    statusNovo: novoStatus
  });

  return montarPedido(db, pedido.id);
}

module.exports = {
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarStatus,
  montarPedido,
  centavosParaReais
};

