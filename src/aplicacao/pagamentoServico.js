const { pegarBanco } = require("../infraestrutura/banco");
const { erroValidacao, erroConflito, ErroApi } = require("../api/middlewares/erro");
const { registrarAuditoria } = require("./auditoriaServico");
const { montarPedido, centavosParaReais } = require("./pedidoServico");

function devolverEstoqueDoPedido(db, pedido, usuarioId) {
  pedido.itens.forEach((item) => {
    db.prepare(`
      UPDATE estoques SET quantidade = quantidade + ?
      WHERE unidade_id = ? AND produto_id = ?
    `).run(item.quantidade, pedido.unidadeId, item.produtoId);

    db.prepare(`
      INSERT INTO movimentacoes_estoque (unidade_id, produto_id, tipo, quantidade, usuario_id, observacao)
      VALUES (?, ?, 'ENTRADA', ?, ?, ?)
    `).run(pedido.unidadeId, item.produtoId, item.quantidade, usuarioId, `Pagamento recusado pedido ${pedido.id}`);
  });
}

function simularPagamento(usuario, dados) {
  if (!Number.isInteger(dados.pedidoId)) {
    throw erroValidacao("Pedido deve ser informado.", [{ field: "pedidoId", issue: "Informe um numero inteiro." }]);
  }

  if (typeof dados.aprovado !== "boolean") {
    throw erroValidacao("Resultado do pagamento deve ser informado.", [{ field: "aprovado", issue: "Use true ou false." }]);
  }

  const db = pegarBanco();
  const pedido = montarPedido(db, dados.pedidoId);

  if (usuario.perfil === "CLIENTE" && pedido.clienteId !== usuario.id) {
    throw new ErroApi(403, "SEM_PERMISSAO", "Cliente so pode pagar o proprio pedido.");
  }

  if (pedido.status !== "AGUARDANDO_PAGAMENTO") {
    throw erroConflito("PEDIDO_NAO_PODE_PAGAR", "Pedido nao esta aguardando pagamento.", [
      { field: "status", issue: pedido.status }
    ]);
  }

  const statusPagamento = dados.aprovado ? "APROVADO" : "RECUSADO";
  const proximoStatusPedido = dados.aprovado ? "EM_PREPARO" : "PAGAMENTO_RECUSADO";
  const payloadEnvio = {
    pedidoId: pedido.id,
    valor: pedido.total,
    formaPagamento: pedido.formaPagamento,
    provedor: "MOCK"
  };
  const payloadRetorno = {
    status: statusPagamento,
    codigoAutorizacao: dados.aprovado ? `MOCK-${Date.now()}` : null,
    mensagem: dados.aprovado ? "Pagamento aprovado no mock." : "Pagamento recusado no mock."
  };

  let pagamentoId;

  db.exec("BEGIN");
  try {
    const pagamento = db.prepare(`
      INSERT INTO pagamentos (pedido_id, provedor, status, valor_centavos, payload_envio, payload_retorno)
      VALUES (?, 'MOCK', ?, ?, ?, ?)
    `).run(
      pedido.id,
      statusPagamento,
      Math.round(pedido.total * 100),
      JSON.stringify(payloadEnvio),
      JSON.stringify(payloadRetorno)
    );

    pagamentoId = pagamento.lastInsertRowid;

    db.prepare(`
      UPDATE pedidos
      SET status = ?, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(proximoStatusPedido, pedido.id);

    if (dados.aprovado) {
      const pontos = Math.floor(pedido.total / 10);
      db.prepare("UPDATE usuarios SET pontos = pontos + ? WHERE id = ? AND consentimento_lgpd = 1")
        .run(pontos, pedido.clienteId);
    } else {
      devolverEstoqueDoPedido(db, pedido, usuario.id);
    }

    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }

  registrarAuditoria(usuario.id, "PAGAMENTO_MOCK", "pagamentos", pagamentoId, {
    pedidoId: pedido.id,
    status: statusPagamento
  });

  return {
    id: pagamentoId,
    pedidoId: pedido.id,
    status: statusPagamento,
    pedidoStatus: proximoStatusPedido,
    valor: centavosParaReais(Math.round(pedido.total * 100)),
    payloadEnvio,
    payloadRetorno
  };
}

module.exports = {
  simularPagamento
};

