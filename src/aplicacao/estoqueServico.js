const { pegarBanco } = require("../infraestrutura/banco");
const { TIPOS_ESTOQUE } = require("../dominio/constantes");
const { erroValidacao, erroNaoEncontrado, erroConflito } = require("../api/middlewares/erro");
const { registrarAuditoria } = require("./auditoriaServico");

function consultarEstoque(unidadeId) {
  const db = pegarBanco();
  const params = [];
  let filtro = "";

  if (unidadeId) {
    filtro = "WHERE e.unidade_id = ?";
    params.push(Number(unidadeId));
  }

  return db.prepare(`
    SELECT e.unidade_id AS unidadeId, u.nome AS unidadeNome,
           e.produto_id AS produtoId, p.nome AS produtoNome, e.quantidade
    FROM estoques e
    JOIN unidades u ON u.id = e.unidade_id
    JOIN produtos p ON p.id = e.produto_id
    ${filtro}
    ORDER BY u.id, p.nome
  `).all(...params);
}

function movimentarEstoque(usuario, dados) {
  const detalhes = [];
  if (!Number.isInteger(dados.unidadeId)) detalhes.push({ field: "unidadeId", issue: "Unidade deve ser inteiro." });
  if (!Number.isInteger(dados.produtoId)) detalhes.push({ field: "produtoId", issue: "Produto deve ser inteiro." });
  if (!TIPOS_ESTOQUE.includes(dados.tipo)) detalhes.push({ field: "tipo", issue: "Use ENTRADA ou SAIDA." });
  if (!Number.isInteger(dados.quantidade) || dados.quantidade <= 0) detalhes.push({ field: "quantidade", issue: "Quantidade deve ser maior que zero." });

  if (detalhes.length) {
    throw erroValidacao("Dados invalidos para movimentar estoque.", detalhes);
  }

  const db = pegarBanco();
  const estoque = db.prepare(`
    SELECT quantidade FROM estoques WHERE unidade_id = ? AND produto_id = ?
  `).get(dados.unidadeId, dados.produtoId);

  if (!estoque) {
    throw erroNaoEncontrado("Estoque nao encontrado para unidade/produto.");
  }

  if (dados.tipo === "SAIDA" && estoque.quantidade < dados.quantidade) {
    throw erroConflito("ESTOQUE_INSUFICIENTE", "Saida maior que o estoque atual.", [
      { field: "quantidade", issue: `Disponivel: ${estoque.quantidade}` }
    ]);
  }

  const novaQuantidade = dados.tipo === "ENTRADA"
    ? estoque.quantidade + dados.quantidade
    : estoque.quantidade - dados.quantidade;

  db.prepare(`
    UPDATE estoques SET quantidade = ?
    WHERE unidade_id = ? AND produto_id = ?
  `).run(novaQuantidade, dados.unidadeId, dados.produtoId);

  db.prepare(`
    INSERT INTO movimentacoes_estoque (unidade_id, produto_id, tipo, quantidade, usuario_id, observacao)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(dados.unidadeId, dados.produtoId, dados.tipo, dados.quantidade, usuario.id, dados.observacao || "");

  registrarAuditoria(usuario.id, "MOVIMENTAR_ESTOQUE", "estoques", null, dados);

  return {
    unidadeId: dados.unidadeId,
    produtoId: dados.produtoId,
    tipo: dados.tipo,
    quantidade: dados.quantidade,
    saldoAtual: novaQuantidade
  };
}

module.exports = {
  consultarEstoque,
  movimentarEstoque
};

